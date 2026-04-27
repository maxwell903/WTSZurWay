// Sprint 7 — the binding "Resizable component matrix" in CLAUDE.md mirrors
// PROJECT_SPEC.md §8.6.
//
// Task 2.1 (2026-04-27 x-axis-resize plan): RESIZE_MATRIX has been replaced
// by the registry-driven isResizableOnAxis function. The old matrix-shape
// tests below have been updated to use isResizableOnAxis semantics: every
// ComponentType is resizable on both axes by default.

import { COMPONENT_TYPES } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { isResizableOnAxis } from "../ResizeHandles";

describe("isResizableOnAxis", () => {
  for (const type of COMPONENT_TYPES) {
    if (type === "FlowGroup") continue;
    it(`${type} is resizable on width`, () => {
      expect(isResizableOnAxis(type, "width")).toBe(true);
    });
    it(`${type} is resizable on height`, () => {
      expect(isResizableOnAxis(type, "height")).toBe(true);
    });
  }

  it("FlowGroup is resizable on both axes", () => {
    expect(isResizableOnAxis("FlowGroup", "width")).toBe(true);
    expect(isResizableOnAxis("FlowGroup", "height")).toBe(true);
  });
});
