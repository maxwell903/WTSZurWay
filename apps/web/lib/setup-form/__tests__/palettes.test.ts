import { describe, expect, it } from "vitest";
import { PALETTES, PALETTE_LIST } from "../palettes";
import { PALETTE_IDS } from "../types";

describe("PALETTES", () => {
  it("contains exactly the six expected palette ids", () => {
    expect(Object.keys(PALETTES).sort()).toEqual([...PALETTE_IDS].sort());
  });

  it("each palette has a non-empty label", () => {
    for (const id of PALETTE_IDS) {
      expect(PALETTES[id].label.length).toBeGreaterThan(0);
    }
  });

  it("each palette has exactly 4 swatches and each swatch is a hex code", () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const id of PALETTE_IDS) {
      const swatches = PALETTES[id].swatches;
      expect(swatches).toHaveLength(4);
      for (const swatch of swatches) {
        expect(swatch).toMatch(hex);
      }
    }
  });

  it("PALETTE_LIST is iterable in PALETTE_IDS order", () => {
    expect(PALETTE_LIST.map((p) => p.id)).toEqual([...PALETTE_IDS]);
  });
});
