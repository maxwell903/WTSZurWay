"use client";

import { ANIMATION_PRESETS, type AnimationPreset } from "@/lib/site-config";
import { SelectInput } from "./SelectInput";

const NONE_VALUE = "__none__";

export type AnimationPresetSelectProps = {
  id: string;
  label: string;
  value: AnimationPreset | undefined;
  onChange: (next: AnimationPreset | undefined) => void;
  testId?: string;
};

const OPTIONS = [
  { label: "(none)", value: NONE_VALUE },
  ...ANIMATION_PRESETS.map((preset) => ({ label: preset, value: preset })),
];

export function AnimationPresetSelect({
  id,
  label,
  value,
  onChange,
  testId,
}: AnimationPresetSelectProps) {
  const current = value ?? NONE_VALUE;
  return (
    <SelectInput
      id={id}
      label={label}
      value={current}
      options={OPTIONS}
      testId={testId}
      onChange={(next) => {
        if (next === NONE_VALUE) {
          onChange(undefined);
          return;
        }
        onChange(next as AnimationPreset);
      }}
    />
  );
}
