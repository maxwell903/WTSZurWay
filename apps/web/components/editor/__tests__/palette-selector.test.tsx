import { PaletteSelector } from "@/components/editor/sidebar/site-tab/PaletteSelector";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

function makeFixtureConfig(): SiteConfig {
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
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children: [] },
      },
    ],
    forms: [],
  };
}

describe("<PaletteSelector>", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("renders all six palette cards", () => {
    render(<PaletteSelector />);
    for (const id of ["ocean", "forest", "sunset", "violet", "monochrome", "rose"]) {
      expect(screen.getByTestId(`palette-card-${id}`)).toBeInTheDocument();
    }
  });

  it("clicking a palette card writes through to draftConfig.brand.palette and flips dirty", () => {
    render(<PaletteSelector />);
    fireEvent.click(screen.getByTestId("palette-card-forest"));
    const s = useEditorStore.getState();
    expect(s.draftConfig.brand.palette).toBe("forest");
    expect(s.saveState).toBe("dirty");
  });
});
