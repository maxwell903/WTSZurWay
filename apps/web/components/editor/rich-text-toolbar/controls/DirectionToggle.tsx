"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";

const DIRECTION_BLOCK_TYPES = ["paragraph", "heading"];

export function DirectionToggle({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  // In broadcast we can't show a single uniform value if docs disagree —
  // default to "ltr" and let the click flip everything to "rtl".
  const current = commands.getBlockAttr(DIRECTION_BLOCK_TYPES, "dir") ?? "ltr";
  const next = current === "rtl" ? "ltr" : "rtl";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next.toUpperCase()}`}
      title={`Text direction: ${current.toUpperCase()} (click to flip)`}
      disabled={disabled}
      onClick={() => commands.setBlockAttr(DIRECTION_BLOCK_TYPES, "dir", next)}
      className={cn(
        "inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded px-1.5 text-[10px] font-semibold uppercase tracking-wider transition",
        disabled && "cursor-not-allowed opacity-40",
        !disabled && current === "ltr" && "text-zinc-300 hover:bg-zinc-800",
        !disabled && current === "rtl" && "bg-orange-400/20 text-orange-300",
      )}
    >
      {current}
    </button>
  );
}
