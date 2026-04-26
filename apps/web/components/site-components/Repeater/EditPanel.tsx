"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type RepeaterEditPanelProps = { node: ComponentNode };

export function RepeaterEditPanel(_props: RepeaterEditPanelProps) {
  return (
    <div
      data-component-edit-panel="Repeater"
      data-testid="content-placeholder-repeater"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Repeater data binding (data source, filters, connected inputs, sort, limit) lands in Sprint
        9.
      </p>
    </div>
  );
}
