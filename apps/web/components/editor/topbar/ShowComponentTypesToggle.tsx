"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

// X-ray mode: when ON, every component shows a dashed grey outline + type
// pill so the user can inspect tree structure. When OFF (default since the
// 2026-04-27 evening progressive-disclosure pivot — see DECISIONS.md),
// the canvas at idle looks identical to preview; chrome appears only on
// hover, selection, or active drag.
export function ShowComponentTypesToggle() {
  const on = useEditorStore((s) => s.showComponentTypes);
  const toggle = useEditorStore((s) => s.toggleShowComponentTypes);
  const label = on ? "X-ray mode (on)" : "X-ray mode (off)";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={on}
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
