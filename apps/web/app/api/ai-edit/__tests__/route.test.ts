// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const aiEditMock = vi.fn();
vi.mock("@/lib/ai/ai-edit", () => ({
  aiEdit: (...args: unknown[]) => aiEditMock(...args),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { POST } from "../route";

// Zod 4's UUID validator requires a valid version+variant nibble
// (third group [1-8], fourth group [89abAB]). Use canonical v4 fixtures.
const VALID_SITE_ID = "11111111-1111-4111-8111-111111111111";
const VALID_VERSION_ID = "22222222-2222-4222-8222-222222222222";

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
      rootComponent: {
        id: "cmp_root",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "cmp_hero",
            type: "HeroBanner",
            props: { heading: "Welcome", subheading: "" },
            style: {},
          },
        ],
      },
    },
  ],
  forms: [],
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai-edit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// The route makes two Supabase calls in sequence:
//   1. .from("site_versions").select("id", { count: ..., head: true }).eq().eq()
//      -> { count, error }
//   2. .from("site_versions").select("id, config").eq().eq().maybeSingle()
//      -> { data, error }
// This helper builds a `from(...)` mock that branches on the first .select()'s
// `head` flag to decide which chain shape to return.
type CountResult = { count: number | null; error: { message: string } | null };
type RowResult = {
  data: { id: string; config: unknown } | null;
  error: { message: string } | null;
};

function buildSupabaseMock(returns: { count: CountResult; row: RowResult }) {
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => {
    if (table !== "site_versions") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          // Count chain
          return {
            eq: () => ({
              eq: async () => returns.count,
            }),
          };
        }
        // Row chain
        return {
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => returns.row,
            }),
          }),
        };
      },
    };
  });
}

const VALID_BODY = {
  siteId: VALID_SITE_ID,
  currentVersionId: VALID_VERSION_ID,
  prompt: "Make the hero say Hello",
};

describe("POST /api/ai-edit", () => {
  beforeEach(() => {
    aiEditMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when the body is not JSON", async () => {
    const response = await POST(makeRequest("not json {"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the body fails schema validation", async () => {
    const response = await POST(makeRequest({ siteId: "not-uuid" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.kind).toBe("invalid_output");
  });

  it("returns 404 when the working version row is missing", async () => {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: null, error: null },
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(404);
  });

  it("returns 503 with over_quota when the edit count is at or above the cap", async () => {
    buildSupabaseMock({
      count: { count: 200, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.kind).toBe("over_quota");
  });

  it("returns 200 + ok payload on the happy path", async () => {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "ok",
      summary: "Update hero",
      operations: [{ type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Hello" }],
      source: "live",
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.kind).toBe("ok");
    expect(body.summary).toBe("Update hero");
    expect(body.operations).toHaveLength(1);
  });

  it("returns 200 + clarify when the orchestrator asks a clarifying question", async () => {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "clarify",
      question: "Which heading?",
      source: "live",
    });
    const response = await POST(makeRequest({ ...VALID_BODY, prompt: "fix it" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.kind).toBe("clarify");
    expect(body.question).toBe("Which heading?");
  });

  it("returns 502 + operation_invalid when the orchestrator's ops fail dry-run", async () => {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "ok",
      summary: "doomed",
      operations: [
        // setText on HeroBanner is invalid -- only Heading/Paragraph/Button
        // accept setText, so this should fail the dry-run.
        { type: "setText", targetId: "cmp_hero", text: "x" },
      ],
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.kind).toBe("operation_invalid");
  });

  it("returns the orchestrator's HTTP-mapped status when it errors", async () => {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "error",
      error: { kind: "network_error", message: "ECONNREFUSED" },
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.kind).toBe("network_error");
  });

  it("returns 503 when the Supabase count query errors", async () => {
    buildSupabaseMock({
      count: { count: null, error: { message: "service down" } },
      row: { data: null, error: null },
    });
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(503);
  });

  // ----- Sprint 14 DoD-16(e) -----

  function setupOk(source: "live" | "fixture") {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "ok",
      summary: "Update hero",
      operations: [{ type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Hello" }],
      source,
    });
  }

  function setupClarify(source: "live" | "fixture") {
    buildSupabaseMock({
      count: { count: 0, error: null },
      row: { data: { id: VALID_VERSION_ID, config: VALID_CONFIG }, error: null },
    });
    aiEditMock.mockResolvedValueOnce({
      kind: "clarify",
      question: "Which one?",
      source,
    });
  }

  it("Sprint 14: ok body sets x-ai-source: live in dev mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    setupOk("live");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-source")).toBe("live");
    vi.unstubAllEnvs();
  });

  it("Sprint 14: ok body sets x-ai-source: fixture in dev mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    setupOk("fixture");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-source")).toBe("fixture");
    vi.unstubAllEnvs();
  });

  it("Sprint 14: ok body omits x-ai-source in production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setupOk("live");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-source")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("Sprint 14: clarify body sets x-ai-source in dev mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    setupClarify("fixture");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-source")).toBe("fixture");
    vi.unstubAllEnvs();
  });

  it("Sprint 14: clarify body omits x-ai-source in production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setupClarify("live");
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-source")).toBeNull();
    vi.unstubAllEnvs();
  });
});
