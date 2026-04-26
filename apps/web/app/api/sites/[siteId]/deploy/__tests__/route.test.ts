// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { POST } from "../route";

const VALID_CONFIG = {
  meta: { siteName: "Aurora", siteSlug: "aurora" },
  brand: { palette: "ocean", fontFamily: "Inter" },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "" },
  },
  pages: [
    {
      id: "p_home",
      slug: "home",
      name: "Home",
      kind: "static",
      rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
  forms: [],
};

// Two static pages sharing slug "home" trips the §11 superRefine in
// `siteConfigSchema`. The deploy gate should reject this with kind:
// "invalid_output".
const INVALID_CONFIG = {
  ...VALID_CONFIG,
  pages: [
    {
      id: "p_home_a",
      slug: "home",
      name: "Home A",
      kind: "static",
      rootComponent: { id: "cmp_a", type: "Section", props: {}, style: {}, children: [] },
    },
    {
      id: "p_home_b",
      slug: "home",
      name: "Home B",
      kind: "static",
      rootComponent: { id: "cmp_b", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
};

function makeRequest(): Request {
  return new Request("http://localhost/api/sites/site-1/deploy", { method: "POST" });
}

function ctx(siteId: string) {
  return { params: Promise.resolve({ siteId }) };
}

type SupabaseResult = { data: unknown; error: unknown };

// .from("sites").select(...).eq(...).maybeSingle()
function siteSelectChain(result: SupabaseResult) {
  const maybeSingle = vi.fn(async () => result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
}

// .from("site_versions").select(...).eq(...).eq(...).maybeSingle()
function versionSelectChain(result: SupabaseResult) {
  const maybeSingle = vi.fn(async () => result);
  const eqInner = vi.fn(() => ({ maybeSingle }));
  const eqOuter = vi.fn(() => ({ eq: eqInner }));
  const select = vi.fn(() => ({ eq: eqOuter }));
  return { select, eqOuter, eqInner, maybeSingle };
}

// .from("site_versions").update(...).eq(...).eq(...)  -- terminal awaitable
function flipUpdateChain(result: { error: unknown }) {
  const eqInner = vi.fn().mockResolvedValue(result);
  const eqOuter = vi.fn(() => ({ eq: eqInner }));
  const update = vi.fn(() => ({ eq: eqOuter }));
  return { update, eqOuter, eqInner };
}

// .from("site_versions").insert(...).select(...).single()
function insertChain(result: SupabaseResult) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn((_row: Record<string, unknown>) => ({ select }));
  return { insert, select, single };
}

describe("POST /api/sites/[siteId]/deploy", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with versionId and deployedUrl on the happy path", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({
      data: { id: "v_working", config: VALID_CONFIG },
      error: null,
    });
    const flip = flipUpdateChain({ error: null });
    const insert = insertChain({ data: { id: "v_deployed" }, error: null });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select })
      .mockReturnValueOnce({ update: flip.update })
      .mockReturnValueOnce({ insert: insert.insert });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      versionId: "v_deployed",
      deployedUrl: "https://www.aurora.com",
    });

    // Orchestration order: sites, site_versions (working load), site_versions
    // (flip), site_versions (insert).
    expect(fromMock).toHaveBeenNthCalledWith(1, "sites");
    expect(fromMock).toHaveBeenNthCalledWith(2, "site_versions");
    expect(fromMock).toHaveBeenNthCalledWith(3, "site_versions");
    expect(fromMock).toHaveBeenNthCalledWith(4, "site_versions");
    expect(site.eq).toHaveBeenCalledWith("id", "site-1");
    expect(working.eqOuter).toHaveBeenCalledWith("site_id", "site-1");
    expect(working.eqInner).toHaveBeenCalledWith("is_working", true);
    expect(flip.update).toHaveBeenCalledWith({ is_deployed: false });
    expect(flip.eqOuter).toHaveBeenCalledWith("site_id", "site-1");
    expect(flip.eqInner).toHaveBeenCalledWith("is_deployed", true);
  });

  it("returns 404 when the site does not exist", async () => {
    const site = siteSelectChain({ data: null, error: null });
    fromMock.mockReturnValueOnce({ select: site.select });

    const res = await POST(makeRequest(), ctx("missing-site"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.kind).toBe("invalid_output");
    expect(body.error.message).toMatch(/site/i);
    // No further supabase calls.
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when no working version exists", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({ data: null, error: null });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.kind).toBe("invalid_output");
    expect(body.error.message).toMatch(/working version/i);
  });

  it("returns 400 with kind=invalid_output when the working config fails schema validation", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({
      data: { id: "v_working", config: INVALID_CONFIG },
      error: null,
    });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.kind).toBe("invalid_output");
    expect(body.error.message).toMatch(/schema validation/i);
    expect(body.error.details).toBeDefined();
    // The flip + insert never happened.
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it("returns 200 even when there is no existing deployed row to flip", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({
      data: { id: "v_working", config: VALID_CONFIG },
      error: null,
    });
    // Supabase UPDATE matching zero rows is not an error -- the flip is a
    // benign no-op on the first deploy.
    const flip = flipUpdateChain({ error: null });
    const insert = insertChain({ data: { id: "v_first_deploy" }, error: null });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select })
      .mockReturnValueOnce({ update: flip.update })
      .mockReturnValueOnce({ insert: insert.insert });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versionId).toBe("v_first_deploy");
  });

  it("inserts source='deploy' and parent_version_id pointing at the working version", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({
      data: { id: "v_working_id", config: VALID_CONFIG },
      error: null,
    });
    const flip = flipUpdateChain({ error: null });
    const insert = insertChain({ data: { id: "v_deployed" }, error: null });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select })
      .mockReturnValueOnce({ update: flip.update })
      .mockReturnValueOnce({ insert: insert.insert });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(200);
    expect(insert.insert).toHaveBeenCalledTimes(1);
    const insertedRow = insert.insert.mock.calls[0]?.[0];
    expect(insertedRow).toMatchObject({
      site_id: "site-1",
      source: "deploy",
      parent_version_id: "v_working_id",
      is_deployed: true,
      is_working: false,
      created_by: null,
    });
  });

  it("returns 500 with kind=auth_error when supabase throws on the insert", async () => {
    const site = siteSelectChain({
      data: { id: "site-1", slug: "aurora", name: "Aurora" },
      error: null,
    });
    const working = versionSelectChain({
      data: { id: "v_working", config: VALID_CONFIG },
      error: null,
    });
    const flip = flipUpdateChain({ error: null });
    const insert = insertChain({ data: null, error: { message: "boom" } });
    fromMock
      .mockReturnValueOnce({ select: site.select })
      .mockReturnValueOnce({ select: working.select })
      .mockReturnValueOnce({ update: flip.update })
      .mockReturnValueOnce({ insert: insert.insert });

    const res = await POST(makeRequest(), ctx("site-1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.kind).toBe("auth_error");
    expect(body.error.message).toBe("boom");
  });
});
