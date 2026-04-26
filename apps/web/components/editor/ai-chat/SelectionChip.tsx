"use client";

/**
 * Reads the current selection from the editor store and renders the §8.7
 * "Editing: <ComponentType> — <componentId>" chip above the composer. When
 * nothing is selected, the chip reads "Editing: whole page".
 */

import { useEditorStore } from "@/lib/editor-state";
import { selectSelectedComponentNode } from "@/lib/editor-state/selectors";
import { cn } from "@/lib/utils";

export type SelectionChipProps = {
  className?: string;
};

export function SelectionChip({ className }: SelectionChipProps) {
  const selected = useEditorStore(selectSelectedComponentNode);

  const label = selected ? `Editing: ${selected.type} — ${selected.id}` : "Editing: whole page";

  return (
    <div
      data-testid="selection-chip"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span className="truncate">{label}</span>
    </div>
  );
}
