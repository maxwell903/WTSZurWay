// @vitest-environment node
//
// Verifies the operationSchema Zod discriminated union accepts every op type
// listed in PROJECT_SPEC.md §9.4 + §8.12 plus the rich-text addition
// `setRichText` (Phase 1, 2026-04-28). Total count: 26.

import { OPERATION_TYPES, operationSchema } from "@/lib/site-config/ops";
import { describe, expect, it } from "vitest";

const SAMPLE_NODE = {
  id: "cmp_x",
  type: "Heading",
  props: { text: "x", level: 1 },
  style: {},
};

// Each entry is a minimal-but-valid payload for the corresponding op variant.
// Exhaustive coverage of the 25 op types lives here; happy/fail behavior of
// applyOperation is exercised in ops.test.ts.
const SAMPLES: Record<(typeof OPERATION_TYPES)[number], unknown> = {
  addComponent: { type: "addComponent", parentId: "p1", index: 0, component: SAMPLE_NODE },
  removeComponent: { type: "removeComponent", targetId: "x" },
  moveComponent: {
    type: "moveComponent",
    targetId: "x",
    newParentId: "y",
    newIndex: 1,
  },
  setProp: { type: "setProp", targetId: "x", propPath: "a", value: 1 },
  setStyle: { type: "setStyle", targetId: "x", stylePath: "a", value: 1 },
  setAnimation: { type: "setAnimation", targetId: "x", on: "enter", preset: "fadeIn" },
  setVisibility: { type: "setVisibility", targetId: "x", visibility: "always" },
  setText: { type: "setText", targetId: "x", text: "hi" },
  setRichText: {
    type: "setRichText",
    targetId: "x",
    propKey: "richText",
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  },
  applyTextFormat: {
    type: "applyTextFormat",
    targetIds: ["x"],
    format: { kind: "mark", markType: "bold", mode: "toggle" },
  },
  bindRMField: {
    type: "bindRMField",
    targetId: "x",
    propPath: "a",
    fieldExpression: "row.x",
  },
  addPage: { type: "addPage", name: "About", slug: "about" },
  removePage: { type: "removePage", slug: "about" },
  renamePage: { type: "renamePage", slug: "about", newName: "About Us" },
  setSiteSetting: { type: "setSiteSetting", path: "meta.siteName", value: "x" },
  setPalette: { type: "setPalette", palette: "ocean" },
  setLinkMode: { type: "setLinkMode", componentId: "x", value: "detail" },
  setDetailPageSlug: { type: "setDetailPageSlug", componentId: "x", value: "units" },
  setQueryParamDefault: {
    type: "setQueryParamDefault",
    componentId: "x",
    value: "propertyId",
  },
  duplicateComponent: { type: "duplicateComponent", targetId: "x" },
  wrapComponent: {
    type: "wrapComponent",
    targetId: "x",
    wrapper: { type: "Section" },
  },
  unwrapComponent: { type: "unwrapComponent", targetId: "x" },
  reorderChildren: { type: "reorderChildren", parentId: "x", newOrder: ["a", "b"] },
  setRepeaterDataSource: {
    type: "setRepeaterDataSource",
    targetId: "x",
    dataSource: "units",
  },
  setRepeaterFilters: {
    type: "setRepeaterFilters",
    targetId: "x",
    query: { combinator: "and", rules: [] },
  },
  setRepeaterSort: {
    type: "setRepeaterSort",
    targetId: "x",
    sort: { field: "rent", direction: "asc" },
  },
  connectInputToRepeater: {
    type: "connectInputToRepeater",
    inputId: "i",
    repeaterId: "r",
    field: "x",
    operator: "=",
  },
};

describe("operationSchema", () => {
  it("declares exactly 27 op variants", () => {
    expect(OPERATION_TYPES).toHaveLength(27);
  });

  it.each(OPERATION_TYPES)("accepts a minimal valid payload for %s", (opType) => {
    const sample = SAMPLES[opType];
    const result = operationSchema.safeParse(sample);
    expect(result.success).toBe(true);
  });

  it("accepts the optional `id` field on any op", () => {
    const result = operationSchema.safeParse({
      id: "op-123",
      type: "removeComponent",
      targetId: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown discriminator value", () => {
    const result = operationSchema.safeParse({ type: "setProps", targetId: "x" });
    expect(result.success).toBe(false);
  });

  it.each([
    ["setLinkmode", "case-mismatched setLinkMode"],
    ["set_text", "snake-case setText"],
    ["setSiteSettings", "pluralized setSiteSetting"],
    ["addComponentNode", "renamed addComponent"],
  ])("rejects the misspelling %s (%s)", (mistypedName) => {
    const result = operationSchema.safeParse({ type: mistypedName });
    expect(result.success).toBe(false);
  });

  it("rejects setLinkMode with an out-of-enum value", () => {
    const result = operationSchema.safeParse({
      type: "setLinkMode",
      componentId: "x",
      value: "external",
    });
    expect(result.success).toBe(false);
  });

  it("rejects setRepeaterDataSource with an out-of-enum dataSource", () => {
    const result = operationSchema.safeParse({
      type: "setRepeaterDataSource",
      targetId: "x",
      dataSource: "lots_of_widgets",
    });
    expect(result.success).toBe(false);
  });

  it("rejects setQueryParamDefault when value is a number", () => {
    const result = operationSchema.safeParse({
      type: "setQueryParamDefault",
      componentId: "x",
      value: 42,
    });
    expect(result.success).toBe(false);
  });

  it("accepts setQueryParamDefault when value is null", () => {
    const result = operationSchema.safeParse({
      type: "setQueryParamDefault",
      componentId: "x",
      value: null,
    });
    expect(result.success).toBe(true);
  });
});
