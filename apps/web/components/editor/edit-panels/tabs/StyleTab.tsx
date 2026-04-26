"use client";

import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode, ComponentType, StyleConfig } from "@/lib/site-config";
import { BackgroundInput } from "../controls/BackgroundInput";
import { BorderInput } from "../controls/BorderInput";
import { ColorInput } from "../controls/ColorInput";
import { NumberInput } from "../controls/NumberInput";
import { ShadowSelect } from "../controls/ShadowSelect";
import { SizeUnitInput } from "../controls/SizeUnitInput";
import { SpacingInput } from "../controls/SpacingInput";

type StyleMode = "full" | "margin-only" | "none";

const STYLE_MODE: Partial<Record<ComponentType, StyleMode>> = {
  Spacer: "none",
  Divider: "margin-only",
};

function modeFor(type: ComponentType): StyleMode {
  return STYLE_MODE[type] ?? "full";
}

export type StyleTabProps = {
  node: ComponentNode;
};

export function StyleTab({ node }: StyleTabProps) {
  const setComponentStyle = useEditorStore((s) => s.setComponentStyle);
  const mode = modeFor(node.type);
  const style = node.style;

  const writePartial = (patch: Partial<StyleConfig>) => {
    const merged = { ...style, ...patch };
    // Drop undefined keys so the persisted JSON stays sparse.
    const next = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined),
    ) as StyleConfig;
    setComponentStyle(node.id, next);
  };

  if (mode === "none") {
    return (
      <div className="p-3 text-xs text-zinc-400" data-testid="style-tab-spacer-note">
        Spacer is a primitive; use the Content tab to change its height.
      </div>
    );
  }

  if (mode === "margin-only") {
    return (
      <div className="space-y-3 p-3" data-testid="style-tab-divider-margin-only">
        <SpacingInput
          id="style-margin"
          label="Margin"
          value={style.margin}
          testId="style-margin"
          onChange={(next) => writePartial({ margin: next })}
        />
        <p className="text-[11px] text-zinc-500">
          Divider is a primitive; only margin is configurable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3" data-testid="style-tab-full">
      <BackgroundInput
        id="style-background"
        value={style.background}
        testId="style-background"
        onChange={(next) => writePartial({ background: next })}
      />
      <SpacingInput
        id="style-padding"
        label="Padding"
        value={style.padding}
        testId="style-padding"
        onChange={(next) => writePartial({ padding: next })}
      />
      <SpacingInput
        id="style-margin"
        label="Margin"
        value={style.margin}
        testId="style-margin"
        onChange={(next) => writePartial({ margin: next })}
      />
      <BorderInput
        id="style-border"
        value={style.border}
        testId="style-border"
        onChange={(next) => writePartial({ border: next })}
      />
      <NumberInput
        id="style-radius"
        label="Border radius"
        value={style.borderRadius}
        min={0}
        step={1}
        testId="style-border-radius"
        onChange={(next) => writePartial({ borderRadius: next })}
      />
      <ShadowSelect
        value={style.shadow}
        testId="style-shadow"
        onChange={(next) => writePartial({ shadow: next })}
      />
      <div className="grid grid-cols-2 gap-2">
        <SizeUnitInput
          id="style-width"
          label="Width"
          value={style.width}
          placeholder="auto"
          testId="style-width"
          onChange={(next) => writePartial({ width: next })}
        />
        <SizeUnitInput
          id="style-height"
          label="Height"
          value={style.height}
          placeholder="auto"
          testId="style-height"
          onChange={(next) => writePartial({ height: next })}
        />
      </div>
      <ColorInput
        id="style-text-color"
        label="Text color"
        value={style.textColor ?? "#000000"}
        testId="style-text-color"
        onChange={(next) => writePartial({ textColor: next })}
      />
    </div>
  );
}
