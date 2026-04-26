"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type LinkEntry = { label: string; href: string };

export type LinksEditorProps = {
  id: string;
  label?: string;
  value: LinkEntry[];
  onChange: (next: LinkEntry[]) => void;
  testId?: string;
};

export function LinksEditor({ id, label, value, onChange, testId }: LinksEditorProps) {
  const update = (idx: number, patch: Partial<LinkEntry>) => {
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
    onChange([...value, { label: "", href: "" }]);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      {label ? <Label className="text-xs text-zinc-300">{label}</Label> : null}
      <div className="space-y-2">
        {value.map((entry, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order is the identifier; ids would require a schema change
          <div key={idx} className="space-y-1 rounded-md border border-zinc-800 bg-zinc-900 p-2">
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
              value={entry.href}
              placeholder="/path-or-url"
              onChange={(e) => update(idx, { href: e.target.value })}
              className="h-8 bg-zinc-950 text-xs text-zinc-100"
            />
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
        <Plus className="mr-1 h-3.5 w-3.5" /> Add link
      </Button>
    </div>
  );
}
