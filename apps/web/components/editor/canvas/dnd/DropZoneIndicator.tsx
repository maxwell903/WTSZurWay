"use client";

// `DropZoneIndicator` previously drew a 4-px blue accent bar over the active
// drop target during a drag. That role is now fully covered by the dotted-grey
// overlay system in BetweenDropZone, sideDropZones, and EmptyContainerOverlay
// (Task 4.1). The component is kept exported so callers (EditModeWrapper) still
// compile during the transition; its body always returns null.
//
// The DndCanvasProvider broadcasts active / over / acceptable state via
// `DragStateContext`; those exports remain in use by BetweenDropZone and the
// new overlay components.

import { type ReactNode, createContext, useContext } from "react";

// `overId` is the RAW dnd-kit `over.id` (e.g. `node:cmp_x`,
// `between:cmp_p:0`, `palette:Heading`). Consumers parse the prefix they
// care about — `BetweenDropZone` does an exact-string match against its own
// `between:…` id.
export type DragStateValue = {
  activeId: string | null;
  overId: string | null;
  isAcceptable: boolean;
};

const DEFAULT_STATE: DragStateValue = {
  activeId: null,
  overId: null,
  isAcceptable: false,
};

const DragStateContext = createContext<DragStateValue>(DEFAULT_STATE);

export function DragStateProvider({
  value,
  children,
}: {
  value: DragStateValue;
  children: ReactNode;
}) {
  return <DragStateContext.Provider value={value}>{children}</DragStateContext.Provider>;
}

export function useDragState(): DragStateValue {
  return useContext(DragStateContext);
}

export function DropZoneIndicator(_: { id: string }) {
  // The dotted-grey overlay system in BetweenDropZone, sideDropZones, and
  // EmptyContainerOverlay subsumes the 4-px blue accent line that lived
  // here. Kept exported so callers (EditModeWrapper) compile during the
  // transition. Future cleanup may inline-delete the call site entirely.
  return null;
}
