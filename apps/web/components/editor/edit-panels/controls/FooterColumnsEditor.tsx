"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { type LinkEntry, LinksEditor } from "./LinksEditor";

export type FooterColumn = {
  title: string;
  links: LinkEntry[];
};

export type FooterColumnsEditorProps = {
  id: string;
  value: FooterColumn[];
  onChange: (next: FooterColumn[]) => void;
  testId?: string;
};

export function FooterColumnsEditor({ id, value, onChange, testId }: FooterColumnsEditorProps) {
  const update = (idx: number, patch: Partial<FooterColumn>) => {
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
    onChange([...value, { title: "", links: [] }]);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-xs text-zinc-300">Columns</Label>
      <div className="space-y-3">
        {value.map((col, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order is the identifier; ids would require a schema change
          <div key={idx} className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                Column {idx + 1}
              </span>
              <button
                type="button"
                aria-label={`Remove column ${idx + 1}`}
                data-testid={testId ? `${testId}-remove-${idx}` : undefined}
                onClick={() => remove(idx)}
                className="text-zinc-400 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              id={`${id}-title-${idx}`}
              data-testid={testId ? `${testId}-title-${idx}` : undefined}
              value={col.title}
              placeholder="Column title"
              onChange={(e) => update(idx, { title: e.target.value })}
              className="h-8 bg-zinc-950 text-xs text-zinc-100"
            />
            <LinksEditor
              id={`${id}-links-${idx}`}
              value={col.links}
              testId={testId ? `${testId}-links-${idx}` : undefined}
              onChange={(next) => update(idx, { links: next })}
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
        <Plus className="mr-1 h-3.5 w-3.5" /> Add column
      </Button>
    </div>
  );
}
