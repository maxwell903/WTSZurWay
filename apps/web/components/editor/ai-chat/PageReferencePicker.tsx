"use client";

/**
 * Hotfix 2026-04-30: lets the demo operator pin extra pages as
 * reference for the AI Edit call. The orchestrator embeds the full
 * subtree of every pinned slug (plus the currently edited page) in the
 * system prompt, while everything else collapses to a one-line
 * skeleton. This unlocks "build the testimonials page styled like the
 * About page" without sending the whole site.
 *
 * Single-file component. Reads pages and the current slug from the
 * editor store; the parent owns the pinned-set state so it can be
 * passed to `send()` at submit time.
 */

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";

export type PageReferencePickerProps = {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  className?: string;
};

export function PageReferencePicker({
  selectedSlugs,
  onChange,
  className,
}: PageReferencePickerProps) {
  const pages = useEditorStore((s) => s.draftConfig.pages);
  const currentPageSlug = useEditorStore((s) => s.currentPageSlug);

  const others = pages.filter((p) => p.slug !== currentPageSlug);
  if (others.length === 0) return null;

  const selected = new Set(selectedSlugs);

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange(Array.from(next));
  }

  return (
    <div
      data-testid="page-reference-picker"
      className={cn("space-y-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 p-2", className)}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Reference pages
        </span>
        <span className="text-[10px] text-zinc-500">AI sees pinned pages in full</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {others.map((page) => {
          const active = selected.has(page.slug);
          return (
            <button
              key={`${page.kind}:${page.slug}`}
              type="button"
              data-testid="page-reference-chip"
              data-active={active}
              onClick={() => toggle(page.slug)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                active
                  ? "border-blue-500 bg-blue-600/30 text-blue-100"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600",
              )}
            >
              {page.name ?? page.slug}
            </button>
          );
        })}
      </div>
    </div>
  );
}
