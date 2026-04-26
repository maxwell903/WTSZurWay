"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type SectionEditPanelProps = { node: ComponentNode };

export function SectionEditPanel(_props: SectionEditPanelProps) {
  return (
    <div
      data-component-edit-panel="Section"
      data-testid="content-placeholder-section"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Section is a structural container; the Style tab handles layout and the Pages tab handles
        its position.
      </p>
    </div>
  );
}
