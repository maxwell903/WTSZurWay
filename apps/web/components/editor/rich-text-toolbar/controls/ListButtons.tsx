"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { List, ListOrdered } from "lucide-react";

export function ListButtons({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;

  const buttonClass = (active: boolean) =>
    cn(
      "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition",
      disabled && "cursor-not-allowed opacity-40",
      !disabled && !active && "text-zinc-300 hover:bg-zinc-800",
      !disabled && active && "bg-orange-400/20 text-orange-300",
    );

  const bulletActive = commands.isListActive("bulletList");
  const orderedActive = commands.isListActive("orderedList");

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Bullet list"
        aria-pressed={bulletActive}
        title="Bullet list"
        disabled={disabled}
        onClick={() => commands.toggleList("bulletList")}
        className={buttonClass(bulletActive)}
      >
        <List size={14} />
      </button>
      <button
        type="button"
        aria-label="Numbered list"
        aria-pressed={orderedActive}
        title="Numbered list"
        disabled={disabled}
        onClick={() => commands.toggleList("orderedList")}
        className={buttonClass(orderedActive)}
      >
        <ListOrdered size={14} />
      </button>
    </div>
  );
}
