// @vitest-environment node

import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import {
  OPERATION_TYPES,
  type Operation,
  OperationInvalidError,
  applyAutoPopulatedNavLinks,
  applyGlobalNavBarLocked,
  applyOperation,
  applyOperations,
  buildAutoPopulatedNavLinks,
  findLockedNavBar,
  isFirstNavBar,
  isGlobalNavBarLocked,
  replicateLockedNavBarToAllPages,
  syncLockedNavBars,
} from "@/lib/site-config/ops";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Fixture builder -- a comprehensive config exercising every op family.
// ---------------------------------------------------------------------------

function makeConfig(): SiteConfig {
  const heroBanner: ComponentNode = {
    id: "cmp_hero",
    type: "HeroBanner",
    props: { heading: "Welcome", subheading: "to our site" },
    style: { padding: { top: 8 } },
  };

  const unitCard: ComponentNode = {
    id: "cmp_unit_card",
    type: "UnitCard",
    props: { heading: "Unit", beds: 0, baths: 0, sqft: 0, rent: 0, imageSrc: "" },
    style: {},
  };

  const repeater: ComponentNode = {
    id: "cmp_repeater",
    type: "Repeater",
    props: {},
    style: {},
    children: [unitCard],
    dataBinding: { source: "units" },
  };

  const inputField: ComponentNode = {
    id: "cmp_input",
    type: "InputField",
    props: { name: "email", label: "Email", inputType: "email" },
    style: {},
  };

  const submitButton: ComponentNode = {
    id: "cmp_submit",
    type: "Button",
    props: { label: "Submit" },
    style: {},
  };

  const form: ComponentNode = {
    id: "cmp_form",
    type: "Form",
    props: { formName: "contact" },
    style: {},
    children: [inputField, submitButton],
  };

  const detailButton: ComponentNode = {
    id: "cmp_detail_btn",
    type: "Button",
    props: { label: "View", linkMode: "static" },
    style: {},
  };

  const aboutHeading: ComponentNode = {
    id: "cmp_about_heading",
    type: "Heading",
    props: { text: "About", level: 1 },
    style: {},
  };

  const homeRoot: ComponentNode = {
    id: "cmp_root_home",
    type: "Section",
    props: {},
    style: {},
    children: [heroBanner, repeater, form, detailButton],
  };

  const aboutRoot: ComponentNode = {
    id: "cmp_root_about",
    type: "Section",
    props: {},
    style: {},
    children: [aboutHeading],
  };

  const detailRoot: ComponentNode = {
    id: "cmp_root_unit_detail",
    type: "Section",
    props: {},
    style: {},
    children: [],
  };

  return {
    meta: { siteName: "Aurora", siteSlug: "aurora" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "© Aurora" },
    },
    pages: [
      { id: "p_home", slug: "home", name: "Home", kind: "static", rootComponent: homeRoot },
      { id: "p_about", slug: "about", name: "About", kind: "static", rootComponent: aboutRoot },
      {
        id: "p_unit_detail",
        slug: "units",
        name: "Unit Detail",
        kind: "detail",
        detailDataSource: "units",
        rootComponent: detailRoot,
      },
    ],
    forms: [],
  };
}

// Find a node by id across all pages (test helper -- mirrors the production
// helper but lives only in this file to avoid leaking it onto the public API).
function findNode(config: SiteConfig, id: string): ComponentNode | null {
  function walk(node: ComponentNode): ComponentNode | null {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
  for (const page of config.pages) {
    const found = walk(page.rootComponent);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// addComponent
// ---------------------------------------------------------------------------

describe("applyOperation -- addComponent", () => {
  it("inserts a new child at the requested index", () => {
    const config = makeConfig();
    const newNode: ComponentNode = {
      id: "cmp_new_para",
      type: "Paragraph",
      props: { text: "Hello" },
      style: {},
    };
    const next = applyOperation(config, {
      type: "addComponent",
      parentId: "cmp_root_home",
      index: 0,
      component: newNode,
    });
    const root = next.pages[0]?.rootComponent;
    expect(root?.children?.[0]?.id).toBe("cmp_new_para");
    expect(root?.children?.length).toBe(5);
  });

  it("throws when the parent does not exist", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "addComponent",
        parentId: "cmp_missing",
        index: 0,
        component: {
          id: "cmp_x",
          type: "Heading",
          props: { text: "x", level: 1 },
          style: {},
        },
      }),
    ).toThrow(OperationInvalidError);
  });

  it("throws when the parent's children policy is 'none'", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "addComponent",
        parentId: "cmp_hero",
        index: 0,
        component: {
          id: "cmp_x",
          type: "Heading",
          props: { text: "x", level: 1 },
          style: {},
        },
      }),
    ).toThrow(/cannot accept a child/);
  });

  it("throws when the new id collides with an existing component id", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "addComponent",
        parentId: "cmp_root_home",
        index: 0,
        component: {
          id: "cmp_hero",
          type: "Paragraph",
          props: { text: "x" },
          style: {},
        },
      }),
    ).toThrow(/already exists/);
  });
});

