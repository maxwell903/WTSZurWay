"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type SelectOptionEntry = { label: string; value: string };

export type SelectOptionsEditorProps = {
  id: string;
  value: SelectOptionEntry[];
  onChange: (next: SelectOptionEntry[]) => void;
  testId?: string;
};

export function SelectOptionsEditor({ id, value, onChange, testId }: SelectOptionsEditorProps) {
  const update = (idx: number, patch: Partial<SelectOptionEntry>) => {
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
    onChange([...value, { label: "", value: "" }]);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-xs text-zinc-300">Options</Label>
      <div className="space-y-2">
        {value.map((opt, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order is the identifier; ids would require a schema change
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1">
            <Input
              id={`${id}-label-${idx}`}
              data-testid={testId ? `${testId}-label-${idx}` : undefined}
              value={opt.label}
              placeholder="Label"
              onChange={(e) => update(idx, { label: e.target.value })}
              className="h-8 bg-zinc-950 text-xs text-zinc-100"
            />
            <Input
              id={`${id}-value-${idx}`}
              data-testid={testId ? `${testId}-value-${idx}` : undefined}
              value={opt.value}
              placeholder="Value"
              onChange={(e) => update(idx, { value: e.target.value })}
              className="h-8 bg-zinc-950 text-xs text-zinc-100"
            />
            <button
              type="button"
              aria-label={`Remove option ${idx + 1}`}
              data-testid={testId ? `${testId}-remove-${idx}` : undefined}
              onClick={() => remove(idx)}
              className="self-center text-zinc-400 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
        <Plus className="mr-1 h-3.5 w-3.5" /> Add option
      </Button>
    </div>
  );
}
