"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type NumberInputProps = {
  id: string;
  label?: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  min?: number;
  step?: number;
  placeholder?: string;
  testId?: string;
};

export function NumberInput({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder,
  testId,
}: NumberInputProps) {
  const display = value === undefined ? "" : String(value);
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-xs text-zinc-300">
          {label}
        </Label>
      ) : null}
      <Input
        id={id}
        data-testid={testId}
        type="number"
        inputMode="numeric"
        value={display}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed >= min) {
            onChange(parsed);
          }
        }}
        className="h-9 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
      />
    </div>
  );
}
