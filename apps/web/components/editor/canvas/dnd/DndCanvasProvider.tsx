"use client";

// `DndCanvasProvider` is the centerpiece of Sprint 7. It wraps the canvas
// renderer in dnd-kit's DndContext, configures pointer + keyboard sensors,
// and dispatches the editor-store mutators that move / reorder / insert
// components. The provider is a no-op when `previewMode === true` —
// children render unchanged, no DndContext mounts, no listeners attach,
// EditModeWrapper's `useNodeSortable` returns null.
//
// Drop intent (Sprint 7 simplification, see CLAUDE.md "Known risks"):
//   1. Palette → over: if `over` is a CONTAINER that accepts the candidate,
//      INSERT INTO at append. Otherwise REJECT (dev-only warn).
//   2. Node → over (active.id !== over.id):
//      a. Same parent  → REORDER within that parent at over's index.
//      b. Container that accepts → MOVE INTO at append.
//      c. Otherwise REJECT.
//
// Esc-during-drag is handled by dnd-kit's KeyboardSensor cancel path; the
// provider's `onDragCancel` resets the in-flight drag state, no store
// mutation occurs.

import { COMPONENT_CATALOG } from "@/components/editor/sidebar/add-tab/component-catalog";
import { selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";
import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type ReactNode, useMemo, useState } from "react";
import { DragStateProvider, type DragStateValue } from "./DropZoneIndicator";
import { SortableProviderActive } from "./SortableNodeContext";
import { createDefaultNode } from "./createDefaultNode";
import { nodeId, parseBetweenId, parseNodeId, parsePaletteId } from "./dnd-ids";
import { canAcceptChild } from "./dropTargetPolicy";

// dev-only diagnostic helper. Sprint 7 CLAUDE.md permits a single
// `console.warn` call site that lives behind a NODE_ENV guard.
function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(...args);
  }
}

type ParentInfo = { parentId: string; index: number };

function flattenNodeIds(root: ComponentNode): string[] {
  const ids: string[] = [];
  function walk(n: ComponentNode): void {
    ids.push(nodeId(n.id));
    for (const child of n.children ?? []) walk(child);
  }
  walk(root);
  return ids;
}

function buildParentLookup(root: ComponentNode): Map<string, ParentInfo> {
  const m = new Map<string, ParentInfo>();
  function walk(n: ComponentNode): void {
    (n.children ?? []).forEach((child, i) => {
      m.set(child.id, { parentId: n.id, index: i });
      walk(child);
    });
  }
  walk(root);
  return m;
}

function findNodeInTree(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}

function isInSubtree(root: ComponentNode, id: string): boolean {
  if (root.id === id) return true;
  for (const child of root.children ?? []) {
    if (isInSubtree(child, id)) return true;
  }
  return false;
}

export function DndCanvasProvider({ children }: { children: ReactNode }) {
  const previewMode = useEditorStore((s) => s.previewMode);
  if (previewMode) return <>{children}</>;
  return <DndCanvasProviderInner>{children}</DndCanvasProviderInner>;
}

