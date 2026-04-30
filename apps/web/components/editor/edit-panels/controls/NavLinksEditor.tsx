"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { PageSelect } from "./PageSelect";
import { SegmentedControl } from "./SegmentedControl";

// A NavLinkEntry is the editor-side mirror of `navLinkSchema` in
// lib/site-config/schema.ts. The two `kind` values share `label`; "page"
// entries reference a static page by slug, "external" entries hold a
// free-form URL.
//
// `children` (Sprint 14, dropdowns): top-level entries can carry a flat
// list of submenu items. The schema invariant is depth-1 — submenu items
// themselves never have `children`. The editor enforces this via the
// `allowChildren` prop: the nested editor for submenu items is rendered
// with `allowChildren={false}` and skips the submenu UI.
export type NavLinkEntry = {
  label: string;
  kind: "page" | "external";
  href?: string;
  pageSlug?: string;
  children?: NavLinkEntry[];
};

export type NavLinksEditorProps = {
  id: string;
  label?: string;
  value: NavLinkEntry[];
  onChange: (next: NavLinkEntry[]) => void;
  testId?: string;
  // Whether each entry can be expanded with a submenu. Top-level callers
  // leave this at the default `true`; the recursive call for a parent's
  // `children` passes `false` so the depth-1 invariant holds.
  allowChildren?: boolean;
  // Override the "Add link" button text — used to distinguish the
  // top-level "Add link" affordance from the nested "Add submenu item".
  addLabel?: string;
};

const KIND_OPTIONS = [
  { label: "Page", value: "page" as const },
  { label: "External", value: "external" as const },
];

export function NavLinksEditor({
  id,
  label,
  value,
  onChange,
  testId,
  allowChildren = true,
  addLabel = "Add link",
}: NavLinksEditorProps) {
  const update = (idx: number, patch: Partial<NavLinkEntry>) => {
    const next = value.slice();
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const append = () => {
    onChange([...value, { kind: "page", label: "" }]);
  };

  const setKind = (idx: number, kind: "page" | "external") => {
    const next = value.slice();
    const current = next[idx];
    if (!current) return;
    // Preserve `children` when toggling kind so a half-built submenu isn't
    // wiped out by an accidental kind flip.
    const preservedChildren = current.children;
    if (kind === "page") {
      next[idx] = {
        label: current.label,
        kind: "page",
        pageSlug: current.pageSlug,
        ...(preservedChildren ? { children: preservedChildren } : {}),
      };
    } else {
      next[idx] = {
        label: current.label,
        kind: "external",
        href: current.href ?? "",
        ...(preservedChildren ? { children: preservedChildren } : {}),
      };
    }
    onChange(next);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      {label ? <Label className="text-xs text-zinc-300">{label}</Label> : null}
      <div className="space-y-2">
        {value.map((entry, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order is the identifier; ids would require a schema change
          <div key={idx} className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                Link {idx + 1}
              </span>
              <button
                type="button"
                aria-label={`Remove link ${idx + 1}`}
                data-testid={testId ? `${testId}-remove-${idx}` : undefined}
                onClick={() => remove(idx)}
                className="text-zinc-400 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <SegmentedControl<"page" | "external">
              id={`${id}-kind-${idx}`}
              value={entry.kind}
              options={KIND_OPTIONS}
              testId={testId ? `${testId}-kind-${idx}` : undefined}
              onChange={(next) => setKind(idx, next)}
            />
            {entry.kind === "page" ? (
              <>
                <PageSelect
                  id={`${id}-page-${idx}`}
                  label="Page"
                  value={entry.pageSlug}
                  testId={testId ? `${testId}-page-${idx}` : undefined}
                  onChange={(next) => update(idx, { pageSlug: next })}
                />
                <Input
                  id={`${id}-label-${idx}`}
                  data-testid={testId ? `${testId}-label-${idx}` : undefined}
                  value={entry.label}
                  placeholder="Label override (optional — defaults to page name)"
                  onChange={(e) => update(idx, { label: e.target.value })}
                  className="h-8 bg-zinc-950 text-xs text-zinc-100"
                />
              </>
            ) : (
              <>
                <Input
                  id={`${id}-label-${idx}`}
                  data-testid={testId ? `${testId}-label-${idx}` : undefined}
                  value={entry.label}
                  placeholder="Label"
                  onChange={(e) => update(idx, { label: e.target.value })}
                  className="h-8 bg-zinc-950 text-xs text-zinc-100"
                />
                <Input
                  id={`${id}-href-${idx}`}
                  data-testid={testId ? `${testId}-href-${idx}` : undefined}
                  value={entry.href ?? ""}
                  placeholder="https://..."
                  onChange={(e) => update(idx, { href: e.target.value })}
                  className="h-8 bg-zinc-950 text-xs text-zinc-100"
                />
              </>
            )}
            {allowChildren ? (
              <div className="ml-1 border-l-2 border-zinc-700 pl-2">
                <NavLinksEditor
                  id={`${id}-children-${idx}`}
                  label="Submenu items"
                  value={entry.children ?? []}
                  // Empty submenu drops the `children` key entirely so the
                  // entry round-trips back to its non-dropdown shape.
                  onChange={(next) =>
                    update(idx, { children: next.length === 0 ? undefined : next })
                  }
                  testId={testId ? `${testId}-children-${idx}` : undefined}
                  allowChildren={false}
                  addLabel="Add submenu item"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={testId ? `${testId}-add` : undefined}
        onClick={append}
        className="w-full border-dashed border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900"
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
