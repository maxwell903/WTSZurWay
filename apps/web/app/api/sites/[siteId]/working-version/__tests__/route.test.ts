// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MaybeSingleResult = { data: unknown; error: unknown };
const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { PATCH } from "../route";

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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/sites/abc/working-version", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(siteId: string) {
  return { params: Promise.resolve({ siteId }) };
}

function chainableUpdate(returns: MaybeSingleResult) {
  // .from(t).update(v).eq(c, v).eq(c, v).select(c).maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const select = vi.fn(() => ({ maybeSingle }));
  const eq2 = vi.fn(() => ({ select }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  return { update, eq1, eq2, select, maybeSingle };
}

describe("PATCH /api/sites/[siteId]/working-version", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/sites/abc/working-version", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await PATCH(request, ctx("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
  });

  it("returns 400 when the config fails schema validation", async () => {
    const res = await PATCH(makeRequest({ config: { meta: { siteName: "x" } } }), ctx("abc"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
  });

  it("returns 204 on a successful update", async () => {
    const chain = chainableUpdate({ data: { id: "v1" }, error: null });
    fromMock.mockReturnValue({ update: chain.update });
    const res = await PATCH(makeRequest({ config: VALID_CONFIG }), ctx("site-1"));
    expect(res.status).toBe(204);
    expect(fromMock).toHaveBeenCalledWith("site_versions");
    expect(chain.eq1).toHaveBeenCalledWith("site_id", "site-1");
    expect(chain.eq2).toHaveBeenCalledWith("is_working", true);
  });

  it("returns 404 when no working version row matches the siteId", async () => {
    const chain = chainableUpdate({ data: null, error: null });
    fromMock.mockReturnValue({ update: chain.update });
    const res = await PATCH(makeRequest({ config: VALID_CONFIG }), ctx("missing-site"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.category).toBe("not_found");
  });

  it("returns 500 with category=server_error when supabase errors", async () => {
    const chain = chainableUpdate({ data: null, error: { message: "boom" } });
    fromMock.mockReturnValue({ update: chain.update });
    const res = await PATCH(makeRequest({ config: VALID_CONFIG }), ctx("abc"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe("server_error");
    expect(body.message).toBe("boom");
  });
});
