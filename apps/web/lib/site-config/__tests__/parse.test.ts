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
