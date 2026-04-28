// @vitest-environment node

import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import { describe, expect, it } from "vitest";

describe("synthesizeDoc", () => {
  it("wraps a plain string in a single-paragraph doc", () => {
    expect(synthesizeDoc("Hello")).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    });
  });

  it("emits an empty paragraph for the empty string", () => {
    expect(synthesizeDoc("")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("converts \\n to hardBreak nodes inside the same paragraph", () => {
    expect(synthesizeDoc("a\nb")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a" },
            { type: "hardBreak" },
            { type: "text", text: "b" },
          ],
        },
      ],
    });
  });

  it("preserves consecutive newlines as consecutive hardBreaks", () => {
    expect(synthesizeDoc("a\n\nb").content?.[0]?.content).toEqual([
      { type: "text", text: "a" },
      { type: "hardBreak" },
      { type: "hardBreak" },
      { type: "text", text: "b" },
    ]);
  });

  // Phase 3 — INLINE profile (used by Button labels). No paragraph wrapper.
  describe('profile: "inline"', () => {
    it("emits flat inline content directly under doc (no paragraph wrapper)", () => {
      expect(synthesizeDoc("Hello", "inline")).toEqual({
        type: "doc",
        content: [{ type: "text", text: "Hello" }],
      });
    });

    it("returns doc with empty content array on empty string", () => {
      expect(synthesizeDoc("", "inline")).toEqual({
        type: "doc",
        content: [],
      });
    });

    it("preserves hardBreaks at the top level", () => {
      expect(synthesizeDoc("a\nb", "inline")).toEqual({
        type: "doc",
        content: [
          { type: "text", text: "a" },
          { type: "hardBreak" },
          { type: "text", text: "b" },
        ],
      });
    });
  });
});
