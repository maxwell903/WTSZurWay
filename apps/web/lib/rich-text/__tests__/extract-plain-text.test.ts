// @vitest-environment node

import { extractPlainText } from "@/lib/rich-text/extract-plain-text";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { RichTextDoc } from "@/lib/site-config";
import { describe, expect, it } from "vitest";

describe("extractPlainText", () => {
  it("returns empty string for undefined", () => {
    expect(extractPlainText(undefined)).toBe("");
  });

  it("round-trips synthesizeDoc for plain strings", () => {
    expect(extractPlainText(synthesizeDoc("Hello"))).toBe("Hello");
  });

  it("round-trips synthesizeDoc through hard breaks", () => {
    expect(extractPlainText(synthesizeDoc("a\nb"))).toBe("a\nb");
  });

  it("ignores marks and reads only the text leaves", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Hello world");
  });

  it("collapses block boundaries to a single newline", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] },
      ],
    };
    expect(extractPlainText(doc)).toBe("First\nSecond");
  });

  it("walks heading nodes too", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      ],
    };
    expect(extractPlainText(doc)).toBe("Title\nBody");
  });
});
