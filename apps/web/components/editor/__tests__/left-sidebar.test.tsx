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
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_h1",
              type: "Heading",
              props: { text: "Hi" },
              style: {},
              children: [],
            },
          ],
        },
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

  it("renders the EditPanelShell when leftSidebarMode === 'element-edit'", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    render(<LeftSidebar />);
    expect(screen.getByTestId("edit-panel-shell")).toBeInTheDocument();
    expect(screen.getByTestId("edit-panel-title")).toHaveTextContent("Heading");
    expect(screen.queryByTestId("left-sidebar-tab-site")).toBeNull();
  });

  it("back arrow returns the sidebar to primary mode", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    render(<LeftSidebar />);
    fireEvent.click(screen.getByTestId("edit-panel-back"));
    expect(useEditorStore.getState().leftSidebarMode).toBe("primary");
    expect(useEditorStore.getState().selectedComponentId).toBeNull();
  });
});
