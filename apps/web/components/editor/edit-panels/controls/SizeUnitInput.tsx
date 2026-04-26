"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SizeUnit } from "@/lib/site-config";

export type SizeUnitInputProps = {
  id: string;
  label?: string;
  value: SizeUnit | undefined;
  onChange: (next: SizeUnit | undefined) => void;
  placeholder?: string;
  testId?: string;
};

export function SizeUnitInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  testId,
}: SizeUnitInputProps) {
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
        value={value ?? ""}
        placeholder={placeholder ?? "auto"}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : raw);
        }}
        className="h-9 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
      />
    </div>
  );
}
