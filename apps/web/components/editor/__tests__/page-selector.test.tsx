import { PageSelector } from "@/components/editor/topbar/PageSelector";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  Toaster: () => null,
}));

function makeConfigWithBoth(): SiteConfig {
  return {
    meta: { siteName: "X", siteSlug: "x" },
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
        rootComponent: { id: "cmp_root_home", type: "Section", props: {}, style: {}, children: [] },
      },
      {
        id: "p_units_static",
        slug: "units",
        name: "Units",
        kind: "static",
        rootComponent: { id: "cmp_root_us", type: "Section", props: {}, style: {}, children: [] },
      },
      {
        id: "p_units_detail",
        slug: "units",
        name: "Unit Detail",
        kind: "detail",
        detailDataSource: "units",
        rootComponent: { id: "cmp_root_ud", type: "Section", props: {}, style: {}, children: [] },
      },
    ],
    forms: [],
  };
}

describe("<PageSelector>", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeConfigWithBoth(),
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the active page name in the trigger", () => {
    render(<PageSelector />);
    const trigger = screen.getByTestId("topbar-page-selector");
    expect(trigger.textContent).toContain("Home");
  });

  it("shows a DETAIL badge in the trigger when the active page is a detail page", () => {
    // Switch the canvas to the detail page (which shares slug "units" with a
    // static page; the picker's "selected" disambiguation falls through to
    // the detail in the test by setting currentPageSlug to "units" while the
    // detail entry comes first in the find()? -- our selectCurrentPage
    // prefers static first. To force the detail variant, mutate the store's
    // currentPageSlug AND remove the static page so the detail wins.
    useEditorStore.setState((s) => ({
      currentPageSlug: "units",
      draftConfig: {
        ...s.draftConfig,
        pages: s.draftConfig.pages.filter((p) => !(p.kind === "static" && p.slug === "units")),
      },
    }));
    render(<PageSelector />);
    const trigger = screen.getByTestId("topbar-page-selector");
    expect(trigger.textContent).toContain("Unit Detail");
    expect(trigger.textContent).toContain("DETAIL");
  });
});
