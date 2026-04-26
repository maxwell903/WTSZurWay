"use client";

import { PaletteDraggable } from "@/components/editor/canvas/dnd/PaletteDraggable";
import { cn } from "@/lib/utils";
import type { ComponentCatalogEntry } from "./component-catalog";

export type ComponentCardProps = {
  entry: ComponentCatalogEntry;
  selected: boolean;
  onSelect: (type: ComponentCatalogEntry["type"]) => void;
};

export function ComponentCard({ entry, selected, onSelect }: ComponentCardProps) {
  const Icon = entry.icon;
  return (
    <PaletteDraggable type={entry.type}>
      <button
        type="button"
        data-testid={`component-card-${entry.type}`}
        aria-pressed={selected}
        className={cn(
          "flex w-full flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors",
          selected
            ? "border-orange-400 bg-zinc-900"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
        )}
        onClick={() => onSelect(entry.type)}
      >
        <Icon className="h-4 w-4 text-zinc-300" />
        <span className="text-xs font-medium text-zinc-100">{entry.label}</span>
        <span className="line-clamp-2 text-[11px] leading-tight text-zinc-500">
          {entry.description}
        </span>
      </button>
    </PaletteDraggable>
  );
}
