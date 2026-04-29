"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WithTooltip } from "./with-tooltip";

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string> = {
  id?: string;
  label?: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  testId?: string;
  tooltip?: string;
};

export function SegmentedControl<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  testId,
  tooltip,
}: SegmentedControlProps<T>) {
  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-1.5">
        {label ? (
          <Label htmlFor={id} className="text-xs text-zinc-300">
            {label}
          </Label>
        ) : null}
        <div
          id={id}
          data-testid={testId}
          role="radiogroup"
          aria-label={label}
          className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                // biome-ignore lint/a11y/useSemanticElements: <input type="radio"> can't be styled as a horizontal segmented button without extra wrapping; role="radio" inside the parent role="radiogroup" carries the same a11y semantics.
                role="radio"
                aria-checked={selected}
                data-testid={testId ? `${testId}-${opt.value}` : undefined}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex-1 rounded px-2 py-1 text-xs transition-colors",
                  selected ? "bg-orange-400/90 text-zinc-950" : "text-zinc-300 hover:text-zinc-100",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </WithTooltip>
  );
}
