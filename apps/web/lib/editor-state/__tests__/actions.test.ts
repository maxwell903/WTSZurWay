import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import {
  applyAddComponentChild,
  applyAddPage,
  applyDeletePage,
  applyDissolveFlowGroup,
  applyMoveComponent,
  applyRemoveComponent,
  applyRenamePage,
  applyReorderChildren,
  applyReorderPages,
  applyResizeWithCascade,
  applySetComponentAnimation,
  applySetComponentDataBinding,
  applySetComponentDimension,
  applySetComponentProps,
  applySetComponentSpan,
  applySetComponentStyle,
  applySetComponentVisibility,
  applySetFontFamily,
  applySetPalette,
  applySetSiteName,
  applyWrapInFlowGroup,
  getMaxAllowedDimension,
} from "../actions";
import { EditorActionError } from "../types";

function makeFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "Test Site", siteSlug: "test-site" },
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
          id: "cmp_root_home",
          type: "Section",
          props: {},
          style: {},
          children: [],
        },
      },
    ],
    forms: [],
  };
}

describe("applyAddPage", () => {
  it("appends a new static page with an empty Section as rootComponent", () => {
    const next = applyAddPage(makeFixtureConfig(), {
      name: "Properties",
      slug: "properties",
      kind: "static",
    });
    expect(next.pages).toHaveLength(2);
    const added = next.pages[1];
    expect(added).toBeDefined();
    expect(added?.slug).toBe("properties");
    expect(added?.kind).toBe("static");
    expect(added?.detailDataSource).toBeUndefined();
    expect(added?.rootComponent.type).toBe("Section");
    expect(added?.rootComponent.children).toEqual([]);
  });

  it("appends a detail page with its detailDataSource", () => {
    const next = applyAddPage(makeFixtureConfig(), {
      name: "Unit Detail",
      slug: "units",
      kind: "detail",
      detailDataSource: "units",
    });
    const added = next.pages[1];
    expect(added?.kind).toBe("detail");
    expect(added?.detailDataSource).toBe("units");
  });

  it("rejects a detail page missing detailDataSource", () => {
    expect(() =>
      applyAddPage(makeFixtureConfig(), {
        name: "Unit Detail",
        slug: "units",
        kind: "detail",
      }),
    ).toThrow(EditorActionError);
  });

  it("rejects a same-kind same-slug duplicate", () => {
    const cfg = applyAddPage(makeFixtureConfig(), {
      name: "Properties",
      slug: "properties",
      kind: "static",
    });
    expect(() => applyAddPage(cfg, { name: "Dup", slug: "properties", kind: "static" })).toThrow(
      /static page already uses this slug/,
    );
  });

  it("allows the U2 cross-kind same-slug coexistence", () => {
    const cfg = applyAddPage(makeFixtureConfig(), {
      name: "Units",
      slug: "units",
      kind: "static",
    });
    const next = applyAddPage(cfg, {
      name: "Unit Detail",
      slug: "units",
      kind: "detail",
      detailDataSource: "units",
    });
    expect(next.pages).toHaveLength(3);
  });

  it("rejects an invalid slug (uppercase or whitespace)", () => {
    expect(() =>
      applyAddPage(makeFixtureConfig(), { name: "Bad", slug: "Bad Slug", kind: "static" }),
    ).toThrow(/lowercase letters, digits/);
  });

  it("rejects an empty name", () => {
    expect(() =>
      applyAddPage(makeFixtureConfig(), { name: "   ", slug: "ok", kind: "static" }),
    ).toThrow(/Name is required/);
  });
});

describe("applyDeletePage", () => {
  it("removes a non-home page", () => {
    const cfg = applyAddPage(makeFixtureConfig(), {
      name: "Properties",
      slug: "properties",
      kind: "static",
    });
    const next = applyDeletePage(cfg, "properties", "static");
    expect(next.pages.find((p) => p.slug === "properties")).toBeUndefined();
  });

  it("rejects deleting the home page", () => {
    expect(() => applyDeletePage(makeFixtureConfig(), "home", "static")).toThrow(
      /home page cannot be deleted/,
    );
  });

  it("throws page_not_found when slug+kind do not match a page", () => {
    expect(() => applyDeletePage(makeFixtureConfig(), "missing", "static")).toThrow(
      /Page does not exist/,
    );
  });
});

