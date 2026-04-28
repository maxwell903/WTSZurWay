"use client";

// Indent / outdent the current list item. List-only by design — indenting
// non-list paragraphs is a CSS concern handled via setStyle on the parent
// component. Caret-aware (single mode); broadcast disables both buttons
// because there's no caret position to anchor the operation.

import { useActiveTipTapEditor } from "@/components/editor/rich-text-toolbar/hooks/useActiveTipTapEditor";
import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { IndentDecrease, IndentIncrease } from "lucide-react";

export function IndentButtons({ commands }: { commands: ToolbarCommands }) {
  const editor = useActiveTipTapEditor();
  const inSingleListMode =
    commands.mode === "single" &&
    (commands.isListActive("bulletList") || commands.isListActive("orderedList"));
  const buttonsDisabled = !commands.active || !inSingleListMode || !editor;

  const buttonClass = cn(
    "inline-flex h-7 w-7 items-center justify-center rounded text-sm transition",
    buttonsDisabled && "cursor-not-allowed opacity-40",
    !buttonsDisabled && "text-zinc-300 hover:bg-zinc-800",
  );

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Decrease indent"
        title="Decrease indent (only inside a list, single-edit mode)"
        disabled={buttonsDisabled}
        onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
        className={buttonClass}
      >
        <IndentDecrease size={14} />
      </button>
      <button
        type="button"
        aria-label="Increase indent"
        title="Increase indent (only inside a list, single-edit mode)"
        disabled={buttonsDisabled}
        onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}
        className={buttonClass}
      >
        <IndentIncrease size={14} />
      </button>
    </div>
  );
}
