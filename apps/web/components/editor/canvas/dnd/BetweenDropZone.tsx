"use client";

// `BetweenDropZone` is the explicit gap-droppable rendered between every
// pair of children of a "many"-policy container in edit mode (Section, Row,
// Column, Form). Its presence solves three things at once: (1) the page
// root becomes targetable even when its children fully cover its area, so
// drops above the first child / below the last actually have a target;
// (2) the user can insert a palette item at a chosen position instead of
// always appending; (3) cross-parent moves can land at a specific index.
//
// Phase 4 (Task 4.1): zones are always visible as a dotted-grey border at
// idle so the user has a clear spatial affordance in edit mode even before
// starting a drag. The inner pill overlay is removed — the outer div now
// carries the full visual: idle = dotted zinc, hover-acceptable = blue,
// hover-invalid = red. Preview/public renders skip this component entirely
// (ComponentRenderer only emits between-zones when `mode === "edit"`).

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragState } from "./DropZoneIndicator";
import { betweenId } from "./dnd-ids";

type Props = {
  parentId: string;
  index: number;
  orientation?: "vertical" | "horizontal";
};

export function BetweenDropZone({ parentId, index, orientation = "vertical" }: Props) {
  const id = betweenId(parentId, index);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  const dragInProgress = activeId !== null;
  // `acceptable` is derived from context state alone so it is deterministic in
  // tests and SSR — dnd-kit's `isOver` only becomes true during live pointer
  // events, which makes it unreliable for data-attribute assertions in jsdom.
  const acceptable = isAcceptable && overId === id;

  if (orientation === "horizontal") {
    return (
      <div
        ref={setNodeRef}
        data-testid={`between-dropzone-${parentId}-${index}`}
        data-between-id={id}
        data-acceptable={acceptable ? "true" : undefined}
        className={cn(
          "relative shrink-0 self-stretch rounded-sm border border-dashed transition-all duration-100",
          "w-4 border-zinc-400/40 bg-zinc-400/10",
          dragInProgress && "w-6",
          acceptable && "border-blue-500/60 bg-blue-500/15",
          isOver && !acceptable && "border-red-500/60 bg-red-500/15",
        )}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-testid={`between-dropzone-${parentId}-${index}`}
      data-between-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      className={cn(
        "relative w-full rounded-sm border border-dashed transition-all duration-100",
        // Always-visible dotted-grey idle, doubled height (h-4 vs old h-2).
        "h-4 border-zinc-400/40 bg-zinc-400/10",
        // Drag-active expands and tints. Acceptable = blue, invalid = red.
        dragInProgress && "h-6",
        acceptable && "border-blue-500/60 bg-blue-500/15",
        isOver && !acceptable && "border-red-500/60 bg-red-500/15",
      )}
    />
  );
}
