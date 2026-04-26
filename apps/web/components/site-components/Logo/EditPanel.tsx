"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type LogoEditPanelProps = { node: ComponentNode };

export function LogoEditPanel(_props: LogoEditPanelProps) {
  return (
    <div
      data-component-edit-panel="Logo"
      data-testid="content-placeholder-logo"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Edit the logo source and alt text once the Logo Content panel ships.
      </p>
    </div>
  );
}
