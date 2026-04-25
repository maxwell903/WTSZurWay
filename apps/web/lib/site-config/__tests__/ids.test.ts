import { describe, expect, it } from "vitest";
import { newComponentId } from "../ids";

describe("newComponentId", () => {
  it("returns the cmp_<8-hex> shape with the default prefix", () => {
    expect(newComponentId()).toMatch(/^cmp_[0-9a-f]{8}$/);
  });

  it("honors a custom prefix", () => {
    expect(newComponentId("page")).toMatch(/^page_[0-9a-f]{8}$/);
  });

  it("produces unique ids across 1000 calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(newComponentId());
    }
    expect(seen.size).toBe(1000);
  });
});
