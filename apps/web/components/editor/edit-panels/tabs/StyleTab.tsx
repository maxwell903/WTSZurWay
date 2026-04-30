"use client";

import { getTextFields } from "@/components/site-components/registry";
import { useEditorStore } from "@/lib/editor-state";
import { dominantTextStyleColorMulti } from "@/lib/rich-text/dominant-color";
import type { ComponentNode, ComponentType, RichTextDoc, StyleConfig } from "@/lib/site-config";
import { BackgroundInput } from "../controls/BackgroundInput";
import { BorderInput } from "../controls/BorderInput";
import { ColorInput } from "../controls/ColorInput";
import { NumberInput } from "../controls/NumberInput";
import { ShadowSelect } from "../controls/ShadowSelect";
import { SizeUnitInput } from "../controls/SizeUnitInput";
import { SpacingInput } from "../controls/SpacingInput";

// Read-side coordination with the rich-text toolbar's color picker. When
// the user has applied uniform `textStyle.color` marks across every text
// node on this component but hasn't set `style.textColor`, we surface the
// mark color in the StyleTab swatch so both pickers describe the same
// scope. Writes still go to `style.textColor` (per-range mark overrides
// stay intact). See lib/rich-text/dominant-color.ts.
function gatherTipTapDocs(node: ComponentNode): Array<RichTextDoc | undefined> {
  const fields = getTextFields(node.type);
  const props = node.props as Record<string, unknown>;
  const docs: Array<RichTextDoc | undefined> = [];
  for (const field of fields) {
    if (field.kind === "array") {
      const arr = props[field.arrayKey];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (item && typeof item === "object") {
          docs.push(
            (item as Record<string, unknown>)[field.itemRichKey] as RichTextDoc | undefined,
          );
        }
      }
    } else {
      docs.push(props[field.richKey] as RichTextDoc | undefined);
    }
  }
  return docs;
}

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
      <TextColorRow node={node} style={style} writePartial={writePartial} />
    </div>
  );
}

// `Text color` row. Displayed value falls back to the dominant
// `textStyle.color` mark across the component's TipTap docs when
// `style.textColor` is unset, so the StyleTab and the rich-text toolbar
// surface the same color when they're describing the same scope. The
// write target is unchanged: `style.textColor`. When the source is the
// marks (not `style.textColor`), a small caption explains why changing
// the field may not visibly recolor the text — per-range marks override
// the component default in CSS.
function TextColorRow({
  node,
  style,
  writePartial,
}: {
  node: ComponentNode;
  style: StyleConfig;
  writePartial: (patch: Partial<StyleConfig>) => void;
}) {
  const explicit = style.textColor;
  const fromMarks =
    explicit === undefined ? dominantTextStyleColorMulti(gatherTipTapDocs(node)) : null;
  const display = explicit ?? fromMarks ?? "#000000";
  return (
    <div className="space-y-1">
      <ColorInput
        id="style-text-color"
        label="Text color"
        value={display}
        testId="style-text-color"
        onChange={(next) => writePartial({ textColor: next })}
      />
      {fromMarks !== null ? (
        <p className="text-[11px] text-zinc-500" data-testid="style-text-color-from-marks">
          Sourced from text styling. Picking a new color sets the component default; per-range marks
          will continue to override it until cleared from the toolbar.
        </p>
      ) : null}
    </div>
  );
}
