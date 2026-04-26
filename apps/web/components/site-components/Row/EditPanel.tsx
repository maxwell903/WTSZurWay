"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type RowEditPanelProps = { node: ComponentNode };

export function RowEditPanel(_props: RowEditPanelProps) {
  return (
    <div
      data-component-edit-panel="Row"
      data-testid="content-placeholder-row"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Edit Row props (gap, alignment, wrap) once the Row Content panel ships.
      </p>
    </div>
  );
}
