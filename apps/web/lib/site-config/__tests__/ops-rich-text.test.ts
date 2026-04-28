// @vitest-environment node

import type { RichTextDoc, SiteConfig } from "@/lib/site-config";
import { OperationInvalidError, applyOperation, applyOperations } from "@/lib/site-config/ops";
import { describe, expect, it } from "vitest";

function makeConfig(): SiteConfig {
  return {
    meta: { siteName: "Test", siteSlug: "test" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_h",
              type: "Heading",
              props: { text: "Original", level: 1 },
              style: {},
            },
            {
              id: "cmp_p",
              type: "Paragraph",
              props: { text: "Para body" },
              style: {},
            },
            {
              id: "cmp_b",
              type: "Button",
              props: { label: "Click", linkMode: "static" },
              style: {},
            },
            {
              id: "cmp_img",
              type: "Image",
              props: { src: "x.png", alt: "x" },
              style: {},
            },
            // Phase 4 components
            {
              id: "cmp_hero",
              type: "HeroBanner",
              props: { heading: "Welcome", subheading: "to Aurora", ctaLabel: "Get started" },
              style: {},
            },
            {
              id: "cmp_pcard",
              type: "PropertyCard",
              props: { heading: "Aurora Pines", body: "Quiet community.", ctaLabel: "Tour" },
              style: {},
            },
            {
              id: "cmp_ucard",
              type: "UnitCard",
              props: { heading: "Unit 4B", beds: 2, baths: 1, ctaLabel: "Apply" },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

const SAMPLE_DOC: RichTextDoc = {
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

function findNode(config: SiteConfig, id: string) {
  for (const page of config.pages) {
    const found = walk(page.rootComponent);
    if (found) return found;
  }
  return null;
  function walk(node: SiteConfig["pages"][number]["rootComponent"]): typeof node | null {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
}

describe("applySetRichText", () => {
  it("writes both richText and the denormalized plain-text fallback on a Heading", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_h",
      propKey: "richText",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_h");
    expect(node?.props.richText).toEqual(SAMPLE_DOC);
    expect(node?.props.text).toBe("Hello world");
  });

  it("writes richLabel on a Button (and label as plain fallback)", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_b",
      propKey: "richLabel",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_b");
    expect(node?.props.richLabel).toEqual(SAMPLE_DOC);
    expect(node?.props.label).toBe("Hello world");
  });

  it("rejects propKey 'richLabel' on a Heading", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_h",
        propKey: "richLabel",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("rejects propKey 'richText' on a Button", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_b",
        propKey: "richText",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("rejects setRichText on a non-text-bearing component (Image)", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_img",
        propKey: "richText",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });
});

describe("applySetText (post-rich-text)", () => {
  it("writes plain text and clears any pre-existing richText on a Heading", () => {
    const withRich = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_h",
      propKey: "richText",
      doc: SAMPLE_DOC,
    });
    expect(findNode(withRich, "cmp_h")?.props.richText).toBeDefined();

    const cleared = applyOperation(withRich, {
      type: "setText",
      targetId: "cmp_h",
      text: "Just plain",
    });
    const node = findNode(cleared, "cmp_h");
    expect(node?.props.text).toBe("Just plain");
    expect(node?.props.richText).toBeUndefined();
  });

  it("clears richLabel on a Button when setText is applied", () => {
    const withRich = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_b",
      propKey: "richLabel",
      doc: SAMPLE_DOC,
    });
    const cleared = applyOperation(withRich, {
      type: "setText",
      targetId: "cmp_b",
      text: "Plain CTA",
    });
    const node = findNode(cleared, "cmp_b");
    expect(node?.props.label).toBe("Plain CTA");
    expect(node?.props.richLabel).toBeUndefined();
    // Other props preserved.
    expect(node?.props.linkMode).toBe("static");
  });
});

// Phase 4.5 — path-style propKey on setRichText addresses individual array
// items (NavBar links, Footer column titles).