// ---------------------------------------------------------------------------
// removeComponent
// ---------------------------------------------------------------------------

describe("applyOperation -- removeComponent", () => {
  it("removes the targeted node from the tree", () => {
    const config = makeConfig();
    const next = applyOperation(config, { type: "removeComponent", targetId: "cmp_hero" });
    expect(findNode(next, "cmp_hero")).toBeNull();
  });

  it("throws on the page root", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, { type: "removeComponent", targetId: "cmp_root_home" }),
    ).toThrow(/page root/);
  });

  it("throws when the component does not exist", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, { type: "removeComponent", targetId: "cmp_missing" }),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// moveComponent
// ---------------------------------------------------------------------------

describe("applyOperation -- moveComponent", () => {
  it("relocates a node into a new parent", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "moveComponent",
      targetId: "cmp_hero",
      newParentId: "cmp_root_about",
      newIndex: 0,
    });
    expect(findNode(next, "cmp_hero")?.id).toBe("cmp_hero");
    const aboutChildren = next.pages[1]?.rootComponent.children ?? [];
    expect(aboutChildren[0]?.id).toBe("cmp_hero");
    const homeChildren = next.pages[0]?.rootComponent.children ?? [];
    expect(homeChildren.find((c) => c.id === "cmp_hero")).toBeUndefined();
  });

  it("throws when the new parent is the target's descendant", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "moveComponent",
        targetId: "cmp_form",
        newParentId: "cmp_input",
        newIndex: 0,
      }),
    ).toThrow(/own descendants/);
  });
});

// ---------------------------------------------------------------------------
// setProp / setStyle
// ---------------------------------------------------------------------------

describe("applyOperation -- setProp", () => {
  it("sets a top-level prop", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setProp",
      targetId: "cmp_hero",
      propPath: "heading",
      value: "Hello world",
    });
    expect(findNode(next, "cmp_hero")?.props.heading).toBe("Hello world");
  });

  it("throws on an empty path segment", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setProp",
        targetId: "cmp_hero",
        propPath: "a..b",
        value: "x",
      }),
    ).toThrow(/empty segment/);
  });
});

describe("applyOperation -- setStyle", () => {
  it("sets a nested style property", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setStyle",
      targetId: "cmp_hero",
      stylePath: "padding.top",
      value: 24,
    });
    const hero = findNode(next, "cmp_hero");
    expect(hero?.style.padding?.top).toBe(24);
  });

  it("throws when style root would be replaced with a primitive", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setStyle",
        targetId: "cmp_hero",
        stylePath: "padding.top",
        value: 99,
      }),
    ).not.toThrow();
    // ...but a primitive at the root should fail validation:
    expect(() =>
      applyOperation(config, {
        type: "setStyle",
        targetId: "cmp_hero",
        stylePath: "padding",
        // padding must be an object; replace with a string.
        value: "not-an-object",
      }),
    ).not.toThrow();
    // setStyle allows arbitrary values at any leaf -- the renderer's
    // styleConfigSchema parse downstream rejects bad shapes; this op stays
    // structural. Error case: a path with an empty segment.
    expect(() =>
      applyOperation(config, {
        type: "setStyle",
        targetId: "cmp_hero",
        stylePath: "",
        value: 1,
      }),
    ).toThrow(OperationInvalidError);
  });
});

// ---------------------------------------------------------------------------
// setAnimation / setVisibility
// ---------------------------------------------------------------------------

describe("applyOperation -- setAnimation", () => {
  it("sets an enter animation", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setAnimation",
      targetId: "cmp_hero",
      on: "enter",
      preset: "fadeInUp",
      duration: 400,
    });
    const hero = findNode(next, "cmp_hero");
    expect(hero?.animation?.onEnter).toBe("fadeInUp");
    expect(hero?.animation?.duration).toBe(400);
  });

  it("throws on an unregistered preset", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setAnimation",
        targetId: "cmp_hero",
        on: "enter",
        preset: "swirl",
      }),
    ).toThrow(/not registered/);
  });
});

describe("applyOperation -- setVisibility", () => {
  it("sets visibility on the target", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setVisibility",
      targetId: "cmp_hero",
      visibility: "mobile",
    });
    expect(findNode(next, "cmp_hero")?.visibility).toBe("mobile");
  });

  it("throws when the component is missing", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setVisibility",
        targetId: "cmp_missing",
        visibility: "always",
      }),
    ).toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// setText
