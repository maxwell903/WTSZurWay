"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WithTooltip } from "./with-tooltip";

export type SwitchInputProps = {
  id: string;
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  testId?: string;
  tooltip?: string;
};

export function SwitchInput({ id, label, value, onChange, testId, tooltip }: SwitchInputProps) {
  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs text-zinc-300">
          {label}
        </Label>
        <Switch
          id={id}
          data-testid={testId}
          checked={value}
          onCheckedChange={(next) => onChange(next === true)}
        />
      </div>
    </WithTooltip>
  );
}
