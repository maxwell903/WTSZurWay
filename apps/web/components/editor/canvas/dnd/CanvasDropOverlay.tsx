"use client";

import { cn } from "@/lib/utils";

// Decorative-only overlay that fills the canvas area surrounding the page
// frame in edit mode. Tells the user "this empty space isn't a section,
// it's just canvas." Pointer-events:none so it doesn't capture clicks or
// drags — the underlying radial-dot Canvas background handles those.
export function CanvasDropOverlay() {
  return (
    <div
      data-testid="canvas-drop-overlay"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 m-2 rounded border border-dashed",
        "border-zinc-400/30 bg-zinc-400/[0.04]",
      )}
    />
  );
}
