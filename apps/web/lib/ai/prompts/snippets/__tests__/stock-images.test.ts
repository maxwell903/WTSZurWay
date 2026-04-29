// @vitest-environment node

import { type StockImageRow, buildStockImagesProse } from "@/lib/ai/prompts/snippets/stock-images";
import { describe, expect, it } from "vitest";

const sample: StockImageRow[] = [
  {
    id: 1,
    site_id: null,
    storage_path: "default/CustomerPhotos/SmilingHeadshot1.jpg",
    public_url:
      "https://example.supabase.co/storage/v1/object/public/ai-stock-images/default/CustomerPhotos/SmilingHeadshot1.jpg",
    category: "CustomerPhotos",
    description: "Smiling professional headshot",
  },
  {
    id: 2,
    site_id: "11111111-1111-1111-1111-111111111111",
    storage_path: "11111111-1111-1111-1111-111111111111/1730000000-pool.jpg",
    public_url:
      "https://example.supabase.co/storage/v1/object/public/ai-stock-images/11111111-1111-1111-1111-111111111111/1730000000-pool.jpg",
    category: null,
    description: "Outdoor pool",
  },
];

describe("buildStockImagesProse", () => {
  it("returns empty string for an empty list", () => {
    expect(buildStockImagesProse([])).toBe("");
  });

  it("includes the directive text", () => {
    const out = buildStockImagesProse(sample);
    expect(out).toContain("# Available stock images");
    expect(out).toContain("Use the URL exactly as written");
    expect(out).toContain("Do not invent image URLs");
  });

  it("tags global rows with category and per-site rows distinctly", () => {
    const out = buildStockImagesProse(sample);
    expect(out).toContain("(default — CustomerPhotos)");
    expect(out).toContain("(per-site)");
  });

  it("emits the public URL and description for each row", () => {
    const out = buildStockImagesProse(sample);
    // noUncheckedIndexedAccess narrows tuple lookups to | undefined; the
    // sample array is a literal with two entries, so assert non-null.
    // biome-ignore lint/style/noNonNullAssertion: literal fixture, see comment above
    expect(out).toContain(sample[0]!.public_url);
    expect(out).toContain("Smiling professional headshot");
    // biome-ignore lint/style/noNonNullAssertion: literal fixture, see comment above
    expect(out).toContain(sample[1]!.public_url);
    expect(out).toContain("Outdoor pool");
  });
});
