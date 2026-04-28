"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";

type Alignment = "left" | "center" | "right" | "justify";

const ALIGNMENTS: { value: Alignment; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
];

const ALIGN_BLOCK_TYPES = ["paragraph", "heading"];

export function AlignmentGroup({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  return (
    <fieldset aria-label="Text alignment" className="flex items-center gap-0.5 border-0 p-0 m-0">
      {ALIGNMENTS.map(({ value, label, Icon }) => {
        const isActive = commands.isBlockAttrUniform(ALIGN_BLOCK_TYPES, "textAlign", value);
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            disabled={disabled}
            onClick={() => commands.setBlockAttr(ALIGN_BLOCK_TYPES, "textAlign", value)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition",
              disabled && "cursor-not-allowed opacity-40",
              !disabled && !isActive && "text-zinc-300 hover:bg-zinc-800",
              !disabled && isActive && "bg-orange-400/20 text-orange-300",
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </fieldset>
  );
}
