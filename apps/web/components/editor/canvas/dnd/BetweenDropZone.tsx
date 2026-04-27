"use client";

// `BetweenDropZone` is the explicit gap-droppable rendered between every
// pair of children of a "many"-policy container in edit mode (Section, Row,
// Column, Form). Its presence solves three things at once: (1) the page
// root becomes targetable even when its children fully cover its area, so
// drops above the first child / below the last actually have a target;
// (2) the user can insert a palette item at a chosen position instead of
// always appending; (3) cross-parent moves can land at a specific index.
//
// The zone has a small idle height/width so the user sees a visible gap
// between top-level components in edit mode (per the user's request). The
// gap expands while a drag is active so it is easier to hit. Preview/
// public renders skip this component entirely (ComponentRenderer only
// emits between-zones when `mode === "edit"`).

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
  const acceptable = isOver && isAcceptable && overId === id;

  if (orientation === "horizontal") {
    return (
      <div
        ref={setNodeRef}
        data-testid={`between-dropzone-${parentId}-${index}`}
        data-between-id={id}
        data-acceptable={acceptable ? "true" : undefined}
        className={cn(
          "relative shrink-0 self-stretch transition-all duration-100",
          dragInProgress ? "w-6" : "w-1",
        )}
      >
        {dragInProgress ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full transition-colors",
              acceptable ? "bg-blue-500" : isOver ? "bg-zinc-500/60" : "bg-blue-300/30",
            )}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-testid={`between-dropzone-${parentId}-${index}`}
      data-between-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      className={cn("relative w-full transition-all duration-100", dragInProgress ? "h-6" : "h-2")}
    >
      {dragInProgress ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full transition-colors",
            acceptable ? "bg-blue-500" : isOver ? "bg-zinc-500/60" : "bg-blue-300/30",
          )}
        />
      ) : null}
    </div>
  );
}
