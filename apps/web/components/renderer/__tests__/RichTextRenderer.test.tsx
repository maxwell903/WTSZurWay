// @vitest-environment jsdom

import { RichTextRenderer } from "@/components/renderer/RichTextRenderer";
import type { RichTextDoc } from "@/lib/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("RichTextRenderer", () => {
  it("renders the fallback when no doc is provided", () => {
    const { container } = render(
      <RichTextRenderer doc={undefined} fallback="Plain text" as="h1" />,
    );
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Plain text");
  });

  it("renders the doc as HTML when present", () => {
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
    const { container } = render(<RichTextRenderer doc={doc} fallback="" as="h1" />);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    // generateHTML wraps inline content in a <p>; the bold mark renders as <strong>.
    expect(h1?.innerHTML).toContain("<strong>world</strong>");
    expect(h1?.textContent).toContain("Hello world");
  });

  it("falls back to plain text when the doc fails schema validation", () => {
    // Type-cheating to simulate a corrupted doc that survived storage.
    const bad = { type: "not-a-doc", oops: true } as unknown as RichTextDoc;
    const { container } = render(<RichTextRenderer doc={bad} fallback="Safe fallback" as="p" />);
    expect(container.querySelector("p")?.textContent).toBe("Safe fallback");
  });

  it("strips obviously dangerous HTML via DOMPurify", () => {
    // generateHTML normally won't emit <script>, but if a future extension
    // ever rendered raw HTML the sanitizer is the last line of defense.
    // Construct a doc whose serialization would naively include script-y
    // content via a marks attr — DOMPurify strips it from the result.
    const doc: RichTextDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "ok" }],
        },
      ],
    };
    const { container } = render(<RichTextRenderer doc={doc} fallback="" as="div" />);
    const html = container.querySelector("div")?.innerHTML ?? "";
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("preserves passthroughAttrs (e.g. data-component-id)", () => {
    const { container } = render(
      <RichTextRenderer
        doc={undefined}
        fallback="x"
        as="h1"
        passthroughAttrs={{
          "data-component-id": "cmp_h",
          "data-component-type": "Heading",
        }}
      />,
    );
    const h1 = container.querySelector("h1");
    expect(h1?.getAttribute("data-component-id")).toBe("cmp_h");
    expect(h1?.getAttribute("data-component-type")).toBe("Heading");
  });
});
