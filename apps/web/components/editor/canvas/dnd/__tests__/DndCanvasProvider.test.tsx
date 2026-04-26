// Sprint 7 test plan (CLAUDE.md "DndCanvasProvider.test.tsx") — 7 cases:
//   (a) palette card → empty Section drops at index 0 + writes a new node
//   (b) palette card → none-policy Image drop is rejected; store unchanged
//   (c) palette card → one-policy Repeater: empty inserts; occupied rejects
//   (d) sortable reorder within a Section reorders children
//   (e) sortable move from Section A to Section B updates both parents
//   (f) Esc during a drag cancels — store unchanged from pre-drag snapshot
//   (g) previewMode === true disables drag (no listeners attached)
//
// Strategy: mock @dnd-kit/core's `DndContext` to capture the `onDragStart`,
// `onDragEnd`, `onDragCancel` handlers; the test then invokes them with
// synthetic { active, over } payloads. This bypasses dnd-kit's pointer/
// keyboard sensor machinery (which jsdom can't faithfully drive) while
// still exercising every line of DndCanvasProvider's intent-resolution
// logic.

import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CapturedHandlers = {
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: (event: DragCancelEvent) => void;
};
const captured: CapturedHandlers = {};

vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: (props: {
      children?: ReactNode;
      onDragStart?: (event: DragStartEvent) => void;
      onDragEnd?: (event: DragEndEvent) => void;
      onDragCancel?: (event: DragCancelEvent) => void;
    }) => {
      captured.onDragStart = props.onDragStart;
      captured.onDragEnd = props.onDragEnd;
      captured.onDragCancel = props.onDragCancel;
      return <>{props.children}</>;
    },
    DragOverlay: (props: { children?: ReactNode }) => <>{props.children}</>,
  };
});

vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: (props: { children?: ReactNode }) => <>{props.children}</>,
  };
});

import { DndCanvasProvider } from "../DndCanvasProvider";

function makeNode(
  id: string,
  type: ComponentNode["type"],
  children?: ComponentNode[],
): ComponentNode {
  const n: ComponentNode = { id, type, props: {}, style: {} };
  if (children !== undefined) n.children = children;
  return n;
}

function makeFixture(): SiteConfig {
  return {
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
        rootComponent: makeNode("cmp_root", "Section", [
          makeNode("cmp_secA", "Section", [
            makeNode("cmp_h1", "Heading"),
            makeNode("cmp_h2", "Heading"),
          ]),
          makeNode("cmp_secB", "Section", []),
          makeNode("cmp_repA", "Repeater", []),
          makeNode("cmp_repB", "Repeater", [makeNode("cmp_pc1", "PropertyCard")]),
          makeNode("cmp_img", "Image"),
        ]),
      },
    ],
    forms: [],
  };
}

function dragEnd(activeId: string, overId: string | null): DragEndEvent {
  return {
    active: {
      id: activeId,
      data: { current: undefined },
      rect: { current: { initial: null, translated: null } },
    } as unknown as DragEndEvent["active"],
    over: overId
      ? ({
          id: overId,
          data: { current: undefined },
          rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
        } as unknown as DragEndEvent["over"])
      : null,
    delta: { x: 0, y: 0 },
    activatorEvent: new Event("pointerdown"),
    collisions: null,
  };
}

function dragStart(activeId: string): DragStartEvent {
  return {
    active: {
      id: activeId,
      data: { current: undefined },
      rect: { current: { initial: null, translated: null } },
    } as unknown as DragStartEvent["active"],
    activatorEvent: new Event("pointerdown"),
  };
}

function findById(node: ComponentNode | undefined, id: string): ComponentNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const found = findById(c, id);
    if (found) return found;
  }
  return null;
}

function getRoot(): ComponentNode {
  const root = useEditorStore.getState().draftConfig.pages[0]?.rootComponent;
  if (!root) throw new Error("missing root");
  return root;
}

