// @vitest-environment node

import { describe, expect, it } from "vitest";
import { deriveSiteSlug } from "../slug";

describe("deriveSiteSlug", () => {
  it("slugifies a plain company name", () => {
    expect(deriveSiteSlug({ companyName: "Aurora Property Group" })).toBe("aurora-property-group");
  });

  it("strips diacritics", () => {
    expect(deriveSiteSlug({ companyName: "Pâtisserie Élise" })).toBe("patisserie-elise");
  });

  it("collapses multiple separators into a single dash", () => {
    expect(deriveSiteSlug({ companyName: "  Acme   &   Co. " })).toBe("acme-co");
  });

  it("falls back to 'site' when input would yield empty", () => {
    expect(deriveSiteSlug({ companyName: "" })).toBe("site");
    expect(deriveSiteSlug({ companyName: "***" })).toBe("site");
    expect(deriveSiteSlug({ companyName: "   " })).toBe("site");
  });

  it("falls back to 'site' for all-non-ASCII input that yields nothing", () => {
    // Pure CJK with no Latin equivalents -> empty after the [a-z0-9-] filter.
    expect(deriveSiteSlug({ companyName: "中文" })).toBe("site");
  });

  it("caps very long input at 60 characters", () => {
    const longName = "a".repeat(120);
    const result = deriveSiteSlug({ companyName: longName });
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).toBe("a".repeat(60));
  });

  it("never ends with a dash after capping", () => {
    // 30-char prefix, dash, 35-char suffix = 66 chars; the cap at 60 lands
    // mid-suffix. Pad chars chosen so the cap doesn't fall on a dash.
    const tricky = `thirty-character-prefix-padxxx-${"y".repeat(35)}`;
    const result = deriveSiteSlug({ companyName: tricky });
    expect(result.endsWith("-")).toBe(false);
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("prefers the hostname of currentWebsiteUrl when provided", () => {
    expect(
      deriveSiteSlug({
        companyName: "Aurora Property Group",
        currentWebsiteUrl: "https://www.aurora-cincy.com",
      }),
    ).toBe("aurora-cincy");
  });

  it("strips the leading www. and trailing TLD from a URL", () => {
    expect(
      deriveSiteSlug({
        companyName: "irrelevant",
        currentWebsiteUrl: "https://www.example.co.uk/path",
      }),
    ).toBe("example-co");
  });

  it("falls back to companyName when currentWebsiteUrl is unparseable", () => {
    expect(
      deriveSiteSlug({
        companyName: "Aurora",
        currentWebsiteUrl: "not a url at all  $$$",
      }),
    ).toBe("aurora");
  });

  it("accepts a URL without a scheme by adding https://", () => {
    expect(
      deriveSiteSlug({
        companyName: "irrelevant",
        currentWebsiteUrl: "aurora-cincy.com",
      }),
    ).toBe("aurora-cincy");
  });
});
