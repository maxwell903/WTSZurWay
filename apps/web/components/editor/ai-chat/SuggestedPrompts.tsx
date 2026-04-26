"use client";

/**
 * Renders 3-4 suggested-prompt chips below the composer (PROJECT_SPEC.md
 * §8.7). Clicking a chip prefills the composer via the `onPick` callback.
 * The mapping table lives in `suggested-prompts.ts`.
 */

import { useEditorStore } from "@/lib/editor-state";
import { selectSelectedComponentNode } from "@/lib/editor-state/selectors";
import { cn } from "@/lib/utils";
import { suggestionsForSelection } from "./suggested-prompts";

export type SuggestedPromptsProps = {
  onPick: (prompt: string) => void;
  className?: string;
};

export function SuggestedPrompts({ onPick, className }: SuggestedPromptsProps) {
  const selected = useEditorStore(selectSelectedComponentNode);
  const suggestions = suggestionsForSelection(selected);

  if (suggestions.length === 0) return null;

  return (
    <div data-testid="suggested-prompts" className={cn("flex flex-wrap gap-1.5", className)}>
      {suggestions.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPick(prompt)}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
