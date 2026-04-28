// @vitest-environment node

import { getTextBearingDescendants } from "@/lib/editor-state/text-tree";
import type { ComponentNode } from "@/lib/site-config";
import { describe, expect, it } from "vitest";

function makeTree(): ComponentNode {
  return {
    id: "cmp_root",
    type: "Section",
    props: {},
    style: {},
    children: [
      {
        id: "cmp_h",
        type: "Heading",
        props: { text: "Title", level: 1 },
        style: {},
      },
      {
        id: "cmp_row",
        type: "Row",
        props: {},
        style: {},
        children: [
          {
            id: "cmp_p1",
            type: "Paragraph",
            props: { text: "Body" },
            style: {},
          },
          {
            id: "cmp_p2",
            type: "Paragraph",
            props: { text: "More body" },
            style: {},
          },
          {
            id: "cmp_img",
            type: "Image",
            props: { src: "x.png", alt: "x" },
            style: {},
          },
        ],
      },
      {
        id: "cmp_btn",
        type: "Button",
        props: { label: "Click", linkMode: "static" },
        style: {},
      },
      {
        id: "cmp_divider",
        type: "Divider",
        props: {},
        style: {},
      },
    ],
  };
}

describe("getTextBearingDescendants", () => {
  it("returns every Heading / Paragraph / Button in the subtree", () => {
    const tree = makeTree();
    const ids = getTextBearingDescendants(tree).map((n) => n.id);
    expect(ids).toEqual(["cmp_h", "cmp_p1", "cmp_p2", "cmp_btn"]);
  });

  it("skips non-text-bearing components (Section, Row, Image, Divider)", () => {
    const tree = makeTree();
    const ids = getTextBearingDescendants(tree).map((n) => n.id);
    expect(ids).not.toContain("cmp_root");
    expect(ids).not.toContain("cmp_row");
    expect(ids).not.toContain("cmp_img");
    expect(ids).not.toContain("cmp_divider");
  });

  it("includes the root node when it has text fields", () => {
    const tree: ComponentNode = {
      id: "cmp_h",
      type: "Heading",
      props: { text: "Lone" },
      style: {},
    };
    const ids = getTextBearingDescendants(tree).map((n) => n.id);
    expect(ids).toEqual(["cmp_h"]);
  });

  it("returns [] for a tree with no text-bearing nodes", () => {
    const tree: ComponentNode = {
      id: "cmp_row",
      type: "Row",
      props: {},
      style: {},
      children: [{ id: "cmp_img", type: "Image", props: { src: "x.png", alt: "x" }, style: {} }],
    };
    expect(getTextBearingDescendants(tree)).toEqual([]);
  });

  it("walks deeply nested children", () => {
    const tree: ComponentNode = {
      id: "outer",
      type: "Section",
      props: {},
      style: {},
      children: [
        {
          id: "row",
          type: "Row",
          props: {},
          style: {},
          children: [
            {
              id: "col",
              type: "Column",
              props: {},
              style: {},
              children: [
                {
                  id: "deep_h",
                  type: "Heading",
                  props: { text: "deep" },
                  style: {},
                },
              ],
            },
          ],
        },
      ],
    };
    expect(getTextBearingDescendants(tree).map((n) => n.id)).toEqual(["deep_h"]);
  });
});