describe("applySetRichText with path-style propKey (array items)", () => {
  function makeNavBarConfig(): SiteConfig {
    return {
      meta: { siteName: "T", siteSlug: "t" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "" },
      },
      pages: [
        {
          id: "p_home",
          slug: "home",
          name: "Home",
          kind: "static",
          rootComponent: {
            id: "cmp_root",
            type: "Section",
            props: {},
            style: {},
            children: [
              {
                id: "cmp_nav",
                type: "NavBar",
                props: {
                  links: [
                    { label: "Home", kind: "external", href: "/" },
                    { label: "About", kind: "external", href: "/about" },
                    { label: "Contact", kind: "external", href: "/contact" },
                  ],
                  logoPlacement: "left",
                  sticky: false,
                },
                style: {},
              },
              {
                id: "cmp_foot",
                type: "Footer",
                props: {
                  columns: [
                    { title: "Company", links: [{ label: "About", href: "/about" }] },
                    { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }] },
                  ],
                  copyright: "© 2026",
                },
                style: {},
              },
            ],
          },
        },
      ],
      forms: [],
    };
  }

  it("writes richLabel into a specific NavBar link by index", () => {
    const next = applyOperation(makeNavBarConfig(), {
      type: "setRichText",
      targetId: "cmp_nav",
      propKey: "links.1.richLabel",
      doc: SAMPLE_DOC,
    });
    const nav = findNode(next, "cmp_nav");
    const links = nav?.props.links as { label: string; richLabel?: RichTextDoc }[];
    // Only index 1 was modified.
    expect(links[0]?.richLabel).toBeUndefined();
    expect(links[0]?.label).toBe("Home");
    expect(links[1]?.richLabel).toEqual(SAMPLE_DOC);
    expect(links[1]?.label).toBe("Hello world"); // denormalized
    expect(links[2]?.richLabel).toBeUndefined();
    expect(links[2]?.label).toBe("Contact");
  });

  it("writes richTitle into a specific Footer column", () => {
    const next = applyOperation(makeNavBarConfig(), {
      type: "setRichText",
      targetId: "cmp_foot",
      propKey: "columns.0.richTitle",
      doc: SAMPLE_DOC,
    });
    const foot = findNode(next, "cmp_foot");
    const cols = foot?.props.columns as { title: string; richTitle?: RichTextDoc }[];
    expect(cols[0]?.richTitle).toEqual(SAMPLE_DOC);
    expect(cols[0]?.title).toBe("Hello world");
    expect(cols[1]?.richTitle).toBeUndefined();
    expect(cols[1]?.title).toBe("Legal");
  });

  it("rejects an out-of-bounds array index", () => {
    expect(() =>
      applyOperation(makeNavBarConfig(), {
        type: "setRichText",
        targetId: "cmp_nav",
        propKey: "links.99.richLabel",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("rejects an unknown array key for the component type", () => {
    expect(() =>
      applyOperation(makeNavBarConfig(), {
        type: "setRichText",
        targetId: "cmp_nav",
        propKey: "columns.0.richTitle", // 'columns' is on Footer, not NavBar
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("still accepts flat propKeys on a component that ALSO has array fields", () => {
    // Footer has both an array field (columns) and a flat field (richCopyright).
    const next = applyOperation(makeNavBarConfig(), {
      type: "setRichText",
      targetId: "cmp_foot",
      propKey: "richCopyright",
      doc: SAMPLE_DOC,
    });
    const foot = findNode(next, "cmp_foot");
    expect(foot?.props.richCopyright).toEqual(SAMPLE_DOC);
    expect(foot?.props.copyright).toBe("Hello world");
  });
});

// Phase 4 — registry-driven setRichText covers HeroBanner / PropertyCard /
// UnitCard without code changes in the dispatcher. Each test asserts both
// the rich-doc write and the denormalized plain-text fallback.

describe("applySetRichText on Phase 4 components", () => {
  it("writes richHeading + heading on a HeroBanner", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_hero",
      propKey: "richHeading",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_hero");
    expect(node?.props.richHeading).toEqual(SAMPLE_DOC);
    expect(node?.props.heading).toBe("Hello world");
    // subheading and other props are preserved.
    expect(node?.props.subheading).toBe("to Aurora");
  });

  it("writes richSubheading + subheading on a HeroBanner", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_hero",
      propKey: "richSubheading",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_hero");
    expect(node?.props.richSubheading).toEqual(SAMPLE_DOC);
    expect(node?.props.subheading).toBe("Hello world");
  });

  it("writes richBody on a PropertyCard", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_pcard",
      propKey: "richBody",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_pcard");
    expect(node?.props.richBody).toEqual(SAMPLE_DOC);
    expect(node?.props.body).toBe("Hello world");
  });

  it("writes richHeading on a UnitCard", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_ucard",
      propKey: "richHeading",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_ucard");
    expect(node?.props.richHeading).toEqual(SAMPLE_DOC);
    expect(node?.props.heading).toBe("Hello world");
  });

  it("rejects an unknown propKey for the target's component type", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_pcard",
        // propKey "richText" is valid for Heading/Paragraph but NOT PropertyCard.
        propKey: "richText",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("rejects setRichText on a non-text-bearing component (Image)", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_img",
        propKey: "richText",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });
});

describe("applyTextFormat broadcast across Phase 4 components", () => {
  it("alignment broadcast to a HeroBanner sets textAlign on every block field", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_hero"],
      format: { kind: "alignment", value: "center" },
    });
    const node = findNode(next, "cmp_hero");
    const richHeading = node?.props.richHeading as RichTextDoc | undefined;
    const richSubheading = node?.props.richSubheading as RichTextDoc | undefined;
    const richCtaLabel = node?.props.richCtaLabel as RichTextDoc | undefined;
    expect(richHeading?.content?.[0]?.attrs?.textAlign).toBe("center");
    expect(richSubheading?.content?.[0]?.attrs?.textAlign).toBe("center");
    // ctaLabel is INLINE — alignment is a no-op there but the doc still
    // exists (synthesized lazily so the next transformation has something
    // to chain off of).
    expect(richCtaLabel).toBeDefined();
  });

  it("bold broadcast across a mixed set (Heading + UnitCard + Button)", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h", "cmp_ucard", "cmp_b"],
      format: { kind: "mark", markType: "bold", mode: "set" },
    });
    const heading = findNode(next, "cmp_h");
    const unitCard = findNode(next, "cmp_ucard");
    const button = findNode(next, "cmp_b");
    const headingDoc = heading?.props.richText as RichTextDoc | undefined;
    const ucardHeadingDoc = unitCard?.props.richHeading as RichTextDoc | undefined;
    const buttonDoc = button?.props.richLabel as RichTextDoc | undefined;
    expect(headingDoc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    expect(ucardHeadingDoc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    expect(buttonDoc?.content?.[0]?.marks?.[0]?.type).toBe("bold");
  });
});

