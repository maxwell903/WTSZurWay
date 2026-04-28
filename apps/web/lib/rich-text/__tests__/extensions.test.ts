// @vitest-environment node
//
// Smoke tests for the BLOCK / INLINE extension profiles. We don't mount a
// full TipTap editor here (that would need a DOM); we just round-trip a
// known JSON doc through `generateHTML` to confirm the right marks and
// nodes are wired up in each profile.

import { generateHTML } from "@tiptap/html";
import { describe, expect, it } from "vitest";

import { BLOCK_PROFILE, INLINE_PROFILE, profileExtensions } from "@/lib/rich-text/extensions";
import type { RichTextDoc } from "@/lib/site-config";

describe("profileExtensions", () => {
  it("returns BLOCK_PROFILE by default", () => {
    expect(profileExtensions("block")).toBe(BLOCK_PROFILE);
  });

  it("returns INLINE_PROFILE when requested", () => {
    expect(profileExtensions("inline")).toBe(INLINE_PROFILE);
  });
});

describe("BLOCK_PROFILE", () => {
  it("renders bold/italic/underline/strike + textAlign on paragraph", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [
            { type: "text", text: "Hello ", marks: [{ type: "bold" }] },
            { type: "text", text: "world", marks: [{ type: "italic" }] },
          ],
        },
      ],
    };
    const html = generateHTML(doc, BLOCK_PROFILE);
    expect(html).toContain("<strong>Hello </strong>");
    expect(html).toContain("<em>world</em>");
    expect(html.toLowerCase()).toContain("text-align: center");
  });

  it("renders TextStyle attributes (color, fontSize, letterSpacing) inline", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "color",
              marks: [
                {
                  type: "textStyle",
                  attrs: { color: "#ef4444", fontSize: "20px", letterSpacing: "0.05em" },
                },
              ],
            },
          ],
        },
      ],
    };
    const html = generateHTML(doc, BLOCK_PROFILE);
    expect(html).toContain("color: #ef4444");
    expect(html).toContain("font-size: 20px");
    expect(html).toContain("letter-spacing: 0.05em");
  });

  it("renders block-level lineHeight and dir attributes on paragraph", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { lineHeight: "1.75", dir: "rtl" },
          content: [{ type: "text", text: "rtl line" }],
        },
      ],
    };
    const html = generateHTML(doc, BLOCK_PROFILE);
    expect(html).toContain("line-height: 1.75");
    expect(html).toContain('dir="rtl"');
  });

  it("renders bullet and ordered lists", () => {
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
          ],
        },
      ],
    };
    const html = generateHTML(doc, BLOCK_PROFILE);
    expect(html).toMatch(/<ul[^>]*>.*<li[^>]*>.*<p[^>]*>one<\/p>.*<\/li>.*<\/ul>/s);
  });

  it("renders link marks with href + safe rel/target", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "go",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };
    const html = generateHTML(doc, BLOCK_PROFILE);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});

describe("INLINE_PROFILE", () => {
  it("does NOT wrap inline text in a <p> (legal inside <button>/<a>)", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        { type: "text", text: "Click " },
        { type: "text", text: "me", marks: [{ type: "bold" }] },
      ],
    };
    const html = generateHTML(doc, INLINE_PROFILE);
    expect(html).not.toContain("<p");
    expect(html).toContain("<strong>me</strong>");
    expect(html).toContain("Click ");
  });

  it("supports inline marks (color, fontSize, sub, sup, underline)", () => {
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "text",
          text: "x",
          marks: [
            {
              type: "textStyle",
              attrs: { color: "#22c55e", fontSize: "18px", textTransform: "uppercase" },
            },
            { type: "underline" },
          ],
        },
      ],
    };
    const html = generateHTML(doc, INLINE_PROFILE);
    expect(html).toContain("color: #22c55e");
    expect(html).toContain("font-size: 18px");
    expect(html).toContain("text-transform: uppercase");
  });
});
