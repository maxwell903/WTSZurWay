// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  dominantTextStyleColor,
  dominantTextStyleColorMulti,
} from "@/lib/rich-text/dominant-color";
import type { RichTextDoc, RichTextNode } from "@/lib/site-config";

const docOf = (content: RichTextDoc["content"]): RichTextDoc => ({ type: "doc", content });

const textNode = (text: string, color?: string): RichTextNode =>
  color
    ? { type: "text", text, marks: [{ type: "textStyle", attrs: { color } }] }
    : { type: "text", text };

describe("dominantTextStyleColor", () => {
  it("returns null for missing/empty docs", () => {
    expect(dominantTextStyleColor(undefined)).toBe(null);
    expect(dominantTextStyleColor(null)).toBe(null);
    expect(dominantTextStyleColor(docOf([]))).toBe(null);
    expect(dominantTextStyleColor(docOf([{ type: "paragraph" }]))).toBe(null);
  });

  it("returns the color when every text node carries the same textStyle.color", () => {
    const doc = docOf([
      {
        type: "paragraph",
        content: [textNode("Hello ", "#ef4444"), textNode("world", "#ef4444")],
      },
    ]);
    expect(dominantTextStyleColor(doc)).toBe("#ef4444");
  });

  it("returns null when text nodes disagree", () => {
    const doc = docOf([
      {
        type: "paragraph",
        content: [textNode("a", "#ef4444"), textNode("b", "#22c55e")],
      },
    ]);
    expect(dominantTextStyleColor(doc)).toBe(null);
  });

  it("returns null when any text node is uncolored", () => {
    const doc = docOf([
      {
        type: "paragraph",
        content: [textNode("a", "#ef4444"), textNode("b")],
      },
    ]);
    expect(dominantTextStyleColor(doc)).toBe(null);
  });

  it("ignores empty-string text nodes (don't count toward uniformity)", () => {
    const doc = docOf([
      {
        type: "paragraph",
        content: [textNode("", undefined), textNode("real", "#3b82f6")],
      },
    ]);
    expect(dominantTextStyleColor(doc)).toBe("#3b82f6");
  });

  it("walks nested content (e.g., bullet lists)", () => {
    const doc = docOf([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [textNode("one", "#8b5cf6")] },
              { type: "paragraph", content: [textNode("two", "#8b5cf6")] },
            ],
          },
        ],
      },
    ]);
    expect(dominantTextStyleColor(doc)).toBe("#8b5cf6");
  });
});

describe("dominantTextStyleColorMulti", () => {
  it("returns null when the doc list is empty / all empty", () => {
    expect(dominantTextStyleColorMulti([])).toBe(null);
    expect(dominantTextStyleColorMulti([undefined, null])).toBe(null);
  });

  it("returns the shared color across multiple docs", () => {
    const a = docOf([{ type: "paragraph", content: [textNode("a", "#06b6d4")] }]);
    const b = docOf([{ type: "paragraph", content: [textNode("b", "#06b6d4")] }]);
    expect(dominantTextStyleColorMulti([a, b])).toBe("#06b6d4");
  });

  it("returns null when one doc disagrees", () => {
    const a = docOf([{ type: "paragraph", content: [textNode("a", "#06b6d4")] }]);
    const b = docOf([{ type: "paragraph", content: [textNode("b", "#ec4899")] }]);
    expect(dominantTextStyleColorMulti([a, b])).toBe(null);
  });

  it("returns null when one doc has uncolored text", () => {
    const a = docOf([{ type: "paragraph", content: [textNode("a", "#06b6d4")] }]);
    const b = docOf([{ type: "paragraph", content: [textNode("b")] }]);
    expect(dominantTextStyleColorMulti([a, b])).toBe(null);
  });
});