describe("applyRenamePage", () => {
  it("renames a non-home page (name + slug)", () => {
    const cfg = applyAddPage(makeFixtureConfig(), {
      name: "Properties",
      slug: "properties",
      kind: "static",
    });
    const next = applyRenamePage(cfg, {
      currentSlug: "properties",
      currentKind: "static",
      name: "Our Properties",
      slug: "our-properties",
    });
    const renamed = next.pages.find((p) => p.slug === "our-properties");
    expect(renamed?.name).toBe("Our Properties");
  });

  it("rejects renaming the home page slug", () => {
    expect(() =>
      applyRenamePage(makeFixtureConfig(), {
        currentSlug: "home",
        currentKind: "static",
        name: "Home",
        slug: "homepage",
      }),
    ).toThrow(/home page slug is fixed/);
  });

  it("allows renaming the home page's display name (slug unchanged)", () => {
    const next = applyRenamePage(makeFixtureConfig(), {
      currentSlug: "home",
      currentKind: "static",
      name: "Welcome",
      slug: "home",
    });
    expect(next.pages[0]?.name).toBe("Welcome");
  });
});

describe("applyReorderPages", () => {
  it("swaps a page with its neighbor", () => {
    let cfg = applyAddPage(makeFixtureConfig(), {
      name: "A",
      slug: "a",
      kind: "static",
    });
    cfg = applyAddPage(cfg, { name: "B", slug: "b", kind: "static" });
    const next = applyReorderPages(cfg, { slug: "b", kind: "static", direction: "up" });
    const slugs = next.pages.map((p) => p.slug);
    expect(slugs).toEqual(["home", "b", "a"]);
  });

  it("rejects moving the home page", () => {
    expect(() =>
      applyReorderPages(makeFixtureConfig(), {
        slug: "home",
        kind: "static",
        direction: "down",
      }),
    ).toThrow(/home page is locked/);
  });

  it("rejects moving a page above the home page", () => {
    const cfg = applyAddPage(makeFixtureConfig(), {
      name: "A",
      slug: "a",
      kind: "static",
    });
    expect(() => applyReorderPages(cfg, { slug: "a", kind: "static", direction: "up" })).toThrow(
      /home page must remain at the top/,
    );
  });
});

describe("site-level mutators", () => {
  it("setSiteName updates meta.siteName and trims", () => {
    const next = applySetSiteName(makeFixtureConfig(), "  Aurora  ");
    expect(next.meta.siteName).toBe("Aurora");
  });

  it("setPalette updates brand.palette", () => {
    const next = applySetPalette(makeFixtureConfig(), "forest");
    expect(next.brand.palette).toBe("forest");
  });

  it("setFontFamily updates brand.fontFamily", () => {
    const next = applySetFontFamily(makeFixtureConfig(), "Lora");
    expect(next.brand.fontFamily).toBe("Lora");
  });
});

// ---------------------------------------------------------------------------
// Sprint 8 -- component-level mutators
// ---------------------------------------------------------------------------

function makeNestedFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "Test Site", siteSlug: "test-site" },
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
              id: "cmp_row",
              type: "Row",
              props: {},
              style: {},
              children: [
                {
                  id: "cmp_col",
                  type: "Column",
                  props: {},
                  style: {},
                  children: [
                    {
                      id: "cmp_h1",
                      type: "Heading",
                      props: { text: "Hello", level: 1 },
                      style: {},
                      animation: { onEnter: "fadeIn", duration: 200 },
                      visibility: "always",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

function findById(node: ComponentNode | undefined, id: string): ComponentNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

describe("applySetComponentProps", () => {
  it("replaces props on the targeted node and preserves the rest", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentProps(cfg, "cmp_h1", { text: "Welcome", level: 2 });
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.props).toEqual({ text: "Welcome", level: 2 });
    expect(updated?.style).toEqual({});
    expect(updated?.animation).toEqual({ onEnter: "fadeIn", duration: 200 });
  });

  it("walks deeply nested trees and rebuilds only the changed path", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentProps(cfg, "cmp_h1", { text: "X" });
    const cfgPage = cfg.pages[0];
    const nextPage = next.pages[0];
    if (!cfgPage || !nextPage) throw new Error("missing page");
    expect(next).not.toBe(cfg);
    expect(nextPage).not.toBe(cfgPage);
    // The page-root identity changed because the path went through it.
    expect(nextPage.rootComponent).not.toBe(cfgPage.rootComponent);
    // The root's props/style/type are untouched object refs.
    expect(nextPage.rootComponent.props).toBe(cfgPage.rootComponent.props);
  });

  it("throws component_not_found for an unknown id", () => {
    expect(() => applySetComponentProps(makeNestedFixtureConfig(), "missing", {})).toThrow(
      EditorActionError,
    );
    expect(() => applySetComponentProps(makeNestedFixtureConfig(), "missing", {})).toThrow(
      /not found/,
    );
  });
});

describe("applySetComponentStyle", () => {
  it("replaces the style block on the targeted node", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentStyle(cfg, "cmp_h1", { textColor: "#ff0000" });
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.style).toEqual({ textColor: "#ff0000" });
  });

  it("clearing all style fields writes an empty object (style is non-optional)", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentStyle(cfg, "cmp_h1", {});
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.style).toEqual({});
  });

  it("throws component_not_found for an unknown id", () => {
    expect(() => applySetComponentStyle(makeNestedFixtureConfig(), "missing", {})).toThrow(
      EditorActionError,
    );
  });
});

describe("applySetComponentAnimation", () => {
  it("writes a sparse AnimationConfig", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentAnimation(cfg, "cmp_h1", {
      onEnter: "fadeInUp",
      duration: 300,
    });
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.animation).toEqual({ onEnter: "fadeInUp", duration: 300 });
  });

  it("clears the field entirely when passed undefined", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentAnimation(cfg, "cmp_h1", undefined);
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated).toBeDefined();
    expect("animation" in (updated as object)).toBe(false);
  });
});

describe("applySetComponentVisibility", () => {
  it("writes a visibility value", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentVisibility(cfg, "cmp_h1", "desktop");
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.visibility).toBe("desktop");
  });

  it("clears the field entirely when passed undefined", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentVisibility(cfg, "cmp_h1", undefined);
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated).toBeDefined();
    expect("visibility" in (updated as object)).toBe(false);
  });
});

describe("applySetComponentDataBinding", () => {
  it("writes a dataBinding value", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentDataBinding(cfg, "cmp_h1", {
      source: "units",
      sort: { field: "currentMarketRent", direction: "desc" },
      limit: 10,
    });
    const updated = findById(next.pages[0]?.rootComponent, "cmp_h1");
    expect(updated?.dataBinding?.source).toBe("units");
    expect(updated?.dataBinding?.limit).toBe(10);
  });

  it("clears the field entirely when passed undefined", () => {
    const cfg = makeNestedFixtureConfig();
    const seeded = applySetComponentDataBinding(cfg, "cmp_h1", { source: "company" });
    const cleared = applySetComponentDataBinding(seeded, "cmp_h1", undefined);
    const updated = findById(cleared.pages[0]?.rootComponent, "cmp_h1");
    expect(updated).toBeDefined();
    expect("dataBinding" in (updated as object)).toBe(false);
  });

  it("throws when the target id does not exist", () => {
    expect(() =>
      applySetComponentDataBinding(makeNestedFixtureConfig(), "missing-id", { source: "units" }),
    ).toThrow();
  });
});

