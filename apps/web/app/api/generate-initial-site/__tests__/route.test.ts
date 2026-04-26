// @vitest-environment node

import type { SetupFormValues } from "@/lib/setup-form/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted -- declare before importing the route
// handler so the route picks up the mocked modules.

const generateInitialSiteMock = vi.fn();
vi.mock("@/lib/ai/generate-initial-site", () => ({
  generateInitialSite: (...args: unknown[]) => generateInitialSiteMock(...args),
}));

const ensureUniqueSlugMock = vi.fn();
vi.mock("@/lib/ai/slug", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/slug")>("@/lib/ai/slug");
  return {
    ...actual,
    ensureUniqueSlug: (...args: unknown[]) => ensureUniqueSlugMock(...args),
  };
});

// Build a chainable Supabase mock: `from(table).insert(values).select(cols).single()`.
// `from(table).select(cols).eq(col, val).maybeSingle()` is also exercised by
// the slug check path -- but the slug check is intercepted by the
// ensureUniqueSlugMock above, so we don't need to model it here.
type MaybeSingleResult = { data: unknown; error: unknown };
const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { POST } from "../route";

const VALID_FORM: SetupFormValues = {
  companyName: "Aurora Property Group",
  palette: "ocean",
  templateStart: "ai_generate",
  additionalLogos: [],
  inspirationImages: [],
};

function chainableInsert(returns: MaybeSingleResult) {
  // .from(table).insert(values).select(cols).single() -- four-link chain.
  const single = vi.fn(async () => returns);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, single };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/generate-initial-site", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_CONFIG = {
  meta: { siteName: "Aurora Property Group", siteSlug: "aurora-property-group" },
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
      rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {} },
    },
  ],
  forms: [],
};

describe("POST /api/generate-initial-site", () => {
  beforeEach(() => {
    generateInitialSiteMock.mockReset();
    ensureUniqueSlugMock.mockReset();
    fromMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for a body that fails schema validation", async () => {
    const response = await POST(makeRequest({ companyName: "" /* missing palette */ }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.kind).toBe("invalid_output");
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    const request = new Request("http://localhost/api/generate-initial-site", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json {",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("happy path: returns 200 with siteId, slug, versionId, previewUrl", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({ kind: "ok", config: VALID_CONFIG });

    const sitesInsert = chainableInsert({
      data: { id: "site-uuid-1", slug: "aurora-property-group" },
      error: null,
    });
    const versionsInsert = chainableInsert({
      data: { id: "version-uuid-1" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { insert: sitesInsert.insert };
      if (table === "site_versions") return { insert: versionsInsert.insert };
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      siteId: "site-uuid-1",
      slug: "aurora-property-group",
      versionId: "version-uuid-1",
      previewUrl: "/aurora-property-group/preview?v=version-uuid-1",
    });

    // Slug uniqueness was consulted with the derived base slug.
    expect(ensureUniqueSlugMock).toHaveBeenCalledWith("aurora-property-group");
    // The version row was inserted with the Sprint 4 contract values.
    const versionInsertCall = versionsInsert.insert.mock.calls[0]?.[0] as {
      site_id: string;
      created_by: string;
      source: string;
      is_working: boolean;
      is_deployed: boolean;
      parent_version_id: null;
    };
    expect(versionInsertCall.site_id).toBe("site-uuid-1");
    expect(versionInsertCall.created_by).toBe("ai");
    expect(versionInsertCall.source).toBe("initial_generation");
    expect(versionInsertCall.is_working).toBe(true);
    expect(versionInsertCall.is_deployed).toBe(false);
    expect(versionInsertCall.parent_version_id).toBeNull();
  });

  it("slug collision: ensureUniqueSlug returns the suffixed candidate", async () => {
    // Simulate the collision case: ensureUniqueSlug is mocked, so we just
    // assert the route uses whatever it returns (here -2). The integration
    // path is exercised by ensureUniqueSlug's own DB checks; this test
    // verifies the route plumbs the result through unchanged.
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group-2");
    generateInitialSiteMock.mockResolvedValueOnce({ kind: "ok", config: VALID_CONFIG });

    const sitesInsert = chainableInsert({
      data: { id: "site-uuid-2", slug: "aurora-property-group-2" },
      error: null,
    });
    const versionsInsert = chainableInsert({
      data: { id: "version-uuid-2" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { insert: sitesInsert.insert };
      if (table === "site_versions") return { insert: versionsInsert.insert };
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slug).toBe("aurora-property-group-2");
    expect(body.previewUrl).toBe("/aurora-property-group-2/preview?v=version-uuid-2");
  });

  it("network_error from generation maps to 502", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "network_error", message: "ECONNREFUSED" },
    });
    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.kind).toBe("network_error");
  });

  it("timeout from generation maps to 504", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "timeout", message: "Timed out" },
    });
    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(504);
  });

  it("over_quota from generation maps to 503", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "over_quota", message: "Rate limit" },
    });
    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(503);
  });

  it("auth_error from generation maps to 503", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "auth_error", message: "Bad key" },
    });
    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(503);
  });

  it("invalid_output from generation maps to 502", async () => {
    ensureUniqueSlugMock.mockResolvedValueOnce("aurora-property-group");
    generateInitialSiteMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "invalid_output", message: "Bad shape" },
    });
    const response = await POST(makeRequest(VALID_FORM));
    expect(response.status).toBe(502);
  });
});
