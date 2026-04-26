"use client";

import { useEditorStore } from "@/lib/editor-state";
import type { AnimationConfig, AnimationPreset, ComponentNode } from "@/lib/site-config";
import { AnimationPresetSelect } from "../controls/AnimationPresetSelect";
import { NumberInput } from "../controls/NumberInput";

export type AnimationTabProps = {
  node: ComponentNode;
};

function isEmpty(cfg: AnimationConfig): boolean {
  return (
    cfg.onEnter === undefined &&
    cfg.onHover === undefined &&
    cfg.duration === undefined &&
    cfg.delay === undefined
  );
}

export function AnimationTab({ node }: AnimationTabProps) {
  const setAnimation = useEditorStore((s) => s.setComponentAnimation);
  const current: AnimationConfig = node.animation ?? {};

  const writePartial = (patch: Partial<AnimationConfig>) => {
    const merged: AnimationConfig = { ...current, ...patch };
    // Drop undefined keys so we don't persist empty fields.
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined),
    ) as AnimationConfig;
    if (isEmpty(cleaned)) {
      setAnimation(node.id, undefined);
      return;
    }
    setAnimation(node.id, cleaned);
  };

  return (
    <div className="space-y-3 p-3" data-testid="animation-tab">
      <AnimationPresetSelect
        id="anim-on-enter"
        label="On enter"
        value={current.onEnter}
        testId="anim-on-enter"
        onChange={(next) => writePartial({ onEnter: next as AnimationPreset | undefined })}
      />
      <AnimationPresetSelect
        id="anim-on-hover"
        label="On hover"
        value={current.onHover}
        testId="anim-on-hover"
        onChange={(next) => writePartial({ onHover: next as AnimationPreset | undefined })}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          id="anim-duration"
          label="Duration (ms)"
          value={current.duration}
          min={0}
          step={50}
          testId="anim-duration"
          onChange={(next) => writePartial({ duration: next })}
        />
        <NumberInput
          id="anim-delay"
          label="Delay (ms)"
          value={current.delay}
          min={0}
          step={50}
          testId="anim-delay"
          onChange={(next) => writePartial({ delay: next })}
        />
      </div>
    </div>
  );
}