describe("applyOperations chains involving setRichText", () => {
  it("applies setRichText then setText cleanly (left-fold)", () => {
    const next = applyOperations(makeConfig(), [
      { type: "setRichText", targetId: "cmp_h", propKey: "richText", doc: SAMPLE_DOC },
      { type: "setText", targetId: "cmp_h", text: "Final" },
    ]);
    const node = findNode(next, "cmp_h");
    expect(node?.props.text).toBe("Final");
    expect(node?.props.richText).toBeUndefined();
  });
});

// Phase 3 — applyTextFormat (broadcast-style transformer op).

describe("applyApplyTextFormat", () => {
  it("toggles a mark across multiple targets in one op", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h", "cmp_p", "cmp_b"],
      format: { kind: "mark", markType: "bold", mode: "set" },
    });
    const heading = findNode(next, "cmp_h");
    const paragraph = findNode(next, "cmp_p");
    const button = findNode(next, "cmp_b");
    // Each target gets a richText/richLabel doc with bold on its leaves.
    const headingDoc = heading?.props.richText as RichTextDoc | undefined;
    const paragraphDoc = paragraph?.props.richText as RichTextDoc | undefined;
    const buttonDoc = button?.props.richLabel as RichTextDoc | undefined;
    expect(headingDoc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    expect(paragraphDoc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    expect(buttonDoc?.content?.[0]?.marks?.[0]?.type).toBe("bold");
  });

  it("alignment broadcast sets textAlign on every block target (no-op on inline Button)", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h", "cmp_p", "cmp_b"],
      format: { kind: "alignment", value: "center" },
    });
    const heading = findNode(next, "cmp_h");
    const paragraph = findNode(next, "cmp_p");
    const button = findNode(next, "cmp_b");
    const headingDoc = heading?.props.richText as RichTextDoc | undefined;
    const paragraphDoc = paragraph?.props.richText as RichTextDoc | undefined;
    const buttonDoc = button?.props.richLabel as RichTextDoc | undefined;
    expect(headingDoc?.content?.[0]?.attrs?.textAlign).toBe("center");
    expect(paragraphDoc?.content?.[0]?.attrs?.textAlign).toBe("center");
    // Button (inline profile) doesn't have block nodes — alignment is
    // a no-op there but the op must not throw on the mixed batch.
    expect(buttonDoc).toBeDefined();
  });

  it("color broadcast adds a textStyle mark with hex value", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h"],
      format: { kind: "color", markType: "color", value: "#22c55e" },
    });
    const heading = findNode(next, "cmp_h");
    const doc = heading?.props.richText as RichTextDoc | undefined;
    expect(doc?.content?.[0]?.content?.[0]?.marks?.[0]).toEqual({
      type: "textStyle",
      attrs: { color: "#22c55e" },
    });
  });

  it("fontFamily broadcast applies the value to every leaf", () => {
    const next = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h"],
      format: { kind: "fontFamily", value: "Inter, sans-serif" },
    });
    const heading = findNode(next, "cmp_h");
    const doc = heading?.props.richText as RichTextDoc | undefined;
    expect(doc?.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.fontFamily).toBe(
      "Inter, sans-serif",
    );
  });

  it("rejects targetIds pointing at non-text-bearing components", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "applyTextFormat",
        targetIds: ["cmp_img"],
        format: { kind: "mark", markType: "bold", mode: "toggle" },
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("denormalizes plain text after each transform", () => {
    const next = applyOperations(makeConfig(), [
      // Author rich content first.
      {
        type: "setRichText",
        targetId: "cmp_p",
        propKey: "richText",
        doc: SAMPLE_DOC,
      },
      // Then broadcast a fontSize change.
      {
        type: "applyTextFormat",
        targetIds: ["cmp_p"],
        format: { kind: "fontSize", value: "20px" },
      },
    ]);
    const node = findNode(next, "cmp_p");
    // Plain-text fallback still says "Hello world" (the words from SAMPLE_DOC).
    expect(node?.props.text).toBe("Hello world");
  });

  it("'unset' mode strips the mark from every leaf in every target", () => {
    const withBold = applyOperation(makeConfig(), {
      type: "applyTextFormat",
      targetIds: ["cmp_h", "cmp_p"],
      format: { kind: "mark", markType: "bold", mode: "set" },
    });
    const cleared = applyOperation(withBold, {
      type: "applyTextFormat",
      targetIds: ["cmp_h", "cmp_p"],
      format: { kind: "mark", markType: "bold", mode: "unset" },
    });
    const heading = findNode(cleared, "cmp_h");
    const doc = heading?.props.richText as RichTextDoc | undefined;
    const leaf = doc?.content?.[0]?.content?.[0];
    expect(leaf?.marks?.some((m) => m.type === "bold") ?? false).toBe(false);
  });
});

