"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

// Toggles the canvas-wide outline + type-label overlay used by editors
// to disambiguate parent vs child when their backgrounds collide.
// Transient — defaults ON every editor load (no persistence per design).
export function ShowComponentTypesToggle() {
  const on = useEditorStore((s) => s.showComponentTypes);
  const toggle = useEditorStore((s) => s.toggleShowComponentTypes);
  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Hide component types" : "Show component types"}
      aria-label={on ? "Hide component types" : "Show component types"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        on
          ? "bg-zinc-800 text-orange-400"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
      )}
    >
      <LayoutGrid className="h-4 w-4" />
    </button>
  );
}