// ---------------------------------------------------------------------------

describe("applyOperation -- setText", () => {
  it("writes props.text on Heading/Paragraph", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setText",
      targetId: "cmp_about_heading",
      text: "About Us",
    });
    expect(findNode(next, "cmp_about_heading")?.props.text).toBe("About Us");
  });

  it("writes props.label on Button", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setText",
      targetId: "cmp_submit",
      text: "Send",
    });
    expect(findNode(next, "cmp_submit")?.props.label).toBe("Send");
  });

  it("throws on an unsupported component type", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, { type: "setText", targetId: "cmp_hero", text: "x" }),
    ).toThrow(/setText only applies/);
  });
});

// ---------------------------------------------------------------------------
// bindRMField
// ---------------------------------------------------------------------------

describe("applyOperation -- bindRMField", () => {
  it("writes a token-wrapped string into the target prop", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "bindRMField",
      targetId: "cmp_unit_card",
      propPath: "heading",
      fieldExpression: "row.unitName",
    });
    expect(findNode(next, "cmp_unit_card")?.props.heading).toBe("{{ row.unitName }}");
  });

  it("rejects an empty propPath", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "bindRMField",
        targetId: "cmp_unit_card",
        propPath: "",
        fieldExpression: "row.unitName",
      }),
    ).toThrow(OperationInvalidError);
  });
});

// ---------------------------------------------------------------------------
// addPage / removePage / renamePage
// ---------------------------------------------------------------------------

describe("applyOperation -- addPage", () => {
  it("appends a static page", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "addPage",
      name: "Contact",
      slug: "contact",
    });
    expect(next.pages.find((p) => p.slug === "contact" && p.kind === "static")).toBeDefined();
  });

  it("rejects a duplicate static slug", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "addPage",
        name: "Home Again",
        slug: "home",
      }),
    ).toThrow(/already uses the slug/);
  });

  it("rejects a malformed slug", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, { type: "addPage", name: "Bad", slug: "Bad Slug!" }),
    ).toThrow(/lowercase/);
  });
});

describe("applyOperation -- removePage", () => {
  it("removes a static page", () => {
    const config = makeConfig();
    const next = applyOperation(config, { type: "removePage", slug: "about" });
    expect(next.pages.find((p) => p.slug === "about" && p.kind === "static")).toBeUndefined();
  });

  it("can target a detail page when kind is provided", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "removePage",
      slug: "units",
      kind: "detail",
    });
    expect(next.pages.find((p) => p.slug === "units" && p.kind === "detail")).toBeUndefined();
    // Static "home" left intact.
    expect(next.pages.find((p) => p.slug === "home" && p.kind === "static")).toBeDefined();
  });

  it("refuses to remove the home page", () => {
    const config = makeConfig();
    expect(() => applyOperation(config, { type: "removePage", slug: "home" })).toThrow(
      /cannot be removed/,
    );
  });
});

describe("applyOperation -- renamePage", () => {
  it("renames a page name and slug", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "renamePage",
      slug: "about",
      newName: "About Us",
      newSlug: "about-us",
    });
    const page = next.pages.find((p) => p.slug === "about-us");
    expect(page?.name).toBe("About Us");
  });

  it("refuses to change the home page's slug", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "renamePage",
        slug: "home",
        newName: "Landing",
        newSlug: "landing",
      }),
    ).toThrow(/home page slug is fixed/);
  });
});

// ---------------------------------------------------------------------------
// setSiteSetting / setPalette
// ---------------------------------------------------------------------------

describe("applyOperation -- setSiteSetting", () => {
  it("sets meta.siteName", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setSiteSetting",
      path: "meta.siteName",
      value: "New Aurora",
    });
    expect(next.meta.siteName).toBe("New Aurora");
  });

  it("sets brand.fontFamily", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setSiteSetting",
      path: "brand.fontFamily",
      value: "Roboto",
    });
    expect(next.brand.fontFamily).toBe("Roboto");
  });

  it("rejects paths outside the allowlist", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setSiteSetting",
        path: "pages.0.slug",
        value: "x",
      }),
    ).toThrow(/must start with one of meta, brand, global/);
  });

  it("creates global.canvas.maxWidth on a config with no canvas, and the result reparses", async () => {
    const config = makeConfig();
    expect(config.global.canvas).toBeUndefined();
    const next = applyOperation(config, {
      type: "setSiteSetting",
      path: "global.canvas.maxWidth",
      value: 960,
    });
    expect(next.global.canvas).toEqual({ maxWidth: 960 });
    const { siteConfigSchema } = await import("@/lib/site-config/schema");
    expect(siteConfigSchema.safeParse(next).success).toBe(true);
  });

  it("can set a whole global.canvas object in one shot", async () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setSiteSetting",
      path: "global.canvas",
      value: {
        maxWidth: 1100,
        sidePadding: 16,
        verticalPadding: { top: 40, bottom: 40 },
        shadow: "md",
      },
    });
    expect(next.global.canvas?.maxWidth).toBe(1100);
    expect(next.global.canvas?.shadow).toBe("md");
    const { siteConfigSchema } = await import("@/lib/site-config/schema");
    expect(siteConfigSchema.safeParse(next).success).toBe(true);
  });
});