describe("applyRemoveComponent", () => {
  it("removes a leaf node from its parent's children array", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applyRemoveComponent(cfg, "cmp_h1");
    const col = findById(next.pages[0]?.rootComponent, "cmp_col");
    expect(col?.children).toEqual([]);
    // The removed id is gone from the whole tree.
    expect(findById(next.pages[0]?.rootComponent, "cmp_h1")).toBeNull();
  });

  it("removes an interior node and its descendants in one shot", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applyRemoveComponent(cfg, "cmp_row");
    const root = next.pages[0]?.rootComponent;
    expect(root).toBeDefined();
    expect(root?.children).toEqual([]);
    expect(findById(root, "cmp_h1")).toBeNull();
  });

  it("throws page_root_locked when the id is a page's rootComponent", () => {
    expect(() => applyRemoveComponent(makeNestedFixtureConfig(), "cmp_root")).toThrow(
      /page root cannot be deleted/,
    );
  });

  it("throws component_not_found for an unknown id", () => {
    expect(() => applyRemoveComponent(makeNestedFixtureConfig(), "missing")).toThrow(
      EditorActionError,
    );
    expect(() => applyRemoveComponent(makeNestedFixtureConfig(), "missing")).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// Sprint 7 -- drag-and-drop and resize tree mutators
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  type: ComponentNode["type"],
  children?: ComponentNode[],
): ComponentNode {
  const n: ComponentNode = { id, type, props: {}, style: {} };
  if (children !== undefined) n.children = children;
  return n;
}

function makeMultiSectionFixture(): SiteConfig {
  return {
    meta: { siteName: "Test Site", siteSlug: "test-site" },
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
        rootComponent: makeNode("cmp_root", "Section", [
          makeNode("cmp_secA", "Section", [
            makeNode("cmp_h1", "Heading"),
            makeNode("cmp_h2", "Heading"),
          ]),
          makeNode("cmp_secB", "Section", []),
          makeNode("cmp_repA", "Repeater", []),
          makeNode("cmp_repB", "Repeater", [makeNode("cmp_unit", "UnitCard")]),
          makeNode("cmp_img", "Image"),
        ]),
      },
    ],
    forms: [],
  };
}

describe("applyAddComponentChild", () => {
  it("inserts at index 0 of an empty Section", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Heading");
    const next = applyAddComponentChild(cfg, "cmp_secB", 0, newNode);
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secB");
    expect(sec?.children).toEqual([newNode]);
  });

  it("appends at the end of a non-empty Section when index >= length", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Paragraph");
    const next = applyAddComponentChild(cfg, "cmp_secA", 99, newNode);
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.children?.[sec.children.length - 1]?.id).toBe("cmp_new");
  });

  it("inserts in the middle, between existing siblings", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Paragraph");
    const next = applyAddComponentChild(cfg, "cmp_secA", 1, newNode);
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.children?.map((c) => c.id)).toEqual(["cmp_h1", "cmp_new", "cmp_h2"]);
  });

  it("rejects a drop onto a none-policy parent (Image)", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Heading");
    expect(() => applyAddComponentChild(cfg, "cmp_img", 0, newNode)).toThrow(/cannot accept/);
  });

  it("accepts a drop onto a one-policy Repeater that is empty", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "PropertyCard");
    const next = applyAddComponentChild(cfg, "cmp_repA", 0, newNode);
    const rep = findById(next.pages[0]?.rootComponent, "cmp_repA");
    expect(rep?.children).toEqual([newNode]);
  });

  it("rejects a drop onto a one-policy Repeater that already has a child", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "PropertyCard");
    expect(() => applyAddComponentChild(cfg, "cmp_repB", 0, newNode)).toThrow(/cannot accept/);
  });

  it("throws component_not_found for an unknown parentId", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Heading");
    expect(() => applyAddComponentChild(cfg, "cmp_missing", 0, newNode)).toThrow(EditorActionError);
  });

  it("inserts at a deep-nested location (3 levels deep)", () => {
    const cfg = makeNestedFixtureConfig();
    const newNode = makeNode("cmp_new", "Paragraph");
    const next = applyAddComponentChild(cfg, "cmp_col", 0, newNode);
    const col = findById(next.pages[0]?.rootComponent, "cmp_col");
    expect(col?.children?.[0]?.id).toBe("cmp_new");
  });

  it("throws invalid_drop_target with code 'invalid_drop_target'", () => {
    const cfg = makeMultiSectionFixture();
    const newNode = makeNode("cmp_new", "Heading");
    try {
      applyAddComponentChild(cfg, "cmp_img", 0, newNode);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EditorActionError);
      expect((err as EditorActionError).code).toBe("invalid_drop_target");
    }
  });
});

