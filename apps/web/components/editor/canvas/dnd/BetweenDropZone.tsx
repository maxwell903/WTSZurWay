"use client";

// `BetweenDropZone` is the explicit gap-droppable rendered between every
// pair of children of a "many"-policy container in edit mode (Section, Row,
// Column, Form). Its presence solves three things at once: (1) the page
// root becomes targetable even when its children fully cover its area, so
// drops above the first child / below the last actually have a target;
// (2) the user can insert a palette item at a chosen position instead of
// always appending; (3) cross-parent moves can land at a specific index.
//
// Visibility model (progressive disclosure — see DECISIONS.md 2026-04-27 evening):
//   - At idle (no drag in progress) the zone collapses to `h-0` / `w-0` and
//     `opacity-0` so edit mode at rest matches preview-mode layout exactly
//     (no "phantom" 16-px gap between siblings).
//   - On drag-start, `useDragState().activeId !== null` flips, the zone
//     expands to `h-4` / `w-4` and fades in to the dotted-grey idle look.
//   - On hover-during-drag, the existing isOver/acceptable colour tints
//     apply on top (blue if `canAcceptChild` allows, red if not).
//   - The `useDroppable` registration is preserved at all times — the
//     dnd-kit hit-test still resolves correctly because the rect is non-zero
//     by the time the user can hover over a zone (drag-start re-renders
//     before the first collision check).
// Preview/public renders skip this component entirely (ComponentRenderer
// only emits between-zones when `mode === "edit"`).

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import { useDragState } from "./DropZoneIndicator";
import { betweenId } from "./dnd-ids";

type Props = {
  parentId: string;
  index: number;
  orientation?: "vertical" | "horizontal";
  // The parent container's CSS `gap` value (in px). Each interleaved
  // BetweenDropZone sits between two real children of a flex parent, and
  // CSS `gap` would normally apply on BOTH sides of the BZ — turning one
  // gap-between-cards into two. Applying a negative margin equal to the
  // parent's gap on the main-axis-start side cancels exactly one of those
  // duplicated gaps, so the cumulative inter-card spacing in edit mode
  // matches preview mode (which has no BZs). Defaults to 0 for parents
  // with no flex gap (Section in block layout, Form, etc.).
  parentGap?: number;
};

export function BetweenDropZone({
  parentId,
  index,
  orientation = "vertical",
  parentGap = 0,
}: Props) {
  const id = betweenId(parentId, index);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  const dragInProgress = activeId !== null;
  // `acceptable` is derived from context state alone so it is deterministic in
  // tests and SSR — dnd-kit's `isOver` only becomes true during live pointer
  // events, which makes it unreliable for data-attribute assertions in jsdom.
  const acceptable = isAcceptable && overId === id;

  // Negative margin to cancel one of the two surrounding gaps (see comment
  // on `parentGap` above). Applied via inline style so callers can pass any
  // numeric gap value without us needing matching Tailwind classes.
  const gapAbsorbStyle: CSSProperties =
    parentGap > 0
      ? orientation === "horizontal"
        ? { marginLeft: -parentGap }
        : { marginTop: -parentGap }
      : {};

  if (orientation === "horizontal") {
    return (
      <div
        ref={setNodeRef}
        data-testid={`between-dropzone-${parentId}-${index}`}
        data-between-id={id}
        data-acceptable={acceptable ? "true" : undefined}
        data-drag-in-progress={dragInProgress ? "true" : undefined}
        style={gapAbsorbStyle}
        className={cn(
          "relative shrink-0 self-stretch rounded-sm transition-opacity duration-150",
          dragInProgress
            ? "w-4 border border-dashed border-zinc-400/40 bg-zinc-400/10 opacity-100"
            : "w-0 opacity-0",
          dragInProgress && isOver && "w-6",
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
      data-drag-in-progress={dragInProgress ? "true" : undefined}
      style={gapAbsorbStyle}
      className={cn(
        "relative w-full rounded-sm transition-opacity duration-150",
        // Idle: collapsed + invisible so edit-mode layout matches preview.
        // Drag-in-progress: dotted-grey idle look (16-px tall; 24-px on hover).
        dragInProgress
          ? "h-4 border border-dashed border-zinc-400/40 bg-zinc-400/10 opacity-100"
          : "h-0 opacity-0",
        dragInProgress && isOver && "h-6",
        acceptable && "border-blue-500/60 bg-blue-500/15",
        isOver && !acceptable && "border-red-500/60 bg-red-500/15",
      )}
    />
  );
}
