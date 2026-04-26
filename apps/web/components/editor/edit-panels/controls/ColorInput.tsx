"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ColorInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  testId?: string;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ColorInput({ id, label, value, onChange, testId }: ColorInputProps) {
  const safeColor = HEX_PATTERN.test(value) ? value : "#000000";
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-xs text-zinc-300">
          {label}
        </Label>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          data-testid={testId ? `${testId}-swatch` : undefined}
          type="color"
          value={safeColor}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
          aria-label={label ? `${label} color picker` : "Color picker"}
        />
        <Input
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 flex-1 bg-zinc-900 font-mono text-xs text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}
