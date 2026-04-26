import type { SiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { resolveStaticPage } from "../resolve";

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
