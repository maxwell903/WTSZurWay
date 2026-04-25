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
  paletteIdSchema,
  shadowPresetSchema,
  siteConfigSchema,
  styleConfigSchema,
} from "../schema";

describe("componentTypeSchema", () => {
  it("contains exactly the 20 demo-spec component types in the documented order", () => {
    expect([...COMPONENT_TYPES]).toEqual([
      "Section",
      "Row",
      "Column",
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
