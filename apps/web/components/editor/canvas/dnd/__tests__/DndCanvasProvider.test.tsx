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

  describe("dropzone:<parentId> drop intent (Task 4.3 follow-up)", () => {
    it("palette drop on an empty Section's overlay appends a new child", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // cmp_secB is an empty Section — its empty-container overlay registers as dropzone:cmp_secB
      captured.onDragEnd?.(dragEnd("palette:Heading", "dropzone:cmp_secB"));

      const secB = findById(getRoot(), "cmp_secB");
      expect(secB?.children?.length).toBe(1);
      expect(secB?.children?.[0]?.type).toBe("Heading");
      expect(useEditorStore.getState().saveState).toBe("dirty");
    });

    it("node drop on a Section's overlay moves the dragged node into the section", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // Drag cmp_h1 (currently in cmp_secA) onto dropzone:cmp_secB
      captured.onDragEnd?.(dragEnd("node:cmp_h1", "dropzone:cmp_secB"));

      const secA = findById(getRoot(), "cmp_secA");
      const secB = findById(getRoot(), "cmp_secB");
      expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2"]);
      expect(secB?.children?.map((c) => c.id)).toEqual(["cmp_h1"]);
      expect(useEditorStore.getState().saveState).toBe("dirty");
    });

    it("palette drop onto a dropzone that rejects the type is rejected", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // cmp_repB is a Repeater with one child (occupied), rejects further children
      const before = useEditorStore.getState().draftConfig;
      captured.onDragEnd?.(dragEnd("palette:PropertyCard", "dropzone:cmp_repB"));
      expect(useEditorStore.getState().draftConfig).toBe(before);
    });

    it("self-drop on own dropzone is rejected", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      const before = useEditorStore.getState().draftConfig;
      // Drag cmp_secA onto its own dropzone — should be a no-op
      captured.onDragEnd?.(dragEnd("node:cmp_secA", "dropzone:cmp_secA"));
      expect(useEditorStore.getState().draftConfig).toBe(before);
    });

    it("descendant drop onto ancestor's dropzone is rejected (cycle guard)", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      const before = useEditorStore.getState().draftConfig;
      // Drag cmp_h1 (child of cmp_secA) onto dropzone:cmp_h1's own sub-node won't form cycle,
      // but dragging cmp_secA onto dropzone:cmp_h1 would try to move a parent into its child.
      // We test: drag cmp_secA onto dropzone:cmp_h1 — isInSubtree(cmp_secA, cmp_h1.id)? No.
      // More direct cycle: drag cmp_root (ancestor) onto dropzone:cmp_secA's child.
      // Actually: drag cmp_secA onto dropzone:cmp_h1 — cmp_h1 is inside cmp_secA,
      // so isInSubtree(draggedNode=cmp_secA, dropzoneParentId=cmp_h1) → false.
      // The cycle case: drag cmp_secA onto dropzone of its own child cmp_h1 — cmp_h1
      // is a child of cmp_secA, but we're moving cmp_secA INTO cmp_h1 which is a leaf; it
      // would fail canAcceptChild (Heading doesn't accept children).
      // To test the isInSubtree guard: drag cmp_h1 onto dropzone:cmp_root — but cmp_root
      // accepts all. Better: drag cmp_secA onto dropzone:cmp_secA (self-drop, already covered).
      // Real descendant cycle: drag cmp_root onto dropzone of one of cmp_root's descendants.
      // isInSubtree(root=cmp_root, id=cmp_secA) → true → rejected.
      captured.onDragEnd?.(dragEnd("node:cmp_root", "dropzone:cmp_secA"));
      expect(useEditorStore.getState().draftConfig).toBe(before);
    });
  });

  describe("side-zone drop intent (Task 5.6)", () => {
    it("palette drop on side:cmp_x:right inserts new node as sibling AFTER target, both at width:50%", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // Arrange: cmp_secA > [cmp_h1, cmp_h2].
      // Drop palette:Button on side:cmp_h1:right.
      // Result: cmp_secA > [cmp_h1(50%), new Button(50%), cmp_h2]. No FlowGroup.
      const beforeConfig = useEditorStore.getState().draftConfig;
      captured.onDragEnd?.(dragEnd("palette:Button", "side:cmp_h1:right"));
      const root = getRoot();
      const secA = findById(root, "cmp_secA");
      // No FlowGroup created.
      expect(secA?.children?.find((c) => c.type === "FlowGroup")).toBeUndefined();
      // cmp_h1 stays at index 0 with width:50%, new Button at index 1 with width:50%.
      expect(secA?.children?.[0]?.id).toBe("cmp_h1");
      expect(secA?.children?.[0]?.style.width).toBe("50%");
      expect(secA?.children?.[1]?.type).toBe("Button");
      expect(secA?.children?.[1]?.style.width).toBe("50%");
      // cmp_h2 shifts to index 2, unchanged.
      expect(secA?.children?.[2]?.id).toBe("cmp_h2");
      expect(useEditorStore.getState().draftConfig).not.toBe(beforeConfig);
      expect(useEditorStore.getState().saveState).toBe("dirty");
    });

    it("palette drop on side:cmp_x:left inserts new node as sibling BEFORE target, both at width:50%", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // cmp_h1 is at index 0; left means new Button inserted at index 0 (before h1).
      captured.onDragEnd?.(dragEnd("palette:Button", "side:cmp_h1:left"));
      const root = getRoot();
      const secA = findById(root, "cmp_secA");
      // No FlowGroup created.
      expect(secA?.children?.find((c) => c.type === "FlowGroup")).toBeUndefined();
      // New Button at index 0 with width:50%, cmp_h1 at index 1 with width:50%.
      expect(secA?.children?.[0]?.type).toBe("Button");
      expect(secA?.children?.[0]?.style.width).toBe("50%");
      expect(secA?.children?.[1]?.id).toBe("cmp_h1");
      expect(secA?.children?.[1]?.style.width).toBe("50%");
      // cmp_h2 shifts to index 2, unchanged.
      expect(secA?.children?.[2]?.id).toBe("cmp_h2");
    });

    it("palette drop on side:cmp_x:bottom inserts as vertical sibling AFTER target", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // Drop palette:Button on side:cmp_h1:bottom
      // Result: cmp_secA > [cmp_h1, cmp_h2, new Button at idx 1]
      // Wait — h1 is at index 0, bottom means insert AFTER h1 at index 1.
      captured.onDragEnd?.(dragEnd("palette:Button", "side:cmp_h1:bottom"));
      const root = getRoot();
      const secA = findById(root, "cmp_secA");
      // No FlowGroup; h1 stays, new Button inserted after h1 (at index 1), h2 shifts to index 2.
      expect(secA?.children?.find((c) => c.type === "FlowGroup")).toBeUndefined();
      expect(secA?.children?.[0]?.id).toBe("cmp_h1");
      expect(secA?.children?.[1]?.type).toBe("Button");
      expect(secA?.children?.[2]?.id).toBe("cmp_h2");
    });

    it("palette drop on side:cmp_x:top inserts as vertical sibling BEFORE target", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // Drop palette:Button on side:cmp_h1:top
      // h1 is at index 0; top means insert BEFORE h1 at index 0.
      captured.onDragEnd?.(dragEnd("palette:Button", "side:cmp_h1:top"));
      const root = getRoot();
      const secA = findById(root, "cmp_secA");
      expect(secA?.children?.find((c) => c.type === "FlowGroup")).toBeUndefined();
      expect(secA?.children?.[0]?.type).toBe("Button");
      expect(secA?.children?.[1]?.id).toBe("cmp_h1");
      expect(secA?.children?.[2]?.id).toBe("cmp_h2");
    });

    it("node drop on side:cmp_x:right moves dragged node as flat sibling, both at width:50%", () => {
      render(
        <DndCanvasProvider>
          <div />
        </DndCanvasProvider>,
      );
      // Arrange: cmp_secA > [cmp_h1, cmp_h2].
      // Drop node:cmp_h2 on side:cmp_h1:right.
      // Result: cmp_secA > [cmp_h1(50%), cmp_h2(50%)]. No FlowGroup.
      captured.onDragEnd?.(dragEnd("node:cmp_h2", "side:cmp_h1:right"));
      const root = getRoot();
      const secA = findById(root, "cmp_secA");
      // No FlowGroup created.
      expect(secA?.children?.find((c) => c.type === "FlowGroup")).toBeUndefined();
      expect(secA?.children).toHaveLength(2);
      expect(secA?.children?.[0]?.id).toBe("cmp_h1");
      expect(secA?.children?.[0]?.style.width).toBe("50%");
      expect(secA?.children?.[1]?.id).toBe("cmp_h2");
      expect(secA?.children?.[1]?.style.width).toBe("50%");
      expect(useEditorStore.getState().saveState).toBe("dirty");
    });
  });
});
