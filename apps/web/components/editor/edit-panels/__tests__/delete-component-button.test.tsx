import { DeleteComponentButton } from "@/components/editor/edit-panels/DeleteComponentButton";
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
            { id: "cmp_h1", type: "Heading", props: { text: "Hi" }, style: {}, children: [] },
          ],
        },
      },
    ],
    forms: [],
  };
}

beforeEach(() => {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(),
  });
});

describe("<DeleteComponentButton>", () => {
  it("disabled when the selected node is the current page's rootComponent", () => {
    useEditorStore.getState().enterElementEditMode("cmp_root");
    render(<DeleteComponentButton />);
    const button = screen.getByTestId("delete-component-button");
    expect(button).toBeDisabled();
  });

  it("active when the selected node is a non-root child", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    render(<DeleteComponentButton />);
    const button = screen.getByTestId("delete-component-button");
    expect(button).not.toBeDisabled();
  });

  it("confirming the dialog removes the node and exits element-edit mode", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    render(<DeleteComponentButton />);
    fireEvent.click(screen.getByTestId("delete-component-button"));
    fireEvent.click(screen.getByTestId("delete-component-confirm-button"));
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBeNull();
    expect(s.leftSidebarMode).toBe("primary");
    const root = s.draftConfig.pages[0]?.rootComponent;
    expect(root?.children).toEqual([]);
  });
});