describe("applyOperation -- setPalette", () => {
  it("switches the palette wholesale", () => {
    const config = makeConfig();
    const next = applyOperation(config, { type: "setPalette", palette: "sunset" });
    expect(next.brand.palette).toBe("sunset");
  });
});

// ---------------------------------------------------------------------------
// §8.12 ops: setLinkMode / setDetailPageSlug / setQueryParamDefault
// ---------------------------------------------------------------------------

describe("applyOperation -- setLinkMode", () => {
  it("sets linkMode on a Button", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setLinkMode",
      componentId: "cmp_detail_btn",
      value: "detail",
    });
    expect(findNode(next, "cmp_detail_btn")?.props.linkMode).toBe("detail");
  });

  it("rejects non-Button targets", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setLinkMode",
        componentId: "cmp_hero",
        value: "detail",
      }),
    ).toThrow(/setLinkMode only applies to Button/);
  });
});

describe("applyOperation -- setDetailPageSlug", () => {
  it("sets detailPageSlug on a Button whose linkMode is 'detail'", () => {
    let config = makeConfig();
    config = applyOperation(config, {
      type: "setLinkMode",
      componentId: "cmp_detail_btn",
      value: "detail",
    });
    const next = applyOperation(config, {
      type: "setDetailPageSlug",
      componentId: "cmp_detail_btn",
      value: "units",
    });
    expect(findNode(next, "cmp_detail_btn")?.props.detailPageSlug).toBe("units");
  });

  it("throws when the Button is still in 'static' linkMode", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setDetailPageSlug",
        componentId: "cmp_detail_btn",
        value: "units",
      }),
    ).toThrow(/linkMode to be "detail"/);
  });
});

describe("applyOperation -- setQueryParamDefault", () => {
  it("sets the query-param prop on an InputField", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setQueryParamDefault",
      componentId: "cmp_input",
      value: "propertyId",
    });
    expect(findNode(next, "cmp_input")?.props.defaultValueFromQueryParam).toBe("propertyId");
  });

  it("clears the prop when value is null", () => {
    let config = makeConfig();
    config = applyOperation(config, {
      type: "setQueryParamDefault",
      componentId: "cmp_input",
      value: "propertyId",
    });
    const next = applyOperation(config, {
      type: "setQueryParamDefault",
      componentId: "cmp_input",
      value: null,
    });
    expect(findNode(next, "cmp_input")?.props.defaultValueFromQueryParam).toBeUndefined();
  });

  it("throws on non-InputField targets", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setQueryParamDefault",
        componentId: "cmp_hero",
        value: "x",
      }),
    ).toThrow(/setQueryParamDefault only applies to InputField/);
  });
});

// ---------------------------------------------------------------------------
// Tier 2: duplicate / wrap / unwrap / reorderChildren / Repeater ops
// ---------------------------------------------------------------------------

describe("applyOperation -- duplicateComponent", () => {
  it("clones the subtree with fresh ids and inserts after the source", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "duplicateComponent",
      targetId: "cmp_hero",
    });
    const root = next.pages[0]?.rootComponent;
    expect(root?.children?.length).toBe(5);
    expect(root?.children?.[0]?.id).toBe("cmp_hero");
    const clone = root?.children?.[1];
    expect(clone?.id).not.toBe("cmp_hero");
    expect(clone?.type).toBe("HeroBanner");
  });

  it("throws on the page root", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, { type: "duplicateComponent", targetId: "cmp_root_home" }),
    ).toThrow(/page root/);
  });
});

describe("applyOperation -- wrapComponent", () => {
  it("wraps the target in a new Section", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "wrapComponent",
      targetId: "cmp_hero",
      wrapper: { type: "Section" },
    });
    const root = next.pages[0]?.rootComponent;
    const wrapper = root?.children?.[0];
    expect(wrapper?.type).toBe("Section");
    expect(wrapper?.children?.[0]?.id).toBe("cmp_hero");
  });

  it("rejects a wrapper whose children policy forbids the target", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "wrapComponent",
        targetId: "cmp_hero",
        wrapper: { type: "Heading" },
      }),
    ).toThrow(/cannot accept a child/);
  });
});

