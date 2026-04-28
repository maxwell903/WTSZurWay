"use client";

// Line-height + letter-spacing popover. line-height is a block attr on
// paragraph/heading; letter-spacing is a TextStyle mark attr.

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { Rows3 } from "lucide-react";

const SPACING_BLOCK_TYPES = ["paragraph", "heading"];

export function SpacingPopover({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;

  const lineHeight = commands.getBlockAttr(SPACING_BLOCK_TYPES, "lineHeight") ?? "";
  const letterSpacing = commands.getMarkAttr("textStyle", "letterSpacing") ?? "";

  const setLineHeight = (value: string) => {
    if (value === "") commands.unsetBlockAttr(SPACING_BLOCK_TYPES, "lineHeight");
    else commands.setBlockAttr(SPACING_BLOCK_TYPES, "lineHeight", value);
  };
  const setLetterSpacing = (value: string) => {
    if (value === "") commands.unsetMarkAttr("textStyle", "letterSpacing");
    else commands.setMarkAttr("textStyle", { letterSpacing: value });
  };

  return (
    <details className={cn("relative inline-block", disabled && "pointer-events-none opacity-40")}>
      <summary
        aria-label="Spacing"
        title="Line height & letter spacing"
        className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
      >
        <Rows3 size={14} />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1 w-56 space-y-2 rounded border border-zinc-700 bg-zinc-900 p-2 shadow-lg">
        <label className="block text-[11px] text-zinc-300">
          Line height
          <input
            type="text"
            placeholder="1.5"
            defaultValue={lineHeight}
            onBlur={(e) => setLineHeight(e.currentTarget.value.trim())}
            className="mt-0.5 h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 text-xs text-zinc-200"
          />
        </label>
        <label className="block text-[11px] text-zinc-300">
          Letter spacing
          <input
            type="text"
            placeholder="0.02em"
            defaultValue={letterSpacing}
            onBlur={(e) => setLetterSpacing(e.currentTarget.value.trim())}
            className="mt-0.5 h-7 w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 text-xs text-zinc-200"
          />
        </label>
      </div>
    </details>
  );
}