describe("<DndCanvasProvider>", () => {
  beforeEach(() => {
    captured.onDragStart = undefined;
    captured.onDragEnd = undefined;
    captured.onDragCancel = undefined;
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("(a) palette card → empty Section: addComponentChild fires at index 0", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    expect(captured.onDragEnd).toBeDefined();
    captured.onDragEnd?.(dragEnd("palette:Heading", "node:cmp_secB"));

    const secB = findById(getRoot(), "cmp_secB");
    expect(secB?.children?.length).toBe(1);
    expect(secB?.children?.[0]?.type).toBe("Heading");
    // The new node became the selection.
    expect(useEditorStore.getState().selectedComponentId).toBe(secB?.children?.[0]?.id);
    expect(useEditorStore.getState().saveState).toBe("dirty");
  });

  it("(b) palette card → none-policy Image: drop is rejected, store unchanged", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    const before = useEditorStore.getState().draftConfig;
    captured.onDragEnd?.(dragEnd("palette:Heading", "node:cmp_img"));
    expect(useEditorStore.getState().draftConfig).toBe(before);
    expect(useEditorStore.getState().saveState).toBe("idle");
  });

  it("(c1) palette card → empty Repeater: drop inserts the candidate", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    captured.onDragEnd?.(dragEnd("palette:PropertyCard", "node:cmp_repA"));
    const rep = findById(getRoot(), "cmp_repA");
    expect(rep?.children?.length).toBe(1);
    expect(rep?.children?.[0]?.type).toBe("PropertyCard");
  });

  it("(c2) palette card → occupied Repeater: drop is rejected, store unchanged", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    const before = useEditorStore.getState().draftConfig;
    captured.onDragEnd?.(dragEnd("palette:PropertyCard", "node:cmp_repB"));
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });

  it("(d) sortable reorder within a Section reorders children", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    // Drag h1 (index 0) over h2 (index 1) — same parent reorder.
    captured.onDragEnd?.(dragEnd("node:cmp_h1", "node:cmp_h2"));
    const secA = findById(getRoot(), "cmp_secA");
    expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2", "cmp_h1"]);
    expect(useEditorStore.getState().saveState).toBe("dirty");
  });

  it("(e) sortable move from Section A to Section B updates both parents", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    captured.onDragEnd?.(dragEnd("node:cmp_h1", "node:cmp_secB"));
    const secA = findById(getRoot(), "cmp_secA");
    const secB = findById(getRoot(), "cmp_secB");
    expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2"]);
    expect(secB?.children?.map((c) => c.id)).toEqual(["cmp_h1"]);
  });

  it("(f) Esc-cancel: onDragCancel fires, store is unchanged from the pre-drag snapshot", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    const before = useEditorStore.getState().draftConfig;
    captured.onDragStart?.(dragStart("palette:Heading"));
    captured.onDragCancel?.({} as DragCancelEvent);
    expect(useEditorStore.getState().draftConfig).toBe(before);
    expect(useEditorStore.getState().saveState).toBe("idle");
  });

  it("(g) previewMode === true disables drag (DndContext is NOT mounted)", () => {
    useEditorStore.getState().setPreviewMode(true);
    render(
      <DndCanvasProvider>
        <div data-testid="preview-only" />
      </DndCanvasProvider>,
    );
    // The mock's `captured.onDragEnd` is only set when DndContext renders.
    expect(captured.onDragEnd).toBeUndefined();
    expect(captured.onDragStart).toBeUndefined();
    expect(captured.onDragCancel).toBeUndefined();
  });

  it("rejects a node→node drop where over rejects the candidate type", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    const before = useEditorStore.getState().draftConfig;
    // Drag h1 onto cmp_img (none-policy leaf, different parent than h1).
    captured.onDragEnd?.(dragEnd("node:cmp_h1", "node:cmp_img"));
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });

  it("ignores a drop where over.id is null (cursor outside any droppable)", () => {
    render(
      <DndCanvasProvider>
        <div />
      </DndCanvasProvider>,
    );
    const before = useEditorStore.getState().draftConfig;
    captured.onDragEnd?.(dragEnd("palette:Heading", null));
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });
});
