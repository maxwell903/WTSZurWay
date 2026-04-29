// @vitest-environment node

import { GET, POST } from "@/app/api/ai-stock-images/route";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

import { createServiceSupabaseClient } from "@/lib/supabase";

function mockSupabaseFor(handlers: {
  select?: () => Promise<{ data: unknown; error: unknown }>;
  insert?: (row: unknown) => Promise<{ data: unknown; error: unknown }>;
}) {
  // Builder is thenable: any chained `.select().or().eq().is().order().order()`
  // resolves via the handlers.select() promise; `.single()` resolves via
  // handlers.insert(). This mirrors how the real Supabase query builder works
  // (terminal `await` triggers the request).
  const selectResolver = handlers.select ?? (() => Promise.resolve({ data: [], error: null }));
  const insertResolver = handlers.insert ?? (() => Promise.resolve({ data: null, error: null }));

  const builder: Record<string, unknown> = {};
  const chainable = vi.fn().mockReturnValue(builder);
  builder.select = chainable;
  builder.insert = chainable;
  builder.or = chainable;
  builder.eq = chainable;
  builder.is = chainable;
  builder.order = chainable;
  // Terminal: `.single()` returns the insert handler's promise (used by POST).
  builder.single = vi.fn().mockImplementation(() => insertResolver(undefined));
  // Thenable: `await builder` (or `.then(...)`) resolves via the select handler.
  // biome-ignore lint/suspicious/noThenProperty: matches Supabase's real query builder, which is itself thenable
  builder.then = (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
    selectResolver().then(onFulfilled);

  return {
    from: vi.fn(() => builder),
  };
}

describe("GET /api/ai-stock-images", () => {
  it("returns 400 when siteId is missing", async () => {
    const req = new Request("http://test/api/ai-stock-images");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns defaults + perSite split", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseFor({
        select: () =>
          Promise.resolve({
            data: [
              {
                id: 1,
                site_id: null,
                storage_path: "default/A/x.jpg",
                public_url: "u1",
                category: "A",
                description: "d1",
              },
              {
                id: 2,
                site_id: "11111111-1111-4111-a111-111111111111",
                storage_path: "11111111-1111-4111-a111-111111111111/x.jpg",
                public_url: "u2",
                category: null,
                description: "d2",
              },
            ],
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request(
      "http://test/api/ai-stock-images?siteId=11111111-1111-4111-a111-111111111111",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { defaults: unknown[]; perSite: unknown[] };
    expect(body.defaults).toHaveLength(1);
    expect(body.perSite).toHaveLength(1);
  });
});

describe("POST /api/ai-stock-images", () => {
  it("returns 400 on missing description", async () => {
    const req = new Request("http://test/api/ai-stock-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: "11111111-1111-4111-a111-111111111111",
        storage_path: "p",
        public_url: "u",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("inserts a row and returns it", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseFor({
        insert: () =>
          Promise.resolve({
            data: {
              id: 99,
              site_id: "11111111-1111-4111-a111-111111111111",
              storage_path: "p",
              public_url: "u",
              category: null,
              description: "d",
            },
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: "11111111-1111-4111-a111-111111111111",
        storage_path: "p",
        public_url: "http://example.com/x.jpg",
        description: "d",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number };
    expect(body.id).toBe(99);
  });
});

import { DELETE, PATCH } from "@/app/api/ai-stock-images/[id]/route";

// PATCH/DELETE need a richer mock because they do a `.select(...).eq(...).single()`
// existence check followed by an `.update(...).eq(...).select(...).single()` (PATCH)
// or `.delete().eq(...)` (DELETE). The thenable builder from Task 13 supports
// chained methods but the existence-check resolution is via `.single()`, while the
// terminal `.delete().eq(...)` resolves via `.then` (i.e. it's awaited as the chain
// itself). Provide a small focused builder that mirrors `mockSupabaseFor`'s shape
// but lets the test seed both `.single()` and the deletion-promise resolution.
function mockSupabaseForById(handlers: {
  existing?: () => Promise<{ data: unknown; error: unknown }>;
  updateResult?: () => Promise<{ data: unknown; error: unknown }>;
  deleteResult?: () => Promise<{ data: unknown; error: unknown }>;
}) {
  const existingResolver =
    handlers.existing ?? (() => Promise.resolve({ data: null, error: null }));
  const updateResolver =
    handlers.updateResult ?? (() => Promise.resolve({ data: null, error: null }));
  const deleteResolver =
    handlers.deleteResult ?? (() => Promise.resolve({ data: null, error: null }));

  // singleSeq toggles between "first single() = existing", "second single() = update result".
  let singleCallCount = 0;
  const builder: Record<string, unknown> = {};
  const chainable = vi.fn().mockReturnValue(builder);
  builder.select = chainable;
  builder.update = chainable;
  builder.delete = chainable;
  builder.eq = chainable;
  builder.single = vi.fn().mockImplementation(() => {
    singleCallCount += 1;
    return singleCallCount === 1 ? existingResolver() : updateResolver();
  });
  // Terminal `await builder` (used by .delete().eq(...)) resolves via deleteResolver.
  // biome-ignore lint/suspicious/noThenProperty: matches Supabase's real query builder, which is itself thenable
  builder.then = (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
    deleteResolver().then(onFulfilled);

  // Storage stub for DELETE — supabase.storage.from(bucket).remove([path])
  const storageFrom = vi.fn().mockReturnValue({
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  return {
    from: vi.fn(() => builder),
    storage: { from: storageFrom },
  };
}

describe("PATCH /api/ai-stock-images/[id]", () => {
  it("returns 400 on missing description", async () => {
    const req = new Request("http://test/api/ai-stock-images/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when target row has site_id null (global)", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseForById({
        existing: () =>
          Promise.resolve({
            data: { id: 1, site_id: null },
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "new" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("updates description and returns the row when target is per-site", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseForById({
        existing: () =>
          Promise.resolve({
            data: { id: 1, site_id: "11111111-1111-4111-a111-111111111111" },
            error: null,
          }),
        updateResult: () =>
          Promise.resolve({
            data: {
              id: 1,
              site_id: "11111111-1111-4111-a111-111111111111",
              storage_path: "p",
              public_url: "http://example.com/x.jpg",
              category: null,
              description: "updated description",
            },
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "updated description" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { description: string };
    expect(body.description).toBe("updated description");
  });
});

describe("DELETE /api/ai-stock-images/[id]", () => {
  it("returns 403 when target row is global (site_id null)", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseForById({
        existing: () =>
          Promise.resolve({
            data: { id: 1, site_id: null, storage_path: "p" },
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("deletes the row and returns 204 when target is per-site", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseForById({
        existing: () =>
          Promise.resolve({
            data: {
              id: 1,
              site_id: "11111111-1111-4111-a111-111111111111",
              storage_path: "11111111-1111-4111-a111-111111111111/x.jpg",
            },
            error: null,
          }),
        deleteResult: () => Promise.resolve({ data: null, error: null }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(204);
  });
});
