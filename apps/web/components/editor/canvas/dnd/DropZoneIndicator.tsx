"use client";

// `DropZoneIndicator` is the 4-px accent bar that highlights the current
// drop target during a drag. The DndCanvasProvider broadcasts the active /
// over / acceptable state via `DragStateContext`; every EditModeWrapper
// renders one of these inside itself, and the indicator self-decides
// whether to draw based on whether THIS wrapper's id matches the current
// over target. When no drag is in progress (or the indicator is rendered
// outside a DndCanvasProvider — preview mode, standalone tests) the
// component returns null and emits no DOM.

import { cn } from "@/lib/utils";
import { type ReactNode, createContext, useContext } from "react";

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

export function DropZoneIndicator({ id }: { id: string }) {
  const { activeId, overId, isAcceptable } = useDragState();
  if (!activeId) return null;
  if (overId !== id) return null;
  return (
    <div
      data-testid={`dropzone-indicator-${id}`}
      data-dropzone-id={id}
      data-acceptable={isAcceptable ? "true" : "false"}
      className={cn(
        "pointer-events-none absolute -top-0.5 left-0 right-0 h-1 rounded-full",
        isAcceptable ? "bg-blue-500" : "bg-zinc-500/60",
      )}
    />
  );
}