function DndCanvasProviderInner({ children }: { children: ReactNode }) {
  const currentPage = useEditorStore(selectCurrentPage);
  const addComponentChild = useEditorStore((s) => s.addComponentChild);
  const moveComponent = useEditorStore((s) => s.moveComponent);
  const reorderChildren = useEditorStore((s) => s.reorderChildren);

  const [dragState, setDragState] = useState<DragStateValue>({
    activeId: null,
    overId: null,
    isAcceptable: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor),
  );

  const sortableIds = useMemo(
    () => (currentPage ? flattenNodeIds(currentPage.rootComponent) : []),
    [currentPage],
  );

  const parentLookup = useMemo(
    () =>
      currentPage ? buildParentLookup(currentPage.rootComponent) : new Map<string, ParentInfo>(),
    [currentPage],
  );

  function determineAcceptable(activeIdRaw: string, overIdRaw: string | null): boolean {
    if (!overIdRaw || !currentPage) return false;

    // Between-zone target: the gap-droppable rendered between siblings.
    const between = parseBetweenId(overIdRaw);
    if (between) {
      const parentNode = findNodeInTree(currentPage.rootComponent, between.parentId);
      if (!parentNode) return false;

      const paletteType = parsePaletteId(activeIdRaw);
      if (paletteType) {
        return canAcceptChild(parentNode, paletteType);
      }
      const draggedId = parseNodeId(activeIdRaw);
      if (!draggedId) return false;
      const draggedNode = findNodeInTree(currentPage.rootComponent, draggedId);
      if (!draggedNode) return false;
      // Cannot drop a node onto a between-zone of itself or one of its
      // descendants (that would form a cycle).
      if (isInSubtree(draggedNode, between.parentId)) return false;
      const draggedParent = parentLookup.get(draggedId);
      // Same-parent reorder is always policy-OK (it was accepted at insert).
      if (draggedParent && draggedParent.parentId === between.parentId) return true;
      return canAcceptChild(parentNode, draggedNode.type);
    }

    const overNodeId = parseNodeId(overIdRaw);
    if (!overNodeId) return false;
    const overNode = findNodeInTree(currentPage.rootComponent, overNodeId);
    if (!overNode) return false;

    const paletteType = parsePaletteId(activeIdRaw);
    if (paletteType) {
      return canAcceptChild(overNode, paletteType);
    }
    const draggedId = parseNodeId(activeIdRaw);
    if (!draggedId || draggedId === overNodeId) return false;
    const draggedNode = findNodeInTree(currentPage.rootComponent, draggedId);
    if (!draggedNode) return false;
    const draggedParent = parentLookup.get(draggedId);
    const overParent = parentLookup.get(overNodeId);
    // Same-parent reorder is always acceptable (the policy was already met
    // when the dragged node was originally inserted).
    if (draggedParent && overParent && draggedParent.parentId === overParent.parentId) {
      return true;
    }
    return canAcceptChild(overNode, draggedNode.type);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setDragState({ activeId: id, overId: null, isAcceptable: false });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setDragState({
      activeId,
      overId,
      isAcceptable: overId ? determineAcceptable(activeId, overId) : false,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragState({ activeId: null, overId: null, isAcceptable: false });
    if (!over || !currentPage) return;

    const activeIdRaw = String(active.id);
    const overIdRaw = String(over.id);

    // ============ between-zone target (insert/move at named index) ============
    const between = parseBetweenId(overIdRaw);
    if (between) {
      const parentNode = findNodeInTree(currentPage.rootComponent, between.parentId);
      if (!parentNode) return;

      const paletteType = parsePaletteId(activeIdRaw);
      if (paletteType) {
        if (!canAcceptChild(parentNode, paletteType)) {
          devWarn(
            "[between] palette drop rejected:",
            parentNode.type,
            "cannot accept",
            paletteType,
          );
          return;
        }
        try {
          addComponentChild(parentNode.id, between.index, createDefaultNode(paletteType));
        } catch (err) {
          devWarn("[between] addComponentChild rejected at apply time:", err);
        }
        return;
      }

      const draggedId = parseNodeId(activeIdRaw);
      if (!draggedId) return;
      const draggedNode = findNodeInTree(currentPage.rootComponent, draggedId);
      if (!draggedNode) return;
      if (isInSubtree(draggedNode, between.parentId)) {
        devWarn("[between] node drop rejected: cannot move into self/descendant");
        return;
      }

      const draggedParent = parentLookup.get(draggedId);
      if (draggedParent && draggedParent.parentId === between.parentId) {
        // Same-parent reorder. The between index points at the slot the user
        // wants the dragged node to occupy AFTER the move. `arrayMove`
        // operates on the current array, so when `oldIndex < destIndex` we
        // shift down by one to compensate for the dragged node being
        // removed before re-insertion.
        const ids = (parentNode.children ?? []).map((c) => c.id);
        const oldIndex = draggedParent.index;
        let destIndex = between.index;
        if (oldIndex < destIndex) destIndex -= 1;
        if (destIndex < 0) destIndex = 0;
        if (destIndex > ids.length - 1) destIndex = ids.length - 1;
        if (oldIndex === destIndex) return;
        const newOrder = arrayMove(ids, oldIndex, destIndex);
        try {
          reorderChildren(parentNode.id, newOrder);
        } catch (err) {
          devWarn("[between] reorderChildren failed:", err);
        }
        return;
      }

      // Cross-parent move at a specific index.
      if (!canAcceptChild(parentNode, draggedNode.type)) {
        devWarn(
          "[between] node drop rejected:",
          parentNode.type,
          "cannot accept",
          draggedNode.type,
        );
        return;
      }
      try {
        moveComponent(draggedId, parentNode.id, between.index);
      } catch (err) {
        devWarn("[between] moveComponent rejected at apply time:", err);
      }
      return;
    }

    const overNodeId = parseNodeId(overIdRaw);
    if (!overNodeId) return;
    const overNode = findNodeInTree(currentPage.rootComponent, overNodeId);
    if (!overNode) return;

    // ============ palette → canvas (insert) ============
    const paletteType = parsePaletteId(activeIdRaw);
    if (paletteType) {
      if (!canAcceptChild(overNode, paletteType)) {
        devWarn("[Sprint 7] palette drop rejected:", overNode.type, "cannot accept", paletteType);
        return;
      }
      const appendIndex = (overNode.children ?? []).length;
      try {
        addComponentChild(overNode.id, appendIndex, createDefaultNode(paletteType));
      } catch (err) {
        devWarn("[Sprint 7] addComponentChild rejected at apply time:", err);
      }
      return;
    }

    // ============ canvas node → canvas (move/reorder) ============
    const draggedId = parseNodeId(activeIdRaw);
    if (!draggedId || draggedId === overNodeId) return;
    const draggedNode = findNodeInTree(currentPage.rootComponent, draggedId);
    if (!draggedNode) return;

    const draggedParent = parentLookup.get(draggedId);
    const overParent = parentLookup.get(overNodeId);

    // Case A: same-parent reorder.
    if (draggedParent && overParent && draggedParent.parentId === overParent.parentId) {
      const parentNode = findNodeInTree(currentPage.rootComponent, draggedParent.parentId);
      if (!parentNode) return;
      const ids = (parentNode.children ?? []).map((c) => c.id);
      const oldIndex = draggedParent.index;
      const newIndex = overParent.index;
      if (oldIndex === newIndex) return;
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      try {
        reorderChildren(parentNode.id, newOrder);
      } catch (err) {
        devWarn("[Sprint 7] reorderChildren failed:", err);
      }
      return;
    }

    // Case B: drop INTO a container that accepts.
    if (canAcceptChild(overNode, draggedNode.type)) {
      const appendIndex = (overNode.children ?? []).length;
      try {
        moveComponent(draggedId, overNode.id, appendIndex);
      } catch (err) {
        devWarn("[Sprint 7] moveComponent rejected at apply time:", err);
      }
      return;
    }

    // Case C: reject (dev-only warn).
    devWarn("[Sprint 7] node drop rejected:", overNode.type, "cannot accept", draggedNode.type);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setDragState({ activeId: null, overId: null, isAcceptable: false });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <SortableProviderActive>
          <DragStateProvider value={dragState}>{children}</DragStateProvider>
        </SortableProviderActive>
      </SortableContext>
      <DragOverlay>{renderDragOverlay(dragState, currentPage?.rootComponent ?? null)}</DragOverlay>
    </DndContext>
  );
}

function renderDragOverlay(state: DragStateValue, root: ComponentNode | null): ReactNode {
  if (!state.activeId) return null;
  const paletteType = parsePaletteId(state.activeId);
  if (paletteType) {
    const entry = COMPONENT_CATALOG.find((e) => e.type === paletteType);
    if (!entry) return null;
    const Icon = entry.icon;
    return (
      <div
        data-testid="drag-overlay"
        data-overlay-kind="palette"
        className="flex items-center gap-2 rounded-md border border-blue-400 bg-zinc-900 px-3 py-2 text-zinc-100 shadow-lg"
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{entry.label}</span>
      </div>
    );
  }
  const draggedId = parseNodeId(state.activeId);
  if (!draggedId || !root) return null;
  const node = findNodeInTree(root, draggedId);
  if (!node) return null;
  return (
    <div
      data-testid="drag-overlay"
      data-overlay-kind="node"
      className="rounded-md border border-blue-400 bg-zinc-900 px-3 py-2 text-zinc-100 shadow-lg"
    >
      <span className="text-xs font-medium">{node.type}</span>
    </div>
  );
}