describe("applyMoveComponent", () => {
  it("moves a node from one Section to another (cross-parent)", () => {
    const cfg = makeMultiSectionFixture();
    const next = applyMoveComponent(cfg, "cmp_h1", "cmp_secB", 0);
    const secA = findById(next.pages[0]?.rootComponent, "cmp_secA");
    const secB = findById(next.pages[0]?.rootComponent, "cmp_secB");
    expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2"]);
    expect(secB?.children?.map((c) => c.id)).toEqual(["cmp_h1"]);
  });

  it("moves a node within the same parent (reorder via remove+insert)", () => {
    const cfg = makeMultiSectionFixture();
    const next = applyMoveComponent(cfg, "cmp_h1", "cmp_secA", 1);
    const secA = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2", "cmp_h1"]);
  });

  it("throws page_root_locked when targetId is a page root", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyMoveComponent(cfg, "cmp_root", "cmp_secA", 0)).toThrow(
      /page root cannot be moved/,
    );
  });

  it("throws invalid_drop_target when moving a node into itself", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyMoveComponent(cfg, "cmp_secA", "cmp_secA", 0)).toThrow(/own descendants/);
  });

  it("throws invalid_drop_target when moving a node into one of its descendants", () => {
    const cfg = makeNestedFixtureConfig();
    expect(() => applyMoveComponent(cfg, "cmp_row", "cmp_col", 0)).toThrow(/own descendants/);
  });

  it("throws component_not_found for an unknown targetId", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyMoveComponent(cfg, "cmp_missing", "cmp_secA", 0)).toThrow(EditorActionError);
  });

  it("throws component_not_found for an unknown new parentId", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyMoveComponent(cfg, "cmp_h1", "cmp_missing", 0)).toThrow(EditorActionError);
  });

  it("rejects moving a node into a none-policy parent (Image)", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyMoveComponent(cfg, "cmp_h1", "cmp_img", 0)).toThrow(/cannot accept/);
  });

  it("preserves the moved node's identity (object ref) and any descendant subtree", () => {
    const cfg = makeMultiSectionFixture();
    const next = applyMoveComponent(cfg, "cmp_secA", "cmp_secB", 0);
    const movedSec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(movedSec?.children?.map((c) => c.id)).toEqual(["cmp_h1", "cmp_h2"]);
  });
});

describe("applyReorderChildren", () => {
  it("reorders children to a valid permutation", () => {
    const cfg = makeMultiSectionFixture();
    const next = applyReorderChildren(cfg, "cmp_secA", ["cmp_h2", "cmp_h1"]);
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.children?.map((c) => c.id)).toEqual(["cmp_h2", "cmp_h1"]);
  });

  it("throws reorder_mismatch when newOrder length differs from current children", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyReorderChildren(cfg, "cmp_secA", ["cmp_h1"])).toThrow(/Reorder list length/);
  });

  it("throws reorder_mismatch when newOrder contains an unknown id", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyReorderChildren(cfg, "cmp_secA", ["cmp_h1", "cmp_foreign"])).toThrow(
      /unknown id/,
    );
  });

  it("throws reorder_mismatch when newOrder contains duplicate ids", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyReorderChildren(cfg, "cmp_secA", ["cmp_h1", "cmp_h1"])).toThrow(
      /duplicate id/,
    );
  });

  it("throws component_not_found for an unknown parentId", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applyReorderChildren(cfg, "cmp_missing", [])).toThrow(EditorActionError);
  });
});

describe("applySetComponentSpan", () => {
  it("writes the span into a Column's props.span", () => {
    const cfg = makeNestedFixtureConfig();
    const next = applySetComponentSpan(cfg, "cmp_col", 6);
    const col = findById(next.pages[0]?.rootComponent, "cmp_col");
    expect(col?.props.span).toBe(6);
  });

  it("preserves other Column props alongside the new span", () => {
    const cfg = makeNestedFixtureConfig();
    const cfg2 = applySetComponentProps(cfg, "cmp_col", { gap: 8, alignItems: "stretch" });
    const next = applySetComponentSpan(cfg2, "cmp_col", 4);
    const col = findById(next.pages[0]?.rootComponent, "cmp_col");
    expect(col?.props).toEqual({ gap: 8, alignItems: "stretch", span: 4 });
  });

  it("throws invalid_resize_target when target is not a Column", () => {
    const cfg = makeNestedFixtureConfig();
    try {
      applySetComponentSpan(cfg, "cmp_h1", 6);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EditorActionError);
      expect((err as EditorActionError).code).toBe("invalid_resize_target");
    }
  });

  it("throws component_not_found for an unknown id", () => {
    expect(() => applySetComponentSpan(makeNestedFixtureConfig(), "missing", 4)).toThrow(
      EditorActionError,
    );
  });
});

