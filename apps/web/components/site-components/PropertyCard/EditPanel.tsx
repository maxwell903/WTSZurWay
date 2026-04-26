"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type PropertyCardEditPanelProps = { node: ComponentNode };

export function PropertyCardEditPanel(_props: PropertyCardEditPanelProps) {
  return (
    <div
      data-component-edit-panel="PropertyCard"
      data-testid="content-placeholder-propertycard"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Edit the property card&apos;s static fields once the PropertyCard Content panel ships.
      </p>
    </div>
  );
}
