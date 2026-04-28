"use client";

// Generic toolbar button for an inline mark (bold, italic, underline, …).
// Reads/writes through the unified `ToolbarCommands` so the same button
// works in single + broadcast mode.

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type MarkButtonProps = {
  commands: ToolbarCommands;
  markName: string;
  ariaLabel: string;
  shortcut?: string;
  children: ReactNode;
};

export function MarkButton({ commands, markName, ariaLabel, shortcut, children }: MarkButtonProps) {
  const isActive = commands.isMarkActive(markName);
  const disabled = !commands.active;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      title={shortcut ? `${ariaLabel} (${shortcut})` : ariaLabel}
      disabled={disabled}
      onClick={() => commands.toggleMark(markName)}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition",
        disabled && "cursor-not-allowed opacity-40",
        !disabled && !isActive && "text-zinc-300 hover:bg-zinc-800",
        !disabled && isActive && "bg-orange-400/20 text-orange-300",
      )}
    >
      {children}
    </button>
  );
}
