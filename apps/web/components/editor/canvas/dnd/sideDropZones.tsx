"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragState } from "./DropZoneIndicator";
import { type Side, sideId } from "./dnd-ids";

// Position outside the wrapper edges (negative offsets) so the inside of
// the component is free for clicks, hover, and the resize handles. The
// SideDropZones live in a thin "halo" around each component in edit mode.
const SIDE_GEOMETRY: Record<Side, string> = {
  left: "absolute inset-y-0 -left-2 w-2",
  right: "absolute inset-y-0 -right-2 w-2",
  top: "absolute inset-x-0 -top-2 h-2",
  bottom: "absolute inset-x-0 -bottom-2 h-2",
};

// 4 thin overlays anchored to a component's edges. Top/bottom add a
// vertical sibling; left/right wrap into a FlowGroup so the user gets
// horizontal-flowing siblings (Task 5.6 handles the drop intent in
// DndCanvasProvider). Each overlay is a dnd-kit droppable registered
// under `side:<targetId>:<side>`.
export function SideDropZones({ targetId }: { targetId: string }) {
  return (
    <>
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <SideDropZone key={side} targetId={targetId} side={side} />
      ))}
    </>
  );
}

function SideDropZone({ targetId, side }: { targetId: string; side: Side }) {
  const id = sideId(targetId, side);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  const dragInProgress = activeId !== null;
  // `acceptable` is derived from context state alone so it is deterministic in
  // tests and SSR — dnd-kit's `isOver` only becomes true during live pointer
  // events, which makes it unreliable for data-attribute assertions in jsdom.
  const acceptable = isAcceptable && overId === id;
  return (
    <div
      ref={setNodeRef}
      data-testid={`side-dropzone-${targetId}-${side}`}
      data-side-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      data-drag-in-progress={dragInProgress ? "true" : undefined}
      className={cn(
        SIDE_GEOMETRY[side],
        "rounded-sm transition-opacity duration-150",
        // Idle (no drag): fully invisible. The useDroppable registration
        // stays — collisions resolve correctly the moment a drag starts.
        // Drag in progress: dotted-grey idle look fades in.
        dragInProgress
          ? "border border-dashed border-zinc-400/30 bg-zinc-400/[0.05] opacity-100"
          : "opacity-0",
        dragInProgress && acceptable && "border-blue-500/60 bg-blue-500/15",
        dragInProgress && isOver && !acceptable && "border-red-500/60 bg-red-500/15",
      )}
    />
  );
}
