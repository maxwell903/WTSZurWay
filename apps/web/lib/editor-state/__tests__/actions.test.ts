import type { SiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import {
  applyAddPage,
  applyDeletePage,
  applyRenamePage,
  applyReorderPages,
  applySetFontFamily,
  applySetPalette,
  applySetSiteName,
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
    expect(() =>
      applyAddPage(cfg, { name: "Dup", slug: "properties", kind: "static" }),
    ).toThrow(/static page already uses this slug/);
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
    expect(() =>
      applyReorderPages(cfg, { slug: "a", kind: "static", direction: "up" }),
    ).toThrow(/home page must remain at the top/);
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
