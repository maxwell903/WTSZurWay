"use client";

import { Info } from "lucide-react";

export function AdvancedTab() {
  return (
    <div data-testid="advanced-tab-placeholder" className="space-y-2 p-3 text-zinc-400">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Custom CSS class & HTML id</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        These escape hatches will land once the SiteConfig schema gains{" "}
        <code className="rounded bg-zinc-900 px-1 text-[11px] text-zinc-300">htmlId</code> and{" "}
        <code className="rounded bg-zinc-900 px-1 text-[11px] text-zinc-300">className</code> fields
        on <code className="rounded bg-zinc-900 px-1 text-[11px] text-zinc-300">ComponentNode</code>
        . See{" "}
        <code className="rounded bg-zinc-900 px-1 text-[11px] text-zinc-300">DECISIONS.md</code> for
        the planned schema amendment.
      </p>
    </div>
  );
}
