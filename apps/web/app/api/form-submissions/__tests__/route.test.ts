// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

import { GET, POST } from "../route";

const VALID_SITE_ID = "11111111-1111-4111-8111-111111111111";

type MaybeSingleResult<T> = { data: T | null; error: { message: string } | null };
type ListResult<T> = { data: T[] | null; error: { message: string } | null };

function makePostRequest(
  body: unknown,
  headers: Record<string, string> = {},
  raw?: string,
): Request {
  return new Request("http://localhost/api/form-submissions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });
}

function makeGetRequest(qs: string): Request {
  return new Request(`http://localhost/api/form-submissions?${qs}`, { method: "GET" });
}

function siteLookup(returns: MaybeSingleResult<{ id: string }>) {
  // .from("sites").select("id").eq("slug", v).maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
}

function insertChain(returns: MaybeSingleResult<{ id: number; created_at: string | null }>) {
  // .from("form_submissions").insert(row).select("id, created_at").maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const select = vi.fn(() => ({ maybeSingle }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, maybeSingle };
}

function listChain(returns: ListResult<{ form_id: string }>) {
  // .from("form_submissions").select("form_id").eq("site_id", v)
  const eq = vi.fn(async () => returns);
  const select = vi.fn(() => ({ eq }));
  return { select, eq };
}

function rowsChain(
  returns: ListResult<{
    id: number;
    page_slug: string | null;
    submitted_data: unknown;
    created_at: string | null;
  }>,
) {
  // .from("form_submissions").select(...).eq().eq().order().limit()
  const limit = vi.fn(async () => returns);
  const order = vi.fn(() => ({ limit }));
  const eq2 = vi.fn(() => ({ order }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  return { select, eq1, eq2, order, limit };
}

describe("POST /api/form-submissions", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 with category=validation_error when the body is not valid JSON", async () => {
    const res = await POST(makePostRequest(undefined, {}, "not json"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
    expect(body.message).toBe("Request body is not valid JSON.");
  });

  it("returns 400 with details=ZodIssue[] when the payload fails Zod validation", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
    expect(body.message).toBe("Submission payload failed validation.");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("returns 404 with category=not_found when the siteSlug does not match a row in `sites`", async () => {
    const sites = siteLookup({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await POST(
      makePostRequest({
        siteSlug: "missing",
        formId: "contact",
        submittedData: { email: "x@x.com" },
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.category).toBe("not_found");
  });

  it("returns 500 with category=server_error when the sites lookup errors", async () => {
    const sites = siteLookup({ data: null, error: { message: "boom-sites" } });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await POST(
      makePostRequest({
        siteSlug: "aurora",
        formId: "contact",
        submittedData: { email: "x@x.com" },
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe("server_error");
    expect(body.message).toBe("boom-sites");
  });

  it("returns 500 with the postgres message when the insert fails", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({ data: null, error: { message: "insert-boom" } });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await POST(
      makePostRequest({
        siteSlug: "aurora",
        formId: "contact",
        submittedData: { email: "x@x.com" },
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe("server_error");
    expect(body.message).toBe("insert-boom");
  });

  it("returns 201 with { id, createdAt } and inserts the submitted_data jsonb on success", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({
      data: { id: 42, created_at: "2026-04-26T15:00:00.000Z" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await POST(
      makePostRequest({
        siteSlug: "aurora",
        formId: "contact_us",
        pageSlug: "home",
        submittedData: { email: "someone@example.com", message: "hi" },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ id: 42, createdAt: "2026-04-26T15:00:00.000Z" });
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: VALID_SITE_ID,
        form_id: "contact_us",
        page_slug: "home",
        submitted_data: { email: "someone@example.com", message: "hi" },
      }),
    );
  });

  it("captures submitter_ip from x-forwarded-for first segment, trimmed", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({
      data: { id: 1, created_at: "2026-04-26T15:00:00.000Z" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    await POST(
      makePostRequest(
        { siteSlug: "aurora", formId: "f", submittedData: { a: "b" } },
        { "x-forwarded-for": "203.0.113.4, 70.41.3.18", "user-agent": "VitestUA" },
      ),
    );
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        submitter_ip: "203.0.113.4",
        user_agent: "VitestUA",
      }),
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({
      data: { id: 2, created_at: "2026-04-26T15:00:00.000Z" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    await POST(
      makePostRequest(
        { siteSlug: "aurora", formId: "f", submittedData: { a: "b" } },
        { "x-real-ip": "198.51.100.7" },
      ),
    );
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_ip: "198.51.100.7" }),
    );
  });

  it("stores submitter_ip and user_agent as null when neither header is present", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({
      data: { id: 3, created_at: "2026-04-26T15:00:00.000Z" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    await POST(makePostRequest({ siteSlug: "aurora", formId: "f", submittedData: { a: "b" } }));
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_ip: null, user_agent: null }),
    );
  });

  it("normalizes pageSlug to null when omitted from the payload", async () => {
    const sites = siteLookup({ data: { id: VALID_SITE_ID }, error: null });
    const insert = insertChain({
      data: { id: 4, created_at: "2026-04-26T15:00:00.000Z" },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return { select: sites.select };
      if (table === "form_submissions") return { insert: insert.insert };
      throw new Error(`unexpected table ${table}`);
    });
    await POST(makePostRequest({ siteSlug: "aurora", formId: "f", submittedData: {} }));
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ page_slug: null }));
  });
});

describe("GET /api/form-submissions (per-form aggregate)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns 400 when siteId is missing", async () => {
    const res = await GET(makeGetRequest(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
  });

  it("returns 400 when siteId is not a uuid", async () => {
    const res = await GET(makeGetRequest("siteId=not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
  });

  it("returns 200 with forms=[] when the site has no submissions (or doesn't exist)", async () => {
    const list = listChain({ data: [], error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "form_submissions") return { select: list.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await GET(makeGetRequest(`siteId=${VALID_SITE_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ forms: [] });
  });

  it("returns aggregate counts sorted by count desc, then formId asc", async () => {
    const list = listChain({
      data: [
        { form_id: "contact" },
        { form_id: "contact" },
        { form_id: "newsletter" },
        { form_id: "contact" },
        { form_id: "newsletter" },
        { form_id: "applications" },
      ],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "form_submissions") return { select: list.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await GET(makeGetRequest(`siteId=${VALID_SITE_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.forms).toEqual([
      { formId: "contact", count: 3 },
      { formId: "newsletter", count: 2 },
      { formId: "applications", count: 1 },
    ]);
  });
});

describe("GET /api/form-submissions (per-form rows)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns 400 when formId is provided but siteId is missing", async () => {
    const res = await GET(makeGetRequest("formId=contact"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe("validation_error");
  });

  it("returns rows sorted by created_at desc with snake-to-camel field translation", async () => {
    const rows = rowsChain({
      data: [
        {
          id: 9,
          page_slug: "home",
          submitted_data: { email: "z@z.com" },
          created_at: "2026-04-26T16:00:00.000Z",
        },
        {
          id: 8,
          page_slug: null,
          submitted_data: { email: "a@a.com", note: "hi" },
          created_at: "2026-04-26T15:00:00.000Z",
        },
      ],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "form_submissions") return { select: rows.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await GET(makeGetRequest(`siteId=${VALID_SITE_ID}&formId=contact`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submissions).toEqual([
      {
        id: 9,
        pageSlug: "home",
        submittedData: { email: "z@z.com" },
        createdAt: "2026-04-26T16:00:00.000Z",
      },
      {
        id: 8,
        pageSlug: null,
        submittedData: { email: "a@a.com", note: "hi" },
        createdAt: "2026-04-26T15:00:00.000Z",
      },
    ]);
    expect(rows.eq1).toHaveBeenCalledWith("site_id", VALID_SITE_ID);
    expect(rows.eq2).toHaveBeenCalledWith("form_id", "contact");
    expect(rows.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rows.limit).toHaveBeenCalledWith(200);
  });

  it("returns 500 with category=server_error when the rows query errors", async () => {
    const rows = rowsChain({ data: null, error: { message: "rows-boom" } });
    fromMock.mockImplementation((table: string) => {
      if (table === "form_submissions") return { select: rows.select };
      throw new Error(`unexpected table ${table}`);
    });
    const res = await GET(makeGetRequest(`siteId=${VALID_SITE_ID}&formId=contact`));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe("server_error");
    expect(body.message).toBe("rows-boom");
  });
});
