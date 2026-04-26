"use client";

import { Label } from "@/components/ui/label";
import type { ColorOrGradient } from "@/lib/site-config";
import { ColorInput } from "./ColorInput";
import { NumberInput } from "./NumberInput";
import { SegmentedControl } from "./SegmentedControl";

export type BackgroundInputProps = {
  id: string;
  value: ColorOrGradient | undefined;
  onChange: (next: ColorOrGradient | undefined) => void;
  testId?: string;
};

type Mode = "none" | "color" | "gradient";

function modeOf(v: ColorOrGradient | undefined): Mode {
  if (!v) return "none";
  return v.kind === "color" ? "color" : "gradient";
}

export function BackgroundInput({ id, value, onChange, testId }: BackgroundInputProps) {
  const mode = modeOf(value);

  const setMode = (next: Mode) => {
    if (next === "none") {
      onChange(undefined);
      return;
    }
    if (next === "color") {
      const fallback =
        value && value.kind === "color"
          ? value.value
          : value && value.kind === "gradient"
            ? value.from
            : "#000000";
      onChange({ kind: "color", value: fallback });
      return;
    }
    const fromFallback = value && value.kind === "color" ? value.value : "#000000";
    const toFallback = value && value.kind === "gradient" ? value.to : "#ffffff";
    const angleFallback = value && value.kind === "gradient" ? (value.angle ?? 180) : 180;
    onChange({ kind: "gradient", from: fromFallback, to: toFallback, angle: angleFallback });
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-xs text-zinc-300">Background</Label>
      <SegmentedControl
        id={`${id}-mode`}
        value={mode}
        testId={testId ? `${testId}-mode` : undefined}
        options={[
          { label: "None", value: "none" },
          { label: "Color", value: "color" },
          { label: "Gradient", value: "gradient" },
        ]}
        onChange={(next) => setMode(next as Mode)}
      />

      {mode === "color" && value?.kind === "color" ? (
        <ColorInput
          id={`${id}-color`}
          value={value.value}
          testId={testId ? `${testId}-color` : undefined}
          onChange={(next) => onChange({ kind: "color", value: next })}
        />
      ) : null}

      {mode === "gradient" && value?.kind === "gradient" ? (
        <div className="space-y-2">
          <ColorInput
            id={`${id}-from`}
            label="From"
            value={value.from}
            testId={testId ? `${testId}-from` : undefined}
            onChange={(next) => onChange({ ...value, from: next })}
          />
          <ColorInput
            id={`${id}-to`}
            label="To"
            value={value.to}
            testId={testId ? `${testId}-to` : undefined}
            onChange={(next) => onChange({ ...value, to: next })}
          />
          <NumberInput
            id={`${id}-angle`}
            label="Angle (°)"
            value={value.angle ?? 180}
            min={0}
            step={1}
            testId={testId ? `${testId}-angle` : undefined}
            onChange={(next) => onChange({ ...value, angle: next ?? 180 })}
          />
        </div>
      ) : null}
    </div>
  );
}
