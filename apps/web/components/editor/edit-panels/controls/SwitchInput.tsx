"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type SwitchInputProps = {
  id: string;
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  testId?: string;
};

export function SwitchInput({ id, label, value, onChange, testId }: SwitchInputProps) {
  return (
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
  );
}