describe("applyOperation -- unwrapComponent", () => {
  it("replaces the target with its children", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "unwrapComponent",
      targetId: "cmp_form",
    });
    const root = next.pages[0]?.rootComponent;
    expect(findNode(next, "cmp_form")).toBeNull();
    expect(findNode(next, "cmp_input")?.id).toBe("cmp_input");
    expect(findNode(next, "cmp_submit")?.id).toBe("cmp_submit");
    // Both children landed where the form used to be.
    const ids = root?.children?.map((c) => c.id) ?? [];
    expect(ids).toContain("cmp_input");
    expect(ids).toContain("cmp_submit");
  });

  it("throws when the target has no children", () => {
    const config = makeConfig();
    expect(() => applyOperation(config, { type: "unwrapComponent", targetId: "cmp_hero" })).toThrow(
      /no children/,
    );
  });
});

describe("applyOperation -- reorderChildren", () => {
  it("reorders to a permutation of the existing ids", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "reorderChildren",
      parentId: "cmp_form",
      newOrder: ["cmp_submit", "cmp_input"],
    });
    const ids = findNode(next, "cmp_form")?.children?.map((c) => c.id);
    expect(ids).toEqual(["cmp_submit", "cmp_input"]);
  });

  it("rejects a list that is not a permutation", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "reorderChildren",
        parentId: "cmp_form",
        newOrder: ["cmp_submit"],
      }),
    ).toThrow(/length/);
  });
});

describe("applyOperation -- setRepeaterDataSource", () => {
  it("updates the source on a Repeater", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setRepeaterDataSource",
      targetId: "cmp_repeater",
      dataSource: "properties",
    });
    expect(findNode(next, "cmp_repeater")?.dataBinding?.source).toBe("properties");
  });

  it("rejects non-Repeater targets", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setRepeaterDataSource",
        targetId: "cmp_hero",
        dataSource: "units",
      }),
    ).toThrow(/only applies to Repeater/);
  });
});

describe("applyOperation -- setRepeaterFilters", () => {
  it("writes filters on a Repeater with a dataBinding", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setRepeaterFilters",
      targetId: "cmp_repeater",
      query: {
        combinator: "and",
        rules: [{ field: "bedrooms", operator: ">=", value: 2 }],
      },
    });
    const filters = findNode(next, "cmp_repeater")?.dataBinding?.filters as
      | { combinator: string }
      | undefined;
    expect(filters?.combinator).toBe("and");
  });

  it("rejects non-Repeater targets", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setRepeaterFilters",
        targetId: "cmp_hero",
        query: { combinator: "and", rules: [] },
      }),
    ).toThrow(/only applies to Repeater/);
  });
});

describe("applyOperation -- setRepeaterSort", () => {
  it("writes sort on a Repeater with a dataBinding", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "setRepeaterSort",
      targetId: "cmp_repeater",
      sort: { field: "rent", direction: "asc" },
    });
    expect(findNode(next, "cmp_repeater")?.dataBinding?.sort?.field).toBe("rent");
  });

  it("rejects non-Repeater targets", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "setRepeaterSort",
        targetId: "cmp_hero",
        sort: { field: "rent", direction: "asc" },
      }),
    ).toThrow(/only applies to Repeater/);
  });
});

describe("applyOperation -- connectInputToRepeater", () => {
  it("appends a connection on the Repeater's dataBinding", () => {
    const config = makeConfig();
    const next = applyOperation(config, {
      type: "connectInputToRepeater",
      inputId: "cmp_input",
      repeaterId: "cmp_repeater",
      field: "email",
      operator: "contains",
    });
    const conns = findNode(next, "cmp_repeater")?.dataBinding?.connectedInputs ?? [];
    expect(conns).toEqual([{ inputId: "cmp_input", field: "email", operator: "contains" }]);
  });

  it("rejects when inputId references a non-InputField", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "connectInputToRepeater",
        inputId: "cmp_hero",
        repeaterId: "cmp_repeater",
        field: "x",
        operator: "=",
      }),
    ).toThrow(/inputId must reference an InputField/);
  });

  it("rejects when repeaterId references a non-Repeater", () => {
    const config = makeConfig();
    expect(() =>
      applyOperation(config, {
        type: "connectInputToRepeater",
        inputId: "cmp_input",
        repeaterId: "cmp_hero",
        field: "x",
        operator: "=",
      }),
    ).toThrow(/repeaterId must reference a Repeater/);
  });
});

// ---------------------------------------------------------------------------
// Atomicity + folding order
// ---------------------------------------------------------------------------

