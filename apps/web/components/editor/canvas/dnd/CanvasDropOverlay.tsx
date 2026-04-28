"use client";

import { cn } from "@/lib/utils";
import { useDragState } from "./DropZoneIndicator";

// Decorative-only overlay that fills the canvas area surrounding the page
// frame. Tells the user "this empty space isn't a section, it's just canvas."
// Pointer-events:none so it doesn't capture clicks or drags — the underlying
// radial-dot Canvas background handles those.
//
// Visibility (progressive disclosure — see DECISIONS.md 2026-04-27 evening):
// invisible at idle, fades in when a drag is in progress so the user can
// distinguish canvas-empty-space from page-empty-space during a drag.
export function CanvasDropOverlay() {
  const { activeId } = useDragState();
  const dragInProgress = activeId !== null;
  return (
    <div
      data-testid="canvas-drop-overlay"
      data-drag-in-progress={dragInProgress ? "true" : undefined}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 m-2 rounded border border-dashed transition-opacity duration-150",
        "border-zinc-400/30 bg-zinc-400/[0.04]",
        dragInProgress ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
