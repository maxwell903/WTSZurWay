"use client";

import { Label } from "@/components/ui/label";
import { BORDER_STYLES, type Border } from "@/lib/site-config";
import { ColorInput } from "./ColorInput";
import { NumberInput } from "./NumberInput";
import { SelectInput } from "./SelectInput";

export type BorderInputProps = {
  id: string;
  value: Border | undefined;
  onChange: (next: Border | undefined) => void;
  testId?: string;
};

const FALLBACK: Border = { width: 0, style: "none", color: "#000000" };

export function BorderInput({ id, value, onChange, testId }: BorderInputProps) {
  const current = value ?? FALLBACK;

  const writePartial = (patch: Partial<Border>) => {
    const next: Border = { ...current, ...patch };
    if (next.width === 0 && next.style === "none") {
      onChange(undefined);
      return;
    }
    onChange(next);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-xs text-zinc-300">Border</Label>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          id={`${id}-width`}
          label="Width"
          value={current.width}
          min={0}
          step={1}
          testId={testId ? `${testId}-width` : undefined}
          onChange={(next) => writePartial({ width: next ?? 0 })}
        />
        <SelectInput
          id={`${id}-style`}
          label="Style"
          value={current.style}
          options={BORDER_STYLES.map((s) => ({ label: s, value: s }))}
          testId={testId ? `${testId}-style` : undefined}
          onChange={(next) => writePartial({ style: next as Border["style"] })}
        />
      </div>
      <ColorInput
        id={`${id}-color`}
        label="Color"
        value={current.color}
        testId={testId ? `${testId}-color` : undefined}
        onChange={(next) => writePartial({ color: next })}
      />
    </div>
  );
}
