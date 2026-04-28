"use client";

// Link button. Caret-aware — disabled in broadcast mode because there's no
// selection range to apply the link to.

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { Link as LinkIcon } from "lucide-react";

export function LinkButton({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active || !commands.supportsLink;
  const isActive = commands.isMarkActive("link");

  const handleClick = () => {
    if (disabled) return;
    if (isActive) {
      commands.setLink(null);
      return;
    }
    const previous = commands.getMarkAttr("link", "href");
    const next = window.prompt("Link URL", previous ?? "https://");
    if (next === null) return;
    if (next === "") {
      commands.setLink(null);
      return;
    }
    commands.setLink(next);
  };

  return (
    <button
      type="button"
      aria-label={isActive ? "Remove link" : "Add link"}
      aria-pressed={isActive}
      title={
        commands.mode === "broadcast"
          ? "Link unavailable in broadcast mode (needs caret position)"
          : isActive
            ? "Remove link (Ctrl+K)"
            : "Add link (Ctrl+K)"
      }
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition",
        disabled && "cursor-not-allowed opacity-40",
        !disabled && !isActive && "text-zinc-300 hover:bg-zinc-800",
        !disabled && isActive && "bg-orange-400/20 text-orange-300",
      )}
    >
      <LinkIcon size={14} />
    </button>
  );
}
