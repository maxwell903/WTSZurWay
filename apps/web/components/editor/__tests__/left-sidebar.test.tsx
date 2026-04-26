import { LeftSidebar } from "@/components/editor/sidebar/LeftSidebar";
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

describe("<LeftSidebar>", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("defaults to the Pages tab and renders all four tab triggers", () => {
    render(<LeftSidebar />);
    expect(screen.getByTestId("left-sidebar-tab-site")).toBeInTheDocument();
    expect(screen.getByTestId("left-sidebar-tab-pages")).toBeInTheDocument();
    expect(screen.getByTestId("left-sidebar-tab-add")).toBeInTheDocument();
    expect(screen.getByTestId("left-sidebar-tab-data")).toBeInTheDocument();
    expect(screen.getByTestId("left-sidebar-tab-pages")).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a tab persists the active tab into the store", () => {
    render(<LeftSidebar />);
    fireEvent.click(screen.getByTestId("left-sidebar-tab-site"));
    expect(useEditorStore.getState().leftSidebarTab).toBe("site");
    fireEvent.click(screen.getByTestId("left-sidebar-tab-data"));
    expect(useEditorStore.getState().leftSidebarTab).toBe("data");
  });
});
