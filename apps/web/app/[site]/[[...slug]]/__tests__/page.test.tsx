import type { SiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { resolveDetailPage, resolveStaticPage } from "../resolve";

const BASE_CONFIG: SiteConfig = {
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
      rootComponent: { id: "c_home", type: "Section", props: {}, style: {}, children: [] },
    },
    {
      id: "p_about",
      slug: "about",
      name: "About",
      kind: "static",
      rootComponent: { id: "c_about", type: "Section", props: {}, style: {}, children: [] },
    },
    {
      id: "p_foo_bar",
      slug: "foo/bar",
      name: "Foo Bar",
      kind: "static",
      rootComponent: { id: "c_foobar", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
  forms: [],
};

// PROJECT_SPEC.md §11 U2 routing: a static and a detail page may share a
// slug. The Sprint-13 resolver only matches the static side -- Sprint 9b
// owns the detail branch.
const U2_CONFIG: SiteConfig = {
  ...BASE_CONFIG,
  pages: [
    ...BASE_CONFIG.pages,
    {
      id: "p_units_static",
      slug: "units",
      name: "Units",
      kind: "static",
      rootComponent: { id: "c_units_s", type: "Section", props: {}, style: {}, children: [] },
    },
    {
      id: "p_units_detail",
      slug: "units",
      name: "Unit Detail",
      kind: "detail",
      detailDataSource: "units",
      rootComponent: { id: "c_units_d", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
};

describe("resolveStaticPage", () => {
  it("resolves undefined slug to the home page", () => {
    const page = resolveStaticPage(BASE_CONFIG, undefined);
    expect(page?.slug).toBe("home");
    expect(page?.kind).toBe("static");
  });

  it("resolves an empty array slug to the home page", () => {
    const page = resolveStaticPage(BASE_CONFIG, []);
    expect(page?.slug).toBe("home");
  });

  it("resolves a single segment slug to the matching static page", () => {
    const page = resolveStaticPage(BASE_CONFIG, ["about"]);
    expect(page?.slug).toBe("about");
  });

  it("resolves a multi-segment slug to a static page with a slash-joined slug", () => {
    const page = resolveStaticPage(BASE_CONFIG, ["foo", "bar"]);
    expect(page?.slug).toBe("foo/bar");
  });

  it("returns null when no static page matches", () => {
    expect(resolveStaticPage(BASE_CONFIG, ["does-not-exist"])).toBeNull();
  });

  it("ignores detail pages with the same slug (U2 coexistence)", () => {
    // The lookup for ["units"] resolves to the STATIC units page; the
    // sibling detail page with the same slug is ignored.
    const staticHit = resolveStaticPage(U2_CONFIG, ["units"]);
    expect(staticHit?.kind).toBe("static");
    expect(staticHit?.id).toBe("p_units_static");

    // The lookup for ["units", "42"] does not match ANY static page;
    // resolveStaticPage returns null. Sprint 9b's detail branch will own
    // this path.
    expect(resolveStaticPage(U2_CONFIG, ["units", "42"])).toBeNull();
  });
});

// Sprint 9b: detail-page resolver. PROJECT_SPEC.md §8.12 specifies
// `/{site}/{slug}/{id}` for detail pages with `kind === "detail"`. The id
// regex `/^[1-9]\d*$/` rejects leading zeros, signs, and decimals to keep
// the URL space deterministic.
const DETAIL_ONLY_CONFIG: SiteConfig = {
  ...BASE_CONFIG,
  pages: [
    ...BASE_CONFIG.pages,
    {
      id: "p_props_detail",
      slug: "properties",
      name: "Property Detail",
      kind: "detail",
      detailDataSource: "properties",
      rootComponent: { id: "c_props_d", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
};

describe("resolveDetailPage", () => {
  it("returns the detail page and a numeric rowId for a two-segment slug matching a detail page", () => {
    const match = resolveDetailPage(DETAIL_ONLY_CONFIG, ["properties", "7"]);
    expect(match).not.toBeNull();
    expect(match?.page.id).toBe("p_props_detail");
    expect(match?.page.kind).toBe("detail");
    expect(match?.rowId).toBe(7);
    expect(typeof match?.rowId).toBe("number");
  });

  it("returns null when the first segment matches only a STATIC page (no sibling detail)", () => {
    expect(resolveDetailPage(BASE_CONFIG, ["about", "42"])).toBeNull();
  });

  it("U2 case: returns the detail page (not the static one) for [slug, id]", () => {
    const match = resolveDetailPage(U2_CONFIG, ["units", "42"]);
    expect(match).not.toBeNull();
    expect(match?.page.id).toBe("p_units_detail");
    expect(match?.page.kind).toBe("detail");
    expect(match?.rowId).toBe(42);
  });

  it("returns null for a single-segment slug (the bare listing path)", () => {
    expect(resolveDetailPage(U2_CONFIG, ["units"])).toBeNull();
  });

  it("returns null for a three-segment slug (no nested dynamic routes per §8.12)", () => {
    expect(resolveDetailPage(U2_CONFIG, ["units", "42", "extra"])).toBeNull();
  });

  it("returns null when the trailing segment is not a positive integer", () => {
    expect(resolveDetailPage(U2_CONFIG, ["units", "abc"])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", "0"])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", "01"])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", "-1"])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", "1.5"])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", " 1 "])).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, ["units", ""])).toBeNull();
  });

  it("returns null when slug is undefined or empty", () => {
    expect(resolveDetailPage(U2_CONFIG, undefined)).toBeNull();
    expect(resolveDetailPage(U2_CONFIG, [])).toBeNull();
  });
});
