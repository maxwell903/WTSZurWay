"use client";

// SortableNodeContext bridges Sprint 7's DndCanvasProvider to every
// `EditModeWrapper` rendered inside the canvas. The wrapper consumes
// `useNodeSortable(id)` once per render. When the editor is in edit
// mode (`<DndCanvasProvider>` wraps the tree AND it has flagged this
// subtree as drag-active via `<SortableProviderActive>`), the hook
// returns dnd-kit's full `useSortable` state — refs, listeners,
// attributes, transform, transition, and the in-flight drag flag.
// When the provider is absent (preview mode, standalone tests), the
// hook returns `null` and the wrapper falls back to its Sprint-6/8
// behavior verbatim.
//
// Implementation note: `useSortable` is called unconditionally to
// satisfy React's rules-of-hooks. The `disabled` flag suppresses
// every sensor when no provider is active so the existing
// EditModeWrapper test suite (Sprint 5/6/8) continues to pass with
// no DndContext in scope.

import type { ComponentId } from "@/lib/editor-state";
import { useSortable } from "@dnd-kit/sortable";
import { type ReactNode, createContext, useContext } from "react";
import { nodeId } from "./dnd-ids";

const SortableProviderActiveContext = createContext(false);

export function SortableProviderActive({ children }: { children: ReactNode }) {
  return (
    <SortableProviderActiveContext.Provider value={true}>
      {children}
    </SortableProviderActiveContext.Provider>
  );
}

export type NodeSortableState = ReturnType<typeof useSortable>;

export function useNodeSortable(id: ComponentId): NodeSortableState | null {
  const active = useContext(SortableProviderActiveContext);
  const sortable = useSortable({ id: nodeId(id), disabled: !active });
  return active ? sortable : null;
}
