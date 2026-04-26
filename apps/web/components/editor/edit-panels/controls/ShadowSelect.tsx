"use client";

import { Label } from "@/components/ui/label";
import { SHADOW_PRESETS, type ShadowPreset } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type ShadowSelectProps = {
  value: ShadowPreset | undefined;
  onChange: (next: ShadowPreset | undefined) => void;
  testId?: string;
};

const LABELS: Record<ShadowPreset, string> = {
  none: "None",
  sm: "SM",
  md: "MD",
  lg: "LG",
  xl: "XL",
};

export function ShadowSelect({ value, onChange, testId }: ShadowSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-300">Box shadow</Label>
      <div
        data-testid={testId}
        role="radiogroup"
        aria-label="Box shadow"
        className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
      >
        {SHADOW_PRESETS.map((preset) => {
          const selected = preset === value;
          return (
            <button
              key={preset}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: <input type="radio"> can't be styled as a horizontal segmented button without extra wrapping; role="radio" inside the parent role="radiogroup" carries the same a11y semantics.
              role="radio"
              aria-checked={selected}
              data-testid={testId ? `${testId}-${preset}` : undefined}
              onClick={() => onChange(selected ? undefined : preset)}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[11px] transition-colors",
                selected ? "bg-orange-400/90 text-zinc-950" : "text-zinc-300 hover:text-zinc-100",
              )}
            >
              {LABELS[preset]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
