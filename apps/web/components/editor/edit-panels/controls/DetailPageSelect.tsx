"use client";

import { useEditorStore } from "@/lib/editor-state";
import { useMemo } from "react";
import { SelectInput } from "./SelectInput";

export type DetailPageSelectProps = {
  id: string;
  label?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  testId?: string;
};

const EMPTY_PLACEHOLDER = "Add a detail page from the Pages tab first.";

export function DetailPageSelect({ id, label, value, onChange, testId }: DetailPageSelectProps) {
  // Subscribe to the raw pages array (referentially stable when not mutated)
  // and derive the filtered/sorted list locally so we never return a fresh
  // array from a Zustand selector (which would re-trigger render every tick).
  const allPages = useEditorStore((s) => s.draftConfig.pages);
  const detailPages = useMemo(
    () =>
      allPages
        .filter((p) => p.kind === "detail")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPages],
  );

  if (detailPages.length === 0) {
    return (
      <div className="space-y-1.5" data-testid={testId}>
        {label ? (
          <label htmlFor={id} className="text-xs text-zinc-300">
            {label}
          </label>
        ) : null}
        <select
          id={id}
          data-testid={testId ? `${testId}-empty` : undefined}
          disabled
          className="h-9 w-full cursor-not-allowed rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-500 opacity-70"
        >
          <option>{EMPTY_PLACEHOLDER}</option>
        </select>
      </div>
    );
  }

  // Detail page names may collide; surface the slug in parentheses when so.
  const nameCounts = new Map<string, number>();
  for (const page of detailPages) {
    nameCounts.set(page.name, (nameCounts.get(page.name) ?? 0) + 1);
  }
  const options = detailPages.map((page) => ({
    label: (nameCounts.get(page.name) ?? 0) > 1 ? `${page.name} (${page.slug})` : page.name,
    value: page.slug,
  }));

  // If the current value is not in the option list, prepend a stub so the user
  // sees the dangling selection rather than silently snapping to the first.
  const knownSlugs = new Set(detailPages.map((p) => p.slug));
  const current = value ?? "";
  const finalOptions =
    current && !knownSlugs.has(current)
      ? [{ label: `${current} (missing)`, value: current }, ...options]
      : options;

  return (
    <SelectInput
      id={id}
      label={label}
      value={current || (finalOptions[0]?.value ?? "")}
      options={finalOptions}
      testId={testId}
      onChange={(next) => onChange(next === "" ? undefined : next)}
    />
  );
}
