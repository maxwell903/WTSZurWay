import { Canvas } from "@/components/editor/canvas/Canvas";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render } from "@testing-library/react";
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
              props: { text: "Welcome" },
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

describe("<Canvas>", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("Esc clears the active selection", () => {
    render(<Canvas />);
    act(() => {
      useEditorStore.getState().selectComponent("cmp_h1");
    });
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(useEditorStore.getState().selectedComponentId).toBeNull();
  });

  it("clicking the canvas background deselects", () => {
    const { getByTestId } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().selectComponent("cmp_h1");
    });
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
    fireEvent.click(getByTestId("editor-canvas"));
    expect(useEditorStore.getState().selectedComponentId).toBeNull();
  });

  it("hides the selection breadcrumb in preview mode", () => {
    const { container, queryByTestId } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().selectComponent("cmp_h1");
    });
    // Edit mode: breadcrumb visible.
    expect(queryByTestId("selection-breadcrumb")).toBeInTheDocument();
    act(() => {
      useEditorStore.getState().setPreviewMode(true);
    });
    expect(container.querySelector('[data-testid="selection-breadcrumb"]')).toBeNull();
  });
});
