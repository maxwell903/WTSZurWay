"use client";

import type { ComponentVisibility } from "@/lib/editor-state";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type VisibilityTabProps = {
  node: ComponentNode;
};

type Choice = { label: string; description: string; value: "always" | "desktop" | "mobile" };

const CHOICES: Choice[] = [
  { label: "Always", description: "Show on all viewports.", value: "always" },
  { label: "Desktop only", description: "Hide on tablet and mobile.", value: "desktop" },
  { label: "Mobile only", description: "Hide on tablet and desktop.", value: "mobile" },
];

export function VisibilityTab({ node }: VisibilityTabProps) {
  const setVisibility = useEditorStore((s) => s.setComponentVisibility);
  const current: ComponentVisibility = node.visibility ?? "always";

  const writeChoice = (choice: Choice["value"]) => {
    if (choice === "always") {
      setVisibility(node.id, undefined);
      return;
    }
    setVisibility(node.id, choice);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Visibility"
      data-testid="visibility-tab"
      className="space-y-2 p-3"
    >
      {CHOICES.map((choice) => {
        const selected = choice.value === current;
        return (
          <button
            key={choice.value}
            type="button"
            // biome-ignore lint/a11y/useSemanticElements: <input type="radio"> can't host the multi-line card layout without extra wrapping; role="radio" inside the parent role="radiogroup" carries the same a11y semantics.
            role="radio"
            aria-checked={selected}
            data-testid={`visibility-card-${choice.value}`}
            onClick={() => writeChoice(choice.value)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 rounded-md border p-2 text-left transition-colors",
              selected
                ? "border-orange-400 bg-zinc-900"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
            )}
          >
            <span className="text-sm text-zinc-100">{choice.label}</span>
            <span className="text-[11px] text-zinc-500">{choice.description}</span>
          </button>
        );
      })}
    </div>
  );
}
