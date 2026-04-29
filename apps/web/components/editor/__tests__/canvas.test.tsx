import { Canvas } from "@/components/editor/canvas/Canvas";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("clicking the dotted canvas main deselects everything", () => {
    const { getByTestId } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().enterElementEditMode("cmp_h1");
    });
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
    expect(useEditorStore.getState().leftSidebarMode).toBe("element-edit");
    fireEvent.click(getByTestId("editor-canvas"));
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBeNull();
    expect(s.leftSidebarMode).toBe("primary");
  });

  it("clicking a Renderer page-background surface deselects everything", () => {
    const { container } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().enterElementEditMode("cmp_h1");
    });
    // The Renderer's data-canvas wrapper carries the marker. It is the
    // innermost background surface and is reachable by id.
    const dataCanvas = container.querySelector("[data-canvas][data-canvas-bg-surface]");
    expect(dataCanvas).not.toBeNull();
    fireEvent.click(dataCanvas as Element);
    expect(useEditorStore.getState().selectedComponentId).toBeNull();
    expect(useEditorStore.getState().leftSidebarMode).toBe("primary");
  });

  it("clicking the canvas background exits broadcast text-editing", () => {
    const { getByTestId } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().enterBroadcastTextEditing("cmp_root", ["cmp_h1"]);
    });
    expect(useEditorStore.getState().textEditingScope?.mode).toBe("broadcast");
    fireEvent.click(getByTestId("editor-canvas"));
    expect(useEditorStore.getState().textEditingScope).toBeNull();
  });

  it("clicking on a component does not deselect", () => {
    const { container } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().enterElementEditMode("cmp_h1");
    });
    const heading = container.querySelector('[data-edit-id="cmp_h1"]');
    expect(heading).not.toBeNull();
    fireEvent.click(heading as Element);
    // Selection must persist — only direct clicks on a marked surface clear it.
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
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

  it("right-click on a component fires enterElementEditMode with its id", () => {
    const { container } = render(<Canvas />);
    const wrapper = container.querySelector('[data-edit-id="cmp_h1"]');
    expect(wrapper).not.toBeNull();
    fireEvent.contextMenu(wrapper as Element);
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBe("cmp_h1");
    expect(s.leftSidebarMode).toBe("element-edit");
    expect(s.elementEditTab).toBe("content");
  });

  it("right-clicking a different component while in element-edit replaces selection without exiting", () => {
    const { container } = render(<Canvas />);
    const root = container.querySelector('[data-edit-id="cmp_root"]');
    const heading = container.querySelector('[data-edit-id="cmp_h1"]');
    expect(root).not.toBeNull();
    expect(heading).not.toBeNull();
    fireEvent.contextMenu(heading as Element);
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
    fireEvent.contextMenu(root as Element);
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBe("cmp_root");
    expect(s.leftSidebarMode).toBe("element-edit");
  });

  it("setCurrentPageSlug exits element-edit mode", () => {
    render(<Canvas />);
    act(() => {
      useEditorStore.getState().addPage({ name: "Properties", slug: "properties", kind: "static" });
      useEditorStore.getState().enterElementEditMode("cmp_h1");
    });
    expect(useEditorStore.getState().leftSidebarMode).toBe("element-edit");
    act(() => {
      useEditorStore.getState().setCurrentPageSlug("properties");
    });
    const s = useEditorStore.getState();
    expect(s.leftSidebarMode).toBe("primary");
    expect(s.selectedComponentId).toBeNull();
  });

  it("Task 4.4: renders the open-canvas dotted overlay in edit mode", () => {
    const { queryByTestId } = render(<Canvas />);
    // previewMode defaults to false after hydrate — overlay should be present.
    expect(queryByTestId("canvas-drop-overlay")).toBeInTheDocument();
  });

  it("Task 4.4: does NOT render the canvas overlay in preview mode", () => {
    const { queryByTestId } = render(<Canvas />);
    act(() => {
      useEditorStore.getState().setPreviewMode(true);
    });
    expect(queryByTestId("canvas-drop-overlay")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 6 Task 6.3 -- Show Component Types overlay
// ---------------------------------------------------------------------------

function makeFlowGroupFixtureConfig(): SiteConfig {
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
              id: "cmp_fg",
              type: "FlowGroup",
              props: {},
              style: {},
              children: [
                { id: "cmp_h1", type: "Heading", props: { text: "A" }, style: {}, children: [] },
                { id: "cmp_h2", type: "Heading", props: { text: "B" }, style: {}, children: [] },
              ],
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

describe("X-ray mode + hover-driven type labels (progressive disclosure)", () => {
  // Defaults flipped to OFF on the 2026-04-27 evening progressive-disclosure
  // pivot — see DECISIONS.md. The pill now appears only when X-ray is ON, the
  // component is selected, or the component is hovered.

  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("hides every type label at idle (X-ray off, no hover, nothing selected)", () => {
    render(<Canvas />);
    expect(screen.queryByTestId("type-label-cmp_root")).toBeNull();
  });

  it("renders the 'Section' type label when X-ray is toggled on", () => {
    act(() => {
      useEditorStore.getState().toggleShowComponentTypes();
    });
    render(<Canvas />);
    expect(screen.queryByTestId("type-label-cmp_root")).toBeInTheDocument();
  });

  it("renders the type label only on the hovered component", () => {
    render(<Canvas />);
    const wrapper = document.querySelector<HTMLDivElement>('[data-edit-id="cmp_root"]');
    expect(wrapper).not.toBeNull();
    if (wrapper) {
      // JSDOM has no PointerEvent constructor; React's pointerEnter handler
      // is invoked by testing-library's fireEvent.pointerEnter, which builds
      // a synthetic event compatible with React's pointer interface.
      fireEvent.pointerEnter(wrapper);
    }
    expect(screen.queryByTestId("type-label-cmp_root")).toBeInTheDocument();
    if (wrapper) {
      fireEvent.pointerLeave(wrapper);
    }
    expect(screen.queryByTestId("type-label-cmp_root")).toBeNull();
  });

  it("never renders the label for FlowGroup, even with X-ray on", () => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFlowGroupFixtureConfig(),
    });
    act(() => {
      useEditorStore.getState().toggleShowComponentTypes();
    });
    render(<Canvas />);
    // FlowGroup is engine-internal — no label for it.
    expect(screen.queryByTestId("type-label-cmp_fg")).toBeNull();
    // The two Heading children still get labels because X-ray is on.
    expect(screen.queryByTestId("type-label-cmp_h1")).toBeInTheDocument();
    expect(screen.queryByTestId("type-label-cmp_h2")).toBeInTheDocument();
  });

  it("hides every label in preview mode regardless of X-ray state", () => {
    act(() => {
      useEditorStore.getState().toggleShowComponentTypes();
      useEditorStore.getState().setPreviewMode(true);
    });
    render(<Canvas />);
    expect(screen.queryByTestId("type-label-cmp_root")).toBeNull();
  });
});