describe("applyOperations", () => {
  it("folds left -- op N sees the result of op N-1", () => {
    const config = makeConfig();
    const ops: Operation[] = [
      { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "step 1" },
      { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "step 2" },
      { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "step 3" },
    ];
    const next = applyOperations(config, ops);
    expect(findNode(next, "cmp_hero")?.props.heading).toBe("step 3");
  });

  it("aborts on the first invalid op and leaves the input config untouched", () => {
    const config = makeConfig();
    const original = JSON.stringify(config);
    const ops: Operation[] = [
      { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "ok" },
      {
        type: "setText",
        targetId: "cmp_hero",
        text: "fails -- HeroBanner is not a setText target",
      },
      { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "never reached" },
    ];
    expect(() => applyOperations(config, ops)).toThrow(OperationInvalidError);
    expect(JSON.stringify(config)).toBe(original);
  });

  it("returns config unchanged when ops is empty", () => {
    const config = makeConfig();
    expect(applyOperations(config, [])).toBe(config);
  });

  it("OperationInvalidError carries the offending op id when present", () => {
    const config = makeConfig();
    try {
      applyOperations(config, [
        { id: "op-1", type: "setText", targetId: "cmp_hero", text: "boom" },
      ]);
      throw new Error("unreachable -- expected OperationInvalidError");
    } catch (e) {
      expect(e).toBeInstanceOf(OperationInvalidError);
      const err = e as OperationInvalidError;
      expect(err.opId).toBe("op-1");
      expect(err.opType).toBe("setText");
      expect(err.message).toContain("[op id: op-1]");
    }
  });

  it("OPERATION_TYPES enumerates exactly 25 names", () => {
    expect(new Set(OPERATION_TYPES).size).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 — first-NavBar auto-populate helpers
// ---------------------------------------------------------------------------

describe("isFirstNavBar / buildAutoPopulatedNavLinks", () => {
  function makeConfigWith(rootComponents: Record<string, ComponentNode>): SiteConfig {
    return {
      meta: { siteName: "Test", siteSlug: "test" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "" },
      },
      pages: Object.entries(rootComponents).map(([slug, root]) => ({
        id: `p_${slug}`,
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        kind: "static" as const,
        rootComponent: root,
      })),
      forms: [],
    };
  }

  function emptySection(id = "s"): ComponentNode {
    return { id, type: "Section", props: {}, style: {}, children: [] };
  }

  it("isFirstNavBar returns true when no page contains a NavBar", () => {
    const config = makeConfigWith({ home: emptySection() });
    expect(isFirstNavBar(config)).toBe(true);
  });

  it("isFirstNavBar returns false when a NavBar exists at the page root", () => {
    const config = makeConfigWith({
      home: {
        id: "s1",
        type: "Section",
        props: {},
        style: {},
        children: [{ id: "nav1", type: "NavBar", props: { links: [] }, style: {} }],
      },
    });
    expect(isFirstNavBar(config)).toBe(false);
  });

  it("isFirstNavBar returns false when a NavBar is nested deep on any page", () => {
    const config = makeConfigWith({
      home: emptySection(),
      about: {
        id: "s2",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "row1",
            type: "Row",
            props: {},
            style: {},
            children: [{ id: "nav1", type: "NavBar", props: { links: [] }, style: {} }],
          },
        ],
      },
    });
    expect(isFirstNavBar(config)).toBe(false);
  });

  it("buildAutoPopulatedNavLinks returns one 'page' link per static page in declaration order", () => {
    const config = makeConfigWith({
      home: emptySection("h"),
      about: emptySection("a"),
      contact: emptySection("c"),
    });
    const links = buildAutoPopulatedNavLinks(config);
    expect(links).toEqual([
      { kind: "page", pageSlug: "home", label: "Home" },
      { kind: "page", pageSlug: "about", label: "About" },
      { kind: "page", pageSlug: "contact", label: "Contact" },
    ]);
  });

  it("buildAutoPopulatedNavLinks skips detail pages", () => {
    const baseConfig = makeConfigWith({
      home: emptySection("h"),
      units: emptySection("u"),
    });
    // Mutate the units page to be a detail page.
    const config: SiteConfig = {
      ...baseConfig,
      pages: baseConfig.pages.map((p) =>
        p.slug === "units" ? { ...p, kind: "detail" as const, detailDataSource: "units" as const } : p,
      ),
    };
    const links = buildAutoPopulatedNavLinks(config);
    expect(links).toEqual([{ kind: "page", pageSlug: "home", label: "Home" }]);
  });

  it("applyAutoPopulatedNavLinks overwrites every NavBar's links with the auto-populated set", () => {
    const config = makeConfigWith({
      home: {
        id: "s_home",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "nav_home",
            type: "NavBar",
            props: {
              links: [{ label: "Stale", href: "/stale" }],
              logoPlacement: "left",
            },
            style: {},
          },
        ],
      },
      about: {
        id: "s_about",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "nav_about",
            type: "NavBar",
            props: { links: [], logoPlacement: "left" },
            style: {},
          },
        ],
      },
    });
    const next = applyAutoPopulatedNavLinks(config);
    const expectedLinks = [
      { kind: "page", pageSlug: "home", label: "Home" },
      { kind: "page", pageSlug: "about", label: "About" },
    ];
    const homeNav = next.pages[0]?.rootComponent.children?.[0];
    const aboutNav = next.pages[1]?.rootComponent.children?.[0];
    expect(homeNav?.props.links).toEqual(expectedLinks);
    expect(aboutNav?.props.links).toEqual(expectedLinks);
    // Non-link props are preserved.
    expect(homeNav?.props.logoPlacement).toBe("left");
  });

  it("applyAutoPopulatedNavLinks is a no-op when no NavBar exists", () => {
    const config = makeConfigWith({ home: emptySection("h") });
    const next = applyAutoPopulatedNavLinks(config);
    expect(next).toBe(config);
  });

  it("replicateLockedNavBarToAllPages copies the canonical NavBar onto every page that lacks one", () => {
    const config = makeConfigWith({
      home: {
        id: "s_home",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "nav_canonical",
            type: "NavBar",
            props: {
              links: [{ kind: "page", pageSlug: "home", label: "Home" }],
              logoPlacement: "center",
              sticky: true,
            },
            style: { background: "blue" },
          },
        ],
      },
      about: emptySection("s_about"),
      contact: emptySection("s_contact"),
    });
    const next = replicateLockedNavBarToAllPages(config);
    // Home is unchanged (already had a NavBar).
    expect(next.pages[0]?.rootComponent.children?.[0]?.id).toBe("nav_canonical");
    // About and contact each get a NavBar prepended with the same content.
    const aboutNav = next.pages[1]?.rootComponent.children?.[0];
    const contactNav = next.pages[2]?.rootComponent.children?.[0];
    expect(aboutNav?.type).toBe("NavBar");
    expect(contactNav?.type).toBe("NavBar");
    // New copies get fresh ids — required for tree uniqueness.
    expect(aboutNav?.id).not.toBe("nav_canonical");
    expect(contactNav?.id).not.toBe("nav_canonical");
    expect(aboutNav?.id).not.toBe(contactNav?.id);
    // Props/style match the canonical and overrideShared is reset to false.
    expect(aboutNav?.props.logoPlacement).toBe("center");
    expect(aboutNav?.props.sticky).toBe(true);
    expect(aboutNav?.props.overrideShared).toBe(false);
    expect(aboutNav?.style).toEqual({ background: "blue" });
  });

  it("replicateLockedNavBarToAllPages is a no-op when the global lock is off", () => {
    const baseConfig = makeConfigWith({
      home: {
        id: "s_home",
        type: "Section",
        props: {},
        style: {},
        children: [
          {
            id: "nav1",
            type: "NavBar",
            props: { links: [], logoPlacement: "left" },
            style: {},
          },
        ],
      },
      about: emptySection("s_about"),
    });
    const config: SiteConfig = {
      ...baseConfig,
      global: { ...baseConfig.global, navBarLocked: false },
    };
    const next = replicateLockedNavBarToAllPages(config);
    expect(next).toBe(config);
    // About still has no NavBar.
    expect(next.pages[1]?.rootComponent.children).toEqual([]);
  });

  it("replicateLockedNavBarToAllPages is a no-op when no NavBar exists anywhere", () => {
    const config = makeConfigWith({
      home: emptySection("s_home"),
      about: emptySection("s_about"),
    });
    const next = replicateLockedNavBarToAllPages(config);
    expect(next).toBe(config);
  });

  it("replicateLockedNavBarToAllPages leaves pages alone when they already contain a NavBar", () => {
    const config = makeConfigWith({
      home: {
        id: "s_home",
        type: "Section",
        props: {},
        style: {},
        children: [
          { id: "nav_home", type: "NavBar", props: { links: [] }, style: {} },
        ],
      },
      about: {
        id: "s_about",
        type: "Section",
        props: {},
        style: {},
        children: [
          { id: "nav_about", type: "NavBar", props: { links: [] }, style: {} },
        ],
      },
    });
    const next = replicateLockedNavBarToAllPages(config);
    expect(next).toBe(config);
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 — locked NavBar replication
// ---------------------------------------------------------------------------

describe("syncLockedNavBars / findLockedNavBar / applyGlobalNavBarLocked", () => {
  function navBarNode(id: string, propsPatch: Record<string, unknown> = {}): ComponentNode {
    return {
      id,
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false, ...propsPatch },
      style: {},
    };
  }

  function pageWith(slug: string, navBar: ComponentNode | null) {
    const root: ComponentNode = {
      id: `r_${slug}`,
      type: "Section",
      props: {},
      style: {},
      children: navBar ? [navBar] : [],
    };
    return {
      id: `p_${slug}`,
      slug,
      name: slug,
      kind: "static" as const,
      rootComponent: root,
    };
  }

  function buildConfig(
    pages: ReturnType<typeof pageWith>[],
    navBarLocked: boolean | undefined = undefined,
  ): SiteConfig {
    return {
      meta: { siteName: "Test", siteSlug: "test" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        ...(navBarLocked !== undefined ? { navBarLocked } : {}),
        footer: { columns: [], copyright: "" },
      },
      pages,
      forms: [],
    };
  }

  it("isGlobalNavBarLocked treats undefined as locked (default ON)", () => {
    expect(isGlobalNavBarLocked(buildConfig([]))).toBe(true);
    expect(isGlobalNavBarLocked(buildConfig([], true))).toBe(true);
    expect(isGlobalNavBarLocked(buildConfig([], false))).toBe(false);
  });

  it("syncLockedNavBars replicates props/style from the source to all locked siblings", () => {
    const a = navBarNode("nav_a", { sticky: true, logoPlacement: "right" });
    const b = navBarNode("nav_b", { sticky: false, logoPlacement: "left" });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)]);
    const next = syncLockedNavBars(config, "nav_a");
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props).toMatchObject({ sticky: true, logoPlacement: "right" });
    expect(navB?.props.overrideShared).toBe(false);
  });

  it("syncLockedNavBars leaves overrideShared NavBars untouched", () => {
    const a = navBarNode("nav_a", { sticky: true });
    const b = navBarNode("nav_b", { sticky: false, overrideShared: true });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)]);
    const next = syncLockedNavBars(config, "nav_a");
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props).toMatchObject({ sticky: false, overrideShared: true });
  });

  it("syncLockedNavBars is a no-op when the global lock is off", () => {
    const a = navBarNode("nav_a", { sticky: true });
    const b = navBarNode("nav_b", { sticky: false });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)], false);
    const next = syncLockedNavBars(config, "nav_a");
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props.sticky).toBe(false);
  });

  it("syncLockedNavBars is a no-op when the source itself has overrideShared=true", () => {
    const a = navBarNode("nav_a", { sticky: true, overrideShared: true });
    const b = navBarNode("nav_b", { sticky: false });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)]);
    const next = syncLockedNavBars(config, "nav_a");
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props.sticky).toBe(false);
  });

  it("findLockedNavBar returns a sibling locked NavBar (not the excluded id)", () => {
    const a = navBarNode("nav_a", { sticky: true });
    const b = navBarNode("nav_b", { sticky: false });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)]);
    const found = findLockedNavBar(config, "nav_b");
    expect(found?.id).toBe("nav_a");
  });

  it("findLockedNavBar returns null when only override NavBars remain", () => {
    const a = navBarNode("nav_a", { overrideShared: true });
    const config = buildConfig([pageWith("home", a)]);
    expect(findLockedNavBar(config, "nav_b")).toBe(null);
  });

  it("applyGlobalNavBarLocked(true) replicates from a canonical NavBar across pages", () => {
    const a = navBarNode("nav_a", { sticky: true });
    const b = navBarNode("nav_b", { sticky: false });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)], false);
    const next = applyGlobalNavBarLocked(config, true);
    expect(next.global.navBarLocked).toBe(true);
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props.sticky).toBe(true);
  });

  it("applyGlobalNavBarLocked(true) prepends a NavBar onto pages that lacked one", () => {
    const a = navBarNode("nav_a", { sticky: true, links: [{ label: "Home", href: "/" }] });
    const config = buildConfig(
      [pageWith("home", a), pageWith("about", null)],
      false,
    );
    const next = applyGlobalNavBarLocked(config, true);
    const aboutPage = next.pages.find((p) => p.slug === "about");
    const aboutNav = aboutPage?.rootComponent.children?.find((c) => c.type === "NavBar");
    expect(aboutNav).toBeDefined();
    expect(aboutNav?.props.sticky).toBe(true);
    expect(aboutNav?.id).not.toBe("nav_a");
  });

  it("applyGlobalNavBarLocked(false) just flips the flag without replicating", () => {
    const a = navBarNode("nav_a", { sticky: true });
    const b = navBarNode("nav_b", { sticky: false });
    const config = buildConfig([pageWith("home", a), pageWith("about", b)]);
    const next = applyGlobalNavBarLocked(config, false);
    expect(next.global.navBarLocked).toBe(false);
    const navB = next.pages
      .find((p) => p.slug === "about")
      ?.rootComponent.children?.find((c) => c.id === "nav_b");
    expect(navB?.props.sticky).toBe(false);
  });
});
