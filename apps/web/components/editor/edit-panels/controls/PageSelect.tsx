"use client";

import { useEditorStore } from "@/lib/editor-state";
import { useMemo } from "react";
import { SelectInput } from "./SelectInput";

export type PageSelectProps = {
  id: string;
  label?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  testId?: string;
};

const EMPTY_PLACEHOLDER = "Add a page from the Pages tab first.";

// Mirrors DetailPageSelect but filters to `kind === "static"`. Used by NavBar
// link entries (kind: "page") and Button (linkMode: "page") to pick the
// internal page a link points to.
export function PageSelect({ id, label, value, onChange, testId }: PageSelectProps) {
  const allPages = useEditorStore((s) => s.draftConfig.pages);
  const staticPages = useMemo(
    () =>
      allPages
        .filter((p) => p.kind === "static")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPages],
  );

  if (staticPages.length === 0) {
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

  const nameCounts = new Map<string, number>();
  for (const page of staticPages) {
    nameCounts.set(page.name, (nameCounts.get(page.name) ?? 0) + 1);
  }
  const options = staticPages.map((page) => ({
    label: (nameCounts.get(page.name) ?? 0) > 1 ? `${page.name} (${page.slug})` : page.name,
    value: page.slug,
  }));

  const knownSlugs = new Set(staticPages.map((p) => p.slug));
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
