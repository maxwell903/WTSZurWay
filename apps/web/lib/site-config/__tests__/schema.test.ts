import { PALETTE_IDS } from "@/lib/setup-form/types";
import { describe, expect, it } from "vitest";
import {
  ANIMATION_PRESETS,
  COMPONENT_TYPES,
  SHADOW_PRESETS,
  animationConfigSchema,
  borderSchema,
  colorOrGradientSchema,
  componentNodeSchema,
  componentTypeSchema,
  dataBindingSchema,
  detailDataSourceSchema,
  navBarConfigSchema,
  pageKindSchema,
  pageSchema,
  paletteIdSchema,
  shadowPresetSchema,
  siteConfigSchema,
  styleConfigSchema,
} from "../schema";

describe("componentTypeSchema", () => {
  it("contains exactly the 21 component types in the documented order", () => {
    expect([...COMPONENT_TYPES]).toEqual([
      "Section",
      "Row",
      "Column",
      "FlowGroup",
      "Heading",
      "Paragraph",
      "Button",
      "Image",
      "Logo",
      "Spacer",
      "Divider",
      "NavBar",
      "Footer",
      "HeroBanner",
      "PropertyCard",
      "UnitCard",
      "Repeater",
      "InputField",
      "Form",
      "MapEmbed",
      "Gallery",
    ]);
  });

  it("accepts every documented component type", () => {
    for (const t of COMPONENT_TYPES) {
      expect(componentTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("rejects an unknown component type", () => {
    expect(componentTypeSchema.safeParse("Unknown").success).toBe(false);
  });
});

describe("animationPresetSchema", () => {
  it("exposes the ten §6.5 presets in order", () => {
    expect([...ANIMATION_PRESETS]).toEqual([
      "none",
      "fadeIn",
      "fadeInUp",
      "fadeInDown",
      "slideInLeft",
      "slideInRight",
      "zoomIn",
      "bounceIn",
      "hoverLift",
      "hoverGlow",
    ]);
  });
});

describe("shadowPresetSchema", () => {
  it("accepts every documented shadow preset and rejects unknown values", () => {
    for (const p of SHADOW_PRESETS) {
      expect(shadowPresetSchema.safeParse(p).success).toBe(true);
    }
    expect(shadowPresetSchema.safeParse("xxl").success).toBe(false);
  });
});

describe("paletteIdSchema", () => {
  it("matches the Sprint-2 PALETTE_IDS tuple exactly", () => {
    for (const id of PALETTE_IDS) {
      expect(paletteIdSchema.safeParse(id).success).toBe(true);
    }
    expect(paletteIdSchema.safeParse("teal").success).toBe(false);
  });
});

describe("colorOrGradientSchema", () => {
  it("accepts a flat color value", () => {
    expect(colorOrGradientSchema.safeParse({ kind: "color", value: "#fff" }).success).toBe(true);
  });

  it("accepts a gradient with from/to/angle", () => {
    expect(
      colorOrGradientSchema.safeParse({
        kind: "gradient",
        from: "#000",
        to: "#fff",
        angle: 45,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(colorOrGradientSchema.safeParse({ kind: "image", url: "x.png" }).success).toBe(false);
  });
});

describe("borderSchema", () => {
  it("requires width, style and color", () => {
    expect(borderSchema.safeParse({ width: 1, style: "solid", color: "#000" }).success).toBe(true);
    expect(borderSchema.safeParse({ width: 1, style: "wavy", color: "#000" }).success).toBe(false);
  });
});

describe("animationConfigSchema", () => {
  it("treats every field as optional", () => {
    expect(animationConfigSchema.safeParse({}).success).toBe(true);
  });

  it("validates duration and delay as non-negative numbers", () => {
    expect(animationConfigSchema.safeParse({ duration: -5 }).success).toBe(false);
    expect(animationConfigSchema.safeParse({ duration: 250, delay: 0 }).success).toBe(true);
  });
});

describe("styleConfigSchema", () => {
  it("accepts an empty style block", () => {
    expect(styleConfigSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully-populated style block", () => {
    const result = styleConfigSchema.safeParse({
      background: { kind: "color", value: "#fff" },
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      margin: { top: 8 },
      border: { width: 1, style: "solid", color: "#000" },
      borderRadius: 8,
      shadow: "md",
      width: "100%",
      height: "auto",
      textColor: "#111",
    });
    expect(result.success).toBe(true);
  });
});

describe("componentNodeSchema (recursive)", () => {
  const leaf = {
    id: "cmp_leaf",
    type: "Heading",
    props: { text: "Hello", level: 1 },
    style: {},
  };

  it("accepts a single leaf node", () => {
    expect(componentNodeSchema.safeParse(leaf).success).toBe(true);
  });

  it("accepts deeply nested children", () => {
    const tree = {
      id: "cmp_root",
      type: "Section",
      props: {},
      style: {},
      children: [
        {
          id: "cmp_inner",
          type: "Section",
          props: {},
          style: {},
          children: [leaf],
        },
      ],
    };
    expect(componentNodeSchema.safeParse(tree).success).toBe(true);
  });

  it("requires every node to have an id, type, props and style", () => {
    expect(componentNodeSchema.safeParse({ id: "x", type: "Section", style: {} }).success).toBe(
      false,
    );
  });

  it("treats props as a string-keyed record of unknowns (not 'any')", () => {
    expect(
      componentNodeSchema.safeParse({
        id: "x",
        type: "Section",
        props: { foo: 1, bar: "two", baz: { nested: true } },
        style: {},
      }).success,
    ).toBe(true);
  });
});

describe("dataBindingSchema", () => {
  it("accepts a minimal binding with only a source", () => {
    expect(dataBindingSchema.safeParse({ source: "units" }).success).toBe(true);
  });

  it("treats filters as opaque (Sprint 9 will narrow)", () => {
    expect(
      dataBindingSchema.safeParse({
        source: "units",
        filters: { combinator: "and", rules: [] },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown sources", () => {
    expect(dataBindingSchema.safeParse({ source: "tenants" }).success).toBe(false);
  });

  it("accepts a recursive emptyState ComponentNode", () => {
    expect(
      dataBindingSchema.safeParse({
        source: "units",
        emptyState: {
          id: "empty",
          type: "Paragraph",
          props: { text: "No units found." },
          style: {},
        },
      }).success,
    ).toBe(true);
  });
});

describe("siteConfigSchema", () => {
  function makeMinimalConfig() {
    return {
      meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
      brand: { palette: "ocean" as const, fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left" as const, sticky: false },
        footer: { columns: [], copyright: "© 2026" },
      },
      pages: [
        {
          id: "p_home",
          slug: "home",
          name: "Home",
          rootComponent: {
            id: "cmp_root",
            type: "Section" as const,
            props: {},
            style: {},
          },
        },
      ],
      forms: [],
    };
  }

  it("accepts a minimal valid config", () => {
    expect(siteConfigSchema.safeParse(makeMinimalConfig()).success).toBe(true);
  });

  it("rejects a config missing meta", () => {
    const { meta: _omit, ...withoutMeta } = makeMinimalConfig();
    expect(siteConfigSchema.safeParse(withoutMeta).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sprint 3b — detail page schema additions (PROJECT_SPEC.md §11 + §8.12)
// ---------------------------------------------------------------------------

describe("pageKindSchema", () => {
  it("accepts 'static' and 'detail' and rejects unknown values", () => {
    expect(pageKindSchema.safeParse("static").success).toBe(true);
    expect(pageKindSchema.safeParse("detail").success).toBe(true);
    expect(pageKindSchema.safeParse("dynamic").success).toBe(false);
    expect(pageKindSchema.safeParse("").success).toBe(false);
  });
});

describe("detailDataSourceSchema", () => {
  it("accepts 'properties' and 'units' and rejects unknown values", () => {
    expect(detailDataSourceSchema.safeParse("properties").success).toBe(true);
    expect(detailDataSourceSchema.safeParse("units").success).toBe(true);
    expect(detailDataSourceSchema.safeParse("units_with_property").success).toBe(false);
    expect(detailDataSourceSchema.safeParse("company").success).toBe(false);
  });
});

describe("pageSchema (detail-page rules)", () => {
  function makePage(overrides: Record<string, unknown> = {}) {
    return {
      id: "p_units",
      slug: "units",
      name: "Units",
      rootComponent: { id: "r1", type: "Section" as const, props: {}, style: {} },
      ...overrides,
    };
  }

  it("defaults `kind` to 'static' when the field is omitted", () => {
    const result = pageSchema.safeParse(makePage());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("static");
      expect(result.data.detailDataSource).toBeUndefined();
    }
  });

  it("accepts kind='static' with no detailDataSource", () => {
    const result = pageSchema.safeParse(makePage({ kind: "static" }));
    expect(result.success).toBe(true);
  });

  it("accepts kind='detail' with detailDataSource='properties'", () => {
    const result = pageSchema.safeParse(
      makePage({ kind: "detail", detailDataSource: "properties" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("detail");
      expect(result.data.detailDataSource).toBe("properties");
    }
  });

  it("rejects a detail page that omits detailDataSource and points the issue at detailDataSource", () => {
    const result = pageSchema.safeParse(makePage({ kind: "detail" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message.includes("Detail pages"));
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["detailDataSource"]);
    }
  });

  it("rejects a static page that specifies detailDataSource and points the issue at detailDataSource", () => {
    const result = pageSchema.safeParse(makePage({ kind: "static", detailDataSource: "units" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message.includes("Static pages"));
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["detailDataSource"]);
    }
  });

  it("rejects detailDataSource values outside the ['properties','units'] enum", () => {
    const result = pageSchema.safeParse(makePage({ kind: "detail", detailDataSource: "company" }));
    expect(result.success).toBe(false);
  });
});

describe("siteConfigSchema (per-kind slug uniqueness, U2 routing)", () => {
  function makeConfigWithPages(pages: ReadonlyArray<Record<string, unknown>>) {
    return {
      meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
      brand: { palette: "ocean" as const, fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left" as const, sticky: false },
        footer: { columns: [], copyright: "© 2026" },
      },
      pages,
      forms: [],
    };
  }

  function makePage(overrides: Record<string, unknown>) {
    return {
      id: "p",
      slug: "units",
      name: "Units",
      rootComponent: { id: "r", type: "Section" as const, props: {}, style: {} },
      ...overrides,
    };
  }

  it("accepts one static page and one detail page sharing the same slug (U2)", () => {
    const result = siteConfigSchema.safeParse(
      makeConfigWithPages([
        makePage({ id: "p_list", slug: "units" }),
        makePage({
          id: "p_detail",
          slug: "units",
          kind: "detail",
          detailDataSource: "units",
        }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("rejects two static pages with the same slug; issue path points at the duplicate page", () => {
    const result = siteConfigSchema.safeParse(
      makeConfigWithPages([
        makePage({ id: "p1", slug: "units" }),
        makePage({ id: "p2", slug: "units" }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('Duplicate static page slug "units"'),
      );
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["pages", 1, "slug"]);
    }
  });

  it("rejects two detail pages with the same slug; issue path points at the duplicate page", () => {
    const result = siteConfigSchema.safeParse(
      makeConfigWithPages([
        makePage({
          id: "p1",
          slug: "units",
          kind: "detail",
          detailDataSource: "units",
        }),
        makePage({
          id: "p2",
          slug: "units",
          kind: "detail",
          detailDataSource: "units",
        }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('Duplicate detail page slug "units"'),
      );
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["pages", 1, "slug"]);
    }
  });

  it("treats a page omitting `kind` as 'static' for the cross-page uniqueness check", () => {
    // Refinement ordering canary: the per-page default('static') must apply
    // before the cross-page superRefine reads page.kind.
    const result = siteConfigSchema.safeParse(
      makeConfigWithPages([
        makePage({ id: "p1", slug: "home" /* no kind */ }),
        makePage({ id: "p2", slug: "home", kind: "static" }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('Duplicate static page slug "home"'),
      );
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["pages", 1, "slug"]);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1.1 — FlowGroup layout primitive (2026-04-26-x-axis-resize-and-edit-overlays)
// ---------------------------------------------------------------------------

describe("FlowGroup component type", () => {
  it("includes FlowGroup in COMPONENT_TYPES", () => {
    expect(COMPONENT_TYPES).toContain("FlowGroup");
  });

  it("accepts FlowGroup via componentTypeSchema", () => {
    expect(componentTypeSchema.safeParse("FlowGroup").success).toBe(true);
  });

  it("parses a minimal FlowGroup ComponentNode", () => {
    const node = {
      id: "cmp_fg1",
      type: "FlowGroup",
      props: {},
      style: {},
      children: [],
    };
    expect(componentNodeSchema.safeParse(node).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 — navLinkSchema (kind: "page" | "external") + backward compat
// ---------------------------------------------------------------------------

describe("navLinkSchema (via navBarConfigSchema)", () => {
  function makeNavBar(links: unknown) {
    return { links, logoPlacement: "left" as const, sticky: false };
  }

  it("parses a legacy { label, href } link (kind absent → treated as external)", () => {
    const result = navBarConfigSchema.safeParse(
      makeNavBar([{ label: "Home", href: "/" }]),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      // kind stays undefined; readers default to 'external' at use site.
      expect(result.data.links[0]?.kind).toBeUndefined();
      expect(result.data.links[0]?.href).toBe("/");
    }
  });

  it("parses a kind: 'page' link with pageSlug", () => {
    const result = navBarConfigSchema.safeParse(
      makeNavBar([{ label: "Home", kind: "page", pageSlug: "home" }]),
    );
    expect(result.success).toBe(true);
  });

  it("rejects kind: 'page' without pageSlug", () => {
    const result = navBarConfigSchema.safeParse(makeNavBar([{ label: "Home", kind: "page" }]));
    expect(result.success).toBe(false);
  });

  it("rejects kind: 'external' without href", () => {
    const result = navBarConfigSchema.safeParse(
      makeNavBar([{ label: "Home", kind: "external" }]),
    );
    expect(result.success).toBe(false);
  });

  it("accepts an empty links array", () => {
    expect(navBarConfigSchema.safeParse(makeNavBar([])).success).toBe(true);
  });
});
