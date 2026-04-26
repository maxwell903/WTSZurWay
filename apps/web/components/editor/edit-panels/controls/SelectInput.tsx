"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
};

export type SelectInputProps = {
  id: string;
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
  helper?: string;
  testId?: string;
  placeholder?: string;
};

export function SelectInput({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  helper,
  testId,
  placeholder,
}: SelectInputProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-xs text-zinc-300">
          {label}
        </Label>
      ) : null}
      <select
        id={id}
        data-testid={testId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-orange-400/40",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper ? <p className="text-[11px] text-zinc-500">{helper}</p> : null}
    </div>
  );
}