describe("applySetComponentDimension", () => {
  it("writes style.height for a Section", () => {
    const cfg = makeMultiSectionFixture();
    const next = applySetComponentDimension(cfg, "cmp_secA", "height", "320px");
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.style.height).toBe("320px");
  });

  it("writes style.width", () => {
    const cfg = makeMultiSectionFixture();
    const next = applySetComponentDimension(cfg, "cmp_secA", "width", "640px");
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.style.width).toBe("640px");
  });

  it("clears the field when value is undefined (revert to auto)", () => {
    const cfg = makeMultiSectionFixture();
    const cfg2 = applySetComponentDimension(cfg, "cmp_secA", "height", "320px");
    const next = applySetComponentDimension(cfg2, "cmp_secA", "height", undefined);
    const sec = findById(next.pages[0]?.rootComponent, "cmp_secA");
    expect(sec?.style.height).toBeUndefined();
  });

  it("throws invalid_resize_target on Spacer (height belongs in props, not style)", () => {
    const cfg: SiteConfig = {
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
          rootComponent: makeNode("cmp_root", "Section", [makeNode("cmp_sp", "Spacer")]),
        },
      ],
      forms: [],
    };
    try {
      applySetComponentDimension(cfg, "cmp_sp", "height", "80px");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EditorActionError);
      expect((err as EditorActionError).code).toBe("invalid_resize_target");
    }
  });

  it("throws component_not_found for an unknown id", () => {
    const cfg = makeMultiSectionFixture();
    expect(() => applySetComponentDimension(cfg, "missing", "height", "1px")).toThrow(
      EditorActionError,
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 3 Task 3.1 -- getMaxAllowedDimension read helper
// ---------------------------------------------------------------------------

describe("getMaxAllowedDimension", () => {
  function makeConfigWithRoot(rootChildren: ComponentNode[]): SiteConfig {
    const base = makeFixtureConfig();
    const firstPage = base.pages[0];
    if (!firstPage) throw new Error("fixture missing first page");
    return {
      ...base,
      pages: [
        {
          ...firstPage,
          rootComponent: {
            id: "cmp_root",
            type: "Section",
            props: {},
            style: {},
            children: rootChildren,
          },
        },
      ],
    };
  }

  it("returns parent width minus sibling widths when querying a sibling cap", () => {
    const config = makeConfigWithRoot([
      { id: "h1", type: "Heading", props: {}, style: { width: "60%" } },
      { id: "h2", type: "Heading", props: {}, style: {} },
    ]);
    expect(getMaxAllowedDimension(config, "h2", "width")).toBe(40);
  });

  it("returns 100% when the candidate is the only child", () => {
    const config = makeConfigWithRoot([{ id: "only", type: "Heading", props: {}, style: {} }]);
    expect(getMaxAllowedDimension(config, "only", "width")).toBe(100);
  });

  it("returns null when the component is not found", () => {
    const config = makeConfigWithRoot([]);
    expect(getMaxAllowedDimension(config, "nope", "width")).toBeNull();
  });

  it("returns null for the height axis (not bounded by sibling stack)", () => {
    const config = makeConfigWithRoot([{ id: "h1", type: "Heading", props: {}, style: {} }]);
    expect(getMaxAllowedDimension(config, "h1", "height")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 3 Task 3.2 -- applyResizeWithCascade write helper
// ---------------------------------------------------------------------------

describe("applyResizeWithCascade", () => {
  // Builds: root Section > "p" Section (style.width = parentWidth) > children
  function makeWithParent(parentChildren: ComponentNode[], parentWidth: string): SiteConfig {
    const base = makeFixtureConfig();
    const firstPage = base.pages[0];
    if (!firstPage) throw new Error("fixture missing first page");
    return {
      ...base,
      pages: [
        {
          ...firstPage,
          rootComponent: {
            id: "cmp_root",
            type: "Section",
            props: {},
            style: {},
            children: [
              {
                id: "p",
                type: "Section",
                props: {},
                style: { width: parentWidth },
                children: parentChildren,
              },
            ],
          },
        },
      ],
    };
  }

  it("proportionally rescales 60/40 % siblings when parent shrinks (no JSON change for % children)", () => {
    const config = makeWithParent(
      [
        { id: "a", type: "Section", props: {}, style: { width: "60%" }, children: [] },
        { id: "b", type: "Section", props: {}, style: { width: "40%" }, children: [] },
      ],
      "600px",
    );
    const next = applyResizeWithCascade(config, "p", "width", "400px");
    const p = next.pages[0]?.rootComponent.children?.[0];
    const a = p?.children?.[0];
    const b = p?.children?.[1];
    expect(p?.style.width).toBe("400px");
    expect(a?.style.width).toBe("60%");
    expect(b?.style.width).toBe("40%");
  });

  it("clamps an oversized px-leaf child to the new parent width", () => {
    const config = makeWithParent(
      [{ id: "h", type: "Heading", props: {}, style: { width: "500px" } }],
      "600px",
    );
    const next = applyResizeWithCascade(config, "p", "width", "400px");
    const p = next.pages[0]?.rootComponent.children?.[0];
    const h = p?.children?.[0];
    expect(p?.style.width).toBe("400px");
    expect(h?.style.width).toBe("400px");
  });

  it("is a no-op when the parent grows", () => {
    const config = makeWithParent(
      [{ id: "h", type: "Heading", props: {}, style: { width: "200px" } }],
      "400px",
    );
    const next = applyResizeWithCascade(config, "p", "width", "800px");
    const p = next.pages[0]?.rootComponent.children?.[0];
    const h = p?.children?.[0];
    expect(p?.style.width).toBe("800px");
    expect(h?.style.width).toBe("200px");
  });

  it("is a no-op for children when the parent's new width is a percent (no px math possible)", () => {
    const config = makeWithParent(
      [{ id: "h", type: "Heading", props: {}, style: { width: "500px" } }],
      "600px",
    );
    const next = applyResizeWithCascade(config, "p", "width", "50%");
    const p = next.pages[0]?.rootComponent.children?.[0];
    const h = p?.children?.[0];
    expect(p?.style.width).toBe("50%");
    expect(h?.style.width).toBe("500px");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 Task 5.2 -- applyWrapInFlowGroup and applyDissolveFlowGroup
// ---------------------------------------------------------------------------

describe("applyWrapInFlowGroup", () => {
  function makeRootWith(rootChildren: ComponentNode[]): SiteConfig {
    const base = makeFixtureConfig();
    const firstPage = base.pages[0];
    if (!firstPage) throw new Error("fixture missing first page");
    return {
      ...base,
      pages: [
        {
          ...firstPage,
          rootComponent: {
            id: "cmp_root",
            type: "Section",
            props: {},
            style: {},
            children: rootChildren,
          },
        },
      ],
    };
  }

  it("wraps target + new sibling in a FlowGroup at the target's index (right side)", () => {
    const config = makeRootWith([
      { id: "a", type: "Section", props: {}, style: {}, children: [] },
      { id: "b", type: "Section", props: {}, style: {}, children: [] },
    ]);
    const newNode: ComponentNode = { id: "n", type: "Heading", props: {}, style: {} };
    const next = applyWrapInFlowGroup(config, "a", newNode, "right");
    const root = next.pages[0]?.rootComponent;
    expect(root?.children).toHaveLength(2); // FlowGroup + section "b"
    const fg = root?.children?.[0];
    expect(fg?.type).toBe("FlowGroup");
    expect(fg?.children?.map((c: ComponentNode) => c.id)).toEqual(["a", "n"]);
    // Existing siblings preserved.
    expect(root?.children?.[1]?.id).toBe("b");
  });

  it("inserts on the LEFT side correctly", () => {
    const config = makeRootWith([
      { id: "a", type: "Section", props: {}, style: {}, children: [] },
    ]);
    const next = applyWrapInFlowGroup(
      config,
      "a",
      { id: "n", type: "Heading", props: {}, style: {} },
      "left",
    );
    const fg = next.pages[0]?.rootComponent.children?.[0];
    expect(fg?.type).toBe("FlowGroup");
    expect(fg?.children?.map((c: ComponentNode) => c.id)).toEqual(["n", "a"]);
  });

  it("inserts as a sibling INSIDE an existing FlowGroup parent (no double-wrap)", () => {
    const config = makeRootWith([
      {
        id: "fg",
        type: "FlowGroup",
        props: {},
        style: {},
        children: [
          { id: "a", type: "Section", props: {}, style: {}, children: [] },
          { id: "b", type: "Section", props: {}, style: {}, children: [] },
        ],
      },
    ]);
    const newNode: ComponentNode = { id: "n", type: "Heading", props: {}, style: {} };
    const next = applyWrapInFlowGroup(config, "a", newNode, "right");
    const root = next.pages[0]?.rootComponent;
    // Still ONE FlowGroup at the root (no double-wrap).
    expect(root?.children).toHaveLength(1);
    const fg = root?.children?.[0];
    expect(fg?.type).toBe("FlowGroup");
    expect(fg?.children?.map((c: ComponentNode) => c.id)).toEqual(["a", "n", "b"]);
  });

  it("throws for top/bottom (those are vertical neighbours, not FlowGroup wraps)", () => {
    const config = makeRootWith([
      { id: "a", type: "Section", props: {}, style: {}, children: [] },
    ]);
    expect(() =>
      applyWrapInFlowGroup(
        config,
        "a",
        { id: "n", type: "Heading", props: {}, style: {} },
        "top",
      ),
    ).toThrow();
  });

  it("throws when target is not found", () => {
    const config = makeRootWith([]);
    expect(() =>
      applyWrapInFlowGroup(
        config,
        "missing",
        { id: "n", type: "Heading", props: {}, style: {} },
        "right",
      ),
    ).toThrow();
  });
});

describe("applyDissolveFlowGroup", () => {
  function makeRootWith(rootChildren: ComponentNode[]): SiteConfig {
    const base = makeFixtureConfig();
    const firstPage = base.pages[0];
    if (!firstPage) throw new Error("fixture missing first page");
    return {
      ...base,
      pages: [
        {
          ...firstPage,
          rootComponent: {
            id: "cmp_root",
            type: "Section",
            props: {},
            style: {},
            children: rootChildren,
          },
        },
      ],
    };
  }

  it("removes a 1-child FlowGroup and reparents the survivor at the FlowGroup's index", () => {
    const config = makeRootWith([
      {
        id: "fg",
        type: "FlowGroup",
        props: {},
        style: {},
        children: [{ id: "a", type: "Section", props: {}, style: {}, children: [] }],
      },
      { id: "b", type: "Section", props: {}, style: {}, children: [] },
    ]);
    const next = applyDissolveFlowGroup(config, "fg");
    const root = next.pages[0]?.rootComponent;
    expect(root?.children?.map((c: ComponentNode) => c.id)).toEqual(["a", "b"]);
  });

  it("removes a 0-child FlowGroup entirely", () => {
    const config = makeRootWith([
      { id: "fg", type: "FlowGroup", props: {}, style: {}, children: [] },
      { id: "b", type: "Section", props: {}, style: {}, children: [] },
    ]);
    const next = applyDissolveFlowGroup(config, "fg");
    const root = next.pages[0]?.rootComponent;
    expect(root?.children?.map((c: ComponentNode) => c.id)).toEqual(["b"]);
  });

  it("is a no-op for a multi-child FlowGroup", () => {
    const config = makeRootWith([
      {
        id: "fg",
        type: "FlowGroup",
        props: {},
        style: {},
        children: [
          { id: "a", type: "Section", props: {}, style: {}, children: [] },
          { id: "b", type: "Section", props: {}, style: {}, children: [] },
        ],
      },
    ]);
    const next = applyDissolveFlowGroup(config, "fg");
    expect(next).toBe(config); // structural sharing — same reference
  });

  it("is a no-op when the FlowGroup is not found", () => {
    const config = makeRootWith([]);
    const next = applyDissolveFlowGroup(config, "missing");
    expect(next).toBe(config);
  });

  it("is a no-op when the id refers to a non-FlowGroup node", () => {
    const config = makeRootWith([{ id: "h", type: "Heading", props: {}, style: {} }]);
    const next = applyDissolveFlowGroup(config, "h");
    expect(next).toBe(config);
  });
});
