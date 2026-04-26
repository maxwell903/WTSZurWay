"use client";

import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type HeroBannerEditPanelProps = { node: ComponentNode };

export function HeroBannerEditPanel(_props: HeroBannerEditPanelProps) {
  return (
    <div
      data-component-edit-panel="HeroBanner"
      data-testid="content-placeholder-herobanner"
      className="space-y-2 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Edit the hero&apos;s heading, sub-heading, CTA, and background once the HeroBanner Content
        panel ships.
      </p>
    </div>
  );
}
