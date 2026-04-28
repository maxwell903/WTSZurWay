"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { CaseUpper } from "lucide-react";

const OPTIONS: { value: "uppercase" | "lowercase" | "capitalize"; label: string }[] = [
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];

export function CasePopover({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  const current = commands.getMarkAttr("textStyle", "textTransform");

  return (
    <details className={cn("relative inline-block", disabled && "pointer-events-none opacity-40")}>
      <summary
        aria-label="Case transform"
        title="Case transform"
        className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
      >
        <CaseUpper size={14} />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1 w-44 space-y-0.5 rounded border border-zinc-700 bg-zinc-900 p-1 shadow-lg">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => commands.setMarkAttr("textStyle", { textTransform: opt.value })}
              className={cn(
                "block w-full rounded px-2 py-1 text-left text-xs",
                active ? "bg-orange-400/20 text-orange-300" : "text-zinc-200 hover:bg-zinc-800",
              )}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => commands.unsetMarkAttr("textStyle", "textTransform")}
          className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800"
        >
          None
        </button>
      </div>
    </details>
  );
}
