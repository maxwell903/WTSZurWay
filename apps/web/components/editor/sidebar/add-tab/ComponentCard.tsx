"use client";

import { PaletteDraggable } from "@/components/editor/canvas/dnd/PaletteDraggable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import type { ComponentCatalogEntry } from "./component-catalog";

export type ComponentCardProps = {
  entry: ComponentCatalogEntry;
  selected: boolean;
  onSelect: (type: ComponentCatalogEntry["type"]) => void;
};

export function ComponentCard({ entry, selected, onSelect }: ComponentCardProps) {
  const Icon = entry.icon;
  const xray = useEditorStore((s) => s.showComponentTypes);

  if (!xray) {
    return (
      <PaletteDraggable type={entry.type}>
        <button
          type="button"
          data-testid={`component-card-${entry.type}`}
          aria-pressed={selected}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
            selected
              ? "border-orange-400 bg-zinc-900"
              : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
          )}
          onClick={() => onSelect(entry.type)}
        >
          <Icon className="h-4 w-4 text-zinc-300" />
          <span className="text-xs font-medium text-zinc-100">{entry.label}</span>
        </button>
      </PaletteDraggable>
    );
  }

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
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full truncate text-[11px] leading-tight text-zinc-500">
                {entry.description}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {entry.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </button>
    </PaletteDraggable>
  );
}
