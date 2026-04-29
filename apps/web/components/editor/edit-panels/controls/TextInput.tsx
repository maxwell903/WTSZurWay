"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WithTooltip } from "./with-tooltip";

export type TextInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
  testId?: string;
  tooltip?: string;
};

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
  disabled,
  testId,
  tooltip,
}: TextInputProps) {
  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-1.5">
        {label ? (
          <Label htmlFor={id} className="text-xs text-zinc-300">
            {label}
          </Label>
        ) : null}
        <Input
          id={id}
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-9 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
        />
        {helper ? <p className="text-[11px] text-zinc-500">{helper}</p> : null}
      </div>
    </WithTooltip>
  );
}
