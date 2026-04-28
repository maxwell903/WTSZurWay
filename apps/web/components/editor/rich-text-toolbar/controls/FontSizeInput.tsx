"use client";

// Font size as a free-form text input (e.g., "16px", "1.25em", "120%").

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function FontSizeInput({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  const live = commands.getMarkAttr("textStyle", "fontSize") ?? "";
  const [draft, setDraft] = useState(live);

  // Reset the draft when the caret moves to a span with a different size
  // (single mode) — broadcast keeps the draft empty since values may
  // diverge across docs.
  useEffect(() => {
    setDraft(live);
  }, [live]);

  const commit = () => {
    if (!commands.active) return;
    const trimmed = draft.trim();
    if (trimmed === "") {
      commands.unsetMarkAttr("textStyle", "fontSize");
      return;
    }
    commands.setMarkAttr("textStyle", { fontSize: trimmed });
  };

  return (
    <input
      type="text"
      aria-label="Font size"
      title="Font size (e.g. 16px, 1.25em, 120%)"
      placeholder="size"
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={cn(
        "h-7 w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200",
        disabled && "cursor-not-allowed opacity-40",
      )}
    />
  );
}
