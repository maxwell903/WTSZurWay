"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Spacing } from "@/lib/site-config";
import { Link2, Link2Off } from "lucide-react";
import { useState } from "react";

export type SpacingInputProps = {
  id: string;
  label: string;
  value: Spacing | undefined;
  onChange: (next: Spacing | undefined) => void;
  testId?: string;
};

type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];

function isAllEmpty(v: Spacing | undefined): boolean {
  if (!v) return true;
  return SIDES.every((s) => v[s] === undefined);
}

function compactSpacing(input: Spacing): Spacing | undefined {
  const next: Spacing = {};
  let any = false;
  for (const side of SIDES) {
    const raw = input[side];
    if (raw !== undefined) {
      next[side] = raw;
      any = true;
    }
  }
  return any ? next : undefined;
}

export function SpacingInput({ id, label, value, onChange, testId }: SpacingInputProps) {
  const [linked, setLinked] = useState<boolean>(() => {
    if (!value) return true;
    const t = value.top;
    return SIDES.every((s) => value[s] === t);
  });

  const writeSide = (side: Side, raw: string) => {
    const parsed = raw === "" ? undefined : Number(raw);
    if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) return;
    const base: Spacing = value ?? {};
    if (linked) {
      const next: Spacing = {};
      if (parsed !== undefined) {
        for (const s of SIDES) next[s] = parsed;
      }
      onChange(compactSpacing(next));
      return;
    }
    onChange(compactSpacing({ ...base, [side]: parsed }));
  };

  const toggleLinked = () => {
    const nextLinked = !linked;
    setLinked(nextLinked);
    if (nextLinked && value) {
      // Snap all four sides to the top value.
      const t = value.top;
      if (t !== undefined) {
        const next: Spacing = { top: t, right: t, bottom: t, left: t };
        onChange(next);
      }
    }
  };

  const display = (side: Side) => {
    if (linked) {
      const t = value?.top;
      return t === undefined ? "" : String(t);
    }
    const raw = value?.[side];
    return raw === undefined ? "" : String(raw);
  };

  if (linked) {
    return (
      <div className="space-y-1.5" data-testid={testId}>
        <div className="flex items-center justify-between">
          <Label htmlFor={`${id}-all`} className="text-xs text-zinc-300">
            {label}
          </Label>
          <button
            type="button"
            aria-label="Unlink sides"
            data-testid={testId ? `${testId}-unlink` : undefined}
            onClick={toggleLinked}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <Input
          id={`${id}-all`}
          data-testid={testId ? `${testId}-all` : undefined}
          type="number"
          min={0}
          step={1}
          value={display("top")}
          placeholder="0"
          onChange={(e) => writeSide("top", e.target.value)}
          className="h-9 bg-zinc-900 text-zinc-100"
        />
        {isAllEmpty(value) ? (
          <p className="text-[11px] text-zinc-500">Empty clears the field.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-zinc-300">{label}</Label>
        <button
          type="button"
          aria-label="Link sides"
          data-testid={testId ? `${testId}-link` : undefined}
          onClick={toggleLinked}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SIDES.map((side) => (
          <Input
            key={side}
            id={`${id}-${side}`}
            data-testid={testId ? `${testId}-${side}` : undefined}
            type="number"
            min={0}
            step={1}
            value={display(side)}
            placeholder={side[0]?.toUpperCase()}
            aria-label={`${label} ${side}`}
            onChange={(e) => writeSide(side, e.target.value)}
            className="h-9 bg-zinc-900 text-zinc-100"
          />
        ))}
      </div>
    </div>
  );
}