// Phase 2 — Paragraph parity coverage (Phase 1 only had Heading + Button).

describe("applySetRichText on Paragraph", () => {
  it("writes both richText and the denormalized plain-text fallback on a Paragraph", () => {
    const next = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_p",
      propKey: "richText",
      doc: SAMPLE_DOC,
    });
    const node = findNode(next, "cmp_p");
    expect(node?.props.richText).toEqual(SAMPLE_DOC);
    expect(node?.props.text).toBe("Hello world");
  });

  it("rejects propKey 'richLabel' on a Paragraph", () => {
    expect(() =>
      applyOperation(makeConfig(), {
        type: "setRichText",
        targetId: "cmp_p",
        propKey: "richLabel",
        doc: SAMPLE_DOC,
      }),
    ).toThrowError(OperationInvalidError);
  });

  it("setText on a Paragraph clears richText (Phase 1 invariant carries over)", () => {
    const withRich = applyOperation(makeConfig(), {
      type: "setRichText",
      targetId: "cmp_p",
      propKey: "richText",
      doc: SAMPLE_DOC,
    });
    const cleared = applyOperation(withRich, {
      type: "setText",
      targetId: "cmp_p",
      text: "Plain body",
    });
    const node = findNode(cleared, "cmp_p");
    expect(node?.props.text).toBe("Plain body");
    expect(node?.props.richText).toBeUndefined();
  });
});
