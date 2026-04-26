import { describe, expect, it } from "vitest";
import { parseSiteConfig, safeParseSiteConfig } from "../parse";

function makeMinimalConfig() {
  return {
    meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "© 2026" },
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        // Sprint 3b (DECISIONS.md 2026-04-25): pageSchema now defaults `kind`
        // to "static" via Zod default(). The fixture spells the field out so
        // the JSON round-trip equality assertion below holds against the
        // post-amendment schema.
        kind: "static",
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {} },
      },
    ],
    forms: [],
  };
}

describe("parseSiteConfig", () => {
  it("returns the parsed config on valid input", () => {
    const result = parseSiteConfig(makeMinimalConfig());
    expect(result.meta.siteName).toBe("Aurora");
  });

  it("throws on invalid input", () => {
    expect(() => parseSiteConfig({})).toThrow();
  });
});

describe("safeParseSiteConfig", () => {
  it("returns a success-tagged discriminated union on valid input", () => {
    const result = safeParseSiteConfig(makeMinimalConfig());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand.palette).toBe("ocean");
    }
  });

  it("returns an error-tagged discriminated union on invalid input", () => {
    const result = safeParseSiteConfig({ meta: "not-an-object" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("JSON round-trip", () => {
  it("round-trips a JSON-stringified valid config without loss", () => {
    const original = makeMinimalConfig();
    const json = JSON.stringify(original);
    const reparsed = parseSiteConfig(JSON.parse(json));
    expect(JSON.stringify(reparsed)).toBe(json);
  });
});

// ---------------------------------------------------------------------------
// Sprint 3b — detail page round-trips (PROJECT_SPEC.md §11 + §8.12)
// ---------------------------------------------------------------------------

describe("JSON round-trip (detail pages)", () => {
  it("round-trips a config with one static + one detail page sharing a slug", () => {
    const original = {
      meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "© 2026" },
      },
      pages: [
        {
          id: "p_units_list",
          slug: "units",
          name: "Units",
          kind: "static",
          rootComponent: { id: "r1", type: "Section", props: {}, style: {} },
        },
        {
          id: "p_units_detail",
          slug: "units",
          name: "Unit Detail",
          kind: "detail",
          detailDataSource: "units",
          rootComponent: { id: "r2", type: "Section", props: {}, style: {} },
        },
      ],
      forms: [],
    };
    const json = JSON.stringify(original);
    const reparsed = parseSiteConfig(JSON.parse(json));
    expect(JSON.stringify(reparsed)).toBe(json);
    expect(reparsed.pages[0]?.kind).toBe("static");
    expect(reparsed.pages[1]?.kind).toBe("detail");
    expect(reparsed.pages[1]?.detailDataSource).toBe("units");
  });

  it("round-trips a detail page with detailDataSource='properties'", () => {
    const original = {
      meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "© 2026" },
      },
      pages: [
        {
          id: "p_property_detail",
          slug: "property",
          name: "Property Detail",
          kind: "detail",
          detailDataSource: "properties",
          rootComponent: { id: "r", type: "Section", props: {}, style: {} },
        },
      ],
      forms: [],
    };
    const json = JSON.stringify(original);
    const reparsed = parseSiteConfig(JSON.parse(json));
    expect(JSON.stringify(reparsed)).toBe(json);
    expect(reparsed.pages[0]?.detailDataSource).toBe("properties");
  });

  it("backwards-compat canary: a pre-amendment config (no `kind` field) parses with kind defaulted to 'static'", () => {
    // This config was authored before Sprint 3b shipped. The default("static")
    // in pageSchema MUST keep it valid without migration. The reparsed object
    // gains the `kind` field on parse — this is intentional and the U2 spec
    // §11 makes the default an explicit, binding behavior.
    const preAmendment = {
      meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "© 2026" },
      },
      pages: [
        {
          id: "p_home",
          slug: "home",
          name: "Home",
          rootComponent: { id: "r1", type: "Section", props: {}, style: {} },
        },
        {
          id: "p_about",
          slug: "about",
          name: "About",
          rootComponent: { id: "r2", type: "Section", props: {}, style: {} },
        },
      ],
      forms: [],
    };
    const reparsed = parseSiteConfig(JSON.parse(JSON.stringify(preAmendment)));
    expect(reparsed.pages.every((p) => p.kind === "static")).toBe(true);
    expect(reparsed.pages.every((p) => p.detailDataSource === undefined)).toBe(true);
  });
});
