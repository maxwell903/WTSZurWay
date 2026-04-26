// Sprint 7 — the binding "Resizable component matrix" in CLAUDE.md mirrors
// PROJECT_SPEC.md §8.6. RESIZE_MATRIX is the const that ResizeHandles
// reads from at render time; this test is the contract guard.

import { COMPONENT_TYPES } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { RESIZE_MATRIX } from "../ResizeHandles";

describe("RESIZE_MATRIX — Sprint 7 binding (PROJECT_SPEC.md §8.6)", () => {
  it("Section: bottom-edge height only", () => {
    expect(RESIZE_MATRIX.Section).toEqual({ right: false, bottom: true });
  });

  it("Row: bottom-edge height only", () => {
    expect(RESIZE_MATRIX.Row).toEqual({ right: false, bottom: true });
  });

  it("Column: right-edge span AND bottom-edge height", () => {
    expect(RESIZE_MATRIX.Column).toEqual({ right: true, bottom: true });
  });

  it("Image: bottom-edge height only", () => {
    expect(RESIZE_MATRIX.Image).toEqual({ right: false, bottom: true });
  });

  it("Spacer: bottom-edge height only (writes through props.height per SPEC)", () => {
    expect(RESIZE_MATRIX.Spacer).toEqual({ right: false, bottom: true });
  });

  it("PropertyCard: bottom-edge height only", () => {
    expect(RESIZE_MATRIX.PropertyCard).toEqual({ right: false, bottom: true });
  });

  it("UnitCard: bottom-edge height only", () => {
    expect(RESIZE_MATRIX.UnitCard).toEqual({ right: false, bottom: true });
  });

  it.each(
    COMPONENT_TYPES.filter(
      (t) =>
        t !== "Section" &&
        t !== "Row" &&
        t !== "Column" &&
        t !== "Image" &&
        t !== "Spacer" &&
        t !== "PropertyCard" &&
        t !== "UnitCard",
    ).map((t) => [t]),
  )("%s renders no resize handles", (type) => {
    expect(RESIZE_MATRIX[type]).toBeNull();
  });

  it("declares an entry for every ComponentType (no missing keys)", () => {
    for (const type of COMPONENT_TYPES) {
      expect(type in RESIZE_MATRIX).toBe(true);
    }
  });

  it("Column is the ONLY type with a right-edge handle", () => {
    const rightEnabled = COMPONENT_TYPES.filter((t) => RESIZE_MATRIX[t]?.right === true);
    expect(rightEnabled).toEqual(["Column"]);
  });

  it("the seven resizable types exactly match the binding list", () => {
    const bottomEnabled = COMPONENT_TYPES.filter((t) => RESIZE_MATRIX[t]?.bottom === true).sort();
    expect(bottomEnabled).toEqual(
      ["Column", "Image", "PropertyCard", "Row", "Section", "Spacer", "UnitCard"].sort(),
    );
  });
});
