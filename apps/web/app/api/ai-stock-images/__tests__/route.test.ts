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
