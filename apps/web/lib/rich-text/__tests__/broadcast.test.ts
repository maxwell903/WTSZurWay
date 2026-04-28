// @vitest-environment node

import {
  applyMarkToAllLeaves,
  isBlockAttrUniformAcrossDocs,
  isMarkActiveAcrossDocs,
  setBlockAttrAll,
  unwrapListAll,
  wrapInListAll,
} from "@/lib/rich-text/broadcast";
import type { RichTextDoc } from "@/lib/site-config";
import { describe, expect, it } from "vitest";

function paragraphDoc(...runs: { text: string; marks?: { type: string }[] }[]): RichTextDoc {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: runs.map((r) => ({ type: "text", text: r.text, marks: r.marks })),
      },
    ],
  };
}

describe("applyMarkToAllLeaves", () => {
  it("adds a mark to every leaf in 'set' mode", () => {
    const doc = paragraphDoc({ text: "Hello " }, { text: "world" });
    const next = applyMarkToAllLeaves(doc, "bold", undefined, "set");
    const leaves = next.content?.[0]?.content ?? [];
    for (const leaf of leaves) {
      expect(leaf.marks?.some((m) => m.type === "bold")).toBe(true);
    }
  });

  it("removes the mark from every leaf in 'unset' mode", () => {
    const doc = paragraphDoc(
      { text: "a", marks: [{ type: "bold" }] },
      { text: "b", marks: [{ type: "bold" }, { type: "italic" }] },
    );
    const next = applyMarkToAllLeaves(doc, "bold", undefined, "unset");
    const leaves = next.content?.[0]?.content ?? [];
    expect(leaves[0]?.marks).toBeUndefined();
    expect(leaves[1]?.marks).toEqual([{ type: "italic" }]);
  });

  it("toggle: every leaf already has the mark → unsets it", () => {
    const doc = paragraphDoc(
      { text: "a", marks: [{ type: "bold" }] },
      { text: "b", marks: [{ type: "bold" }] },
    );
    const next = applyMarkToAllLeaves(doc, "bold", undefined, "toggle");
    const leaves = next.content?.[0]?.content ?? [];
    for (const leaf of leaves) {
      expect(leaf.marks?.some((m) => m.type === "bold") ?? false).toBe(false);
    }
  });

  it("toggle: not every leaf has the mark → sets on all", () => {
    const doc = paragraphDoc({ text: "a" }, { text: "b", marks: [{ type: "bold" }] });
    const next = applyMarkToAllLeaves(doc, "bold", undefined, "toggle");
    const leaves = next.content?.[0]?.content ?? [];
    for (const leaf of leaves) {
      expect(leaf.marks?.some((m) => m.type === "bold")).toBe(true);
    }
  });

  it("set with attrs replaces existing attrs of the same mark type", () => {
    const doc = paragraphDoc({ text: "x", marks: [{ type: "textStyle" }] });
    const next = applyMarkToAllLeaves(doc, "textStyle", { color: "#22c55e" }, "set");
    const leaf = next.content?.[0]?.content?.[0];
    expect(leaf?.marks).toEqual([{ type: "textStyle", attrs: { color: "#22c55e" } }]);
  });

  it("walks nested structures (e.g., lists) and toggles every leaf", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }],
            },
          ],
        },
      ],
    };
    const next = applyMarkToAllLeaves(doc, "italic", undefined, "set");
    let allItalic = true;
    function walk(n: { type?: string; content?: unknown[]; marks?: { type: string }[] }) {
      if (n.type === "text") {
        if (!n.marks?.some((m) => m.type === "italic")) allItalic = false;
        return;
      }
      const kids = n.content as
        | { type?: string; content?: unknown[]; marks?: { type: string }[] }[]
        | undefined;
      for (const c of kids ?? []) walk(c);
    }
    for (const c of next.content ?? []) walk(c);
    expect(allItalic).toBe(true);
  });
});

describe("setBlockAttrAll", () => {
  it("sets the attribute on every block node of the given types", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "h" }] },
        { type: "paragraph", content: [{ type: "text", text: "p" }] },
      ],
    };
    const next = setBlockAttrAll(doc, ["paragraph", "heading"], "textAlign", "center");
    expect(next.content?.[0]?.attrs?.textAlign).toBe("center");
    expect(next.content?.[1]?.attrs?.textAlign).toBe("center");
  });

  it("clears the attribute when value is null", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "right" },
          content: [{ type: "text", text: "p" }],
        },
      ],
    };
    const next = setBlockAttrAll(doc, ["paragraph"], "textAlign", null);
    expect(next.content?.[0]?.attrs?.textAlign).toBeUndefined();
  });

  it("leaves non-matching block types alone", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [{ type: "bulletList", content: [{ type: "listItem", content: [] }] }],
    };
    const next = setBlockAttrAll(doc, ["paragraph"], "textAlign", "center");
    expect(next.content?.[0]?.attrs).toBeUndefined();
  });
});

describe("wrapInListAll / unwrapListAll", () => {
  it("wraps every top-level paragraph in a list", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
      ],
    };
    const wrapped = wrapInListAll(doc, "bulletList");
    expect(wrapped.content?.length).toBe(2);
    expect(wrapped.content?.[0]?.type).toBe("bulletList");
    expect(wrapped.content?.[1]?.type).toBe("bulletList");
  });

  it("unwrapListAll inverts wrapInListAll", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }],
    };
    const wrapped = wrapInListAll(doc, "orderedList");
    const unwrapped = unwrapListAll(wrapped);
    expect(unwrapped).toEqual(doc);
  });
});

describe("isMarkActiveAcrossDocs", () => {
  it("true iff every leaf in every doc has the mark", () => {
    const a = paragraphDoc({ text: "x", marks: [{ type: "bold" }] });
    const b = paragraphDoc({ text: "y", marks: [{ type: "bold" }] });
    expect(isMarkActiveAcrossDocs([a, b], "bold")).toBe(true);
    const c = paragraphDoc({ text: "z" });
    expect(isMarkActiveAcrossDocs([a, c], "bold")).toBe(false);
  });

  it("empty doc set → false", () => {
    expect(isMarkActiveAcrossDocs([], "bold")).toBe(false);
  });
});

describe("isBlockAttrUniformAcrossDocs", () => {
  it("true iff every matching block has the same attr value", () => {
    const a: RichTextDoc = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { textAlign: "center" } }],
    };
    const b: RichTextDoc = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { textAlign: "center" } }],
    };
    expect(isBlockAttrUniformAcrossDocs([a, b], ["paragraph"], "textAlign", "center")).toBe(true);
    const c: RichTextDoc = {
      type: "doc",
      content: [{ type: "paragraph", attrs: { textAlign: "left" } }],
    };
    expect(isBlockAttrUniformAcrossDocs([a, c], ["paragraph"], "textAlign", "center")).toBe(false);
  });
});
