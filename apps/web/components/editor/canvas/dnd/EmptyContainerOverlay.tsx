"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragState } from "./DropZoneIndicator";
import { dropZoneId } from "./dnd-ids";

// Renders the dotted-grey "Drop a component here" panel inside containers
// (Section, Row, Column, FlowGroup, Form, Repeater) that have zero children
// — only in edit mode. Registered as a dnd-kit droppable so a drag releasing
// here lands as the container's first child.
export function EmptyContainerOverlay({ parentId }: { parentId: string }) {
  const id = dropZoneId(parentId);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  // `acceptable` is derived from context state alone so it is deterministic in
  // tests and SSR — dnd-kit's `isOver` only becomes true during live pointer
  // events, which makes it unreliable for data-attribute assertions in jsdom.
  const acceptable = isAcceptable && overId === id;
  return (
    <div
      ref={setNodeRef}
      data-testid={`empty-container-overlay-${parentId}`}
      data-dropzone-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      className={cn(
        "flex min-h-[64px] w-full items-center justify-center rounded-sm border border-dashed text-[11px] transition-all duration-100",
        "border-zinc-400/40 bg-zinc-400/10 text-zinc-500",
        activeId && acceptable && "border-blue-500/60 bg-blue-500/15 text-blue-700",
        activeId && isOver && !acceptable && "border-red-500/60 bg-red-500/15 text-red-700",
      )}
    >
      Drop a component here
    </div>
  );
}
