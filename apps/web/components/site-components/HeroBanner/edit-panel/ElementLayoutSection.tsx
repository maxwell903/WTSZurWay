"use client";

import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/editor/edit-panels/controls/SegmentedControl";
import { SpacingInput } from "@/components/editor/edit-panels/controls/SpacingInput";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import type { Spacing } from "@/lib/site-config";
import type { ElementLayout, TextSize } from "../schema";
import type { SectionProps } from "./utils";

const ALIGN_OPTIONS: SegmentedOption<"auto" | "left" | "center" | "right">[] = [
  { label: "Auto", value: "auto" },
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

// Per-element layout: for each editable element of the hero banner the
// user can override alignSelf (decoupling it from the slide-level align),
// nudge with 4-side margins, set width / maxWidth, and (text only) set
// fontSize. Five collapsible groups: Heading, Subheading, CTA row,
// Primary CTA, Secondary CTA.
export function ElementLayoutSection({ node, writePartial }: SectionProps) {
  const props = node.props;
  return (
    <div className="space-y-3">
      <ElementGroup
        title="Heading"
        idPrefix="hero-heading-layout"
        layout={readLayout(props, "headingLayout")}
        size={readSize(props, "headingSize")}
        showNowrap
        onLayoutChange={(next) => writePartial({ headingLayout: next })}
        onSizeChange={(next) => writePartial({ headingSize: next })}
      />
      <ElementGroup
        title="Subheading"
        idPrefix="hero-subheading-layout"
        layout={readLayout(props, "subheadingLayout")}
        size={readSize(props, "subheadingSize")}
        showNowrap
        onLayoutChange={(next) => writePartial({ subheadingLayout: next })}
        onSizeChange={(next) => writePartial({ subheadingSize: next })}
      />
      <ElementGroup
        title="CTA row"
        idPrefix="hero-cta-row-layout"
        layout={readLayout(props, "ctaRowLayout")}
        onLayoutChange={(next) => writePartial({ ctaRowLayout: next })}
      />
      <ElementGroup
        title="Primary CTA"
        idPrefix="hero-primary-cta-layout"
        layout={readLayout(props, "primaryCtaLayout")}
        onLayoutChange={(next) => writePartial({ primaryCtaLayout: next })}
      />
      <ElementGroup
        title="Secondary CTA"
        idPrefix="hero-secondary-cta-layout"
        layout={readLayout(props, "secondaryCtaLayout")}
        onLayoutChange={(next) => writePartial({ secondaryCtaLayout: next })}
      />
    </div>
  );
}

function ElementGroup({
  title,
  idPrefix,
  layout,
  size,
  showNowrap,
  onLayoutChange,
  onSizeChange,
}: {
  title: string;
  idPrefix: string;
  layout: ElementLayout;
  size?: TextSize;
  showNowrap?: boolean;
  onLayoutChange: (next: ElementLayout | undefined) => void;
  onSizeChange?: (next: TextSize | undefined) => void;
}) {
  const patchLayout = (delta: Partial<ElementLayout>) => {
    const merged: ElementLayout = { ...layout, ...delta };
    onLayoutChange(compactLayout(merged));
  };

  return (
    <details className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2" open>
      <summary className="cursor-pointer select-none text-xs font-medium text-zinc-200">
        {title}
      </summary>
      <div className="mt-2 space-y-2">
        <SegmentedControl
          id={`${idPrefix}-align`}
          label="Self-align"
          value={layout.alignSelf ?? "auto"}
          options={ALIGN_OPTIONS}
          testId={`${idPrefix}-align`}
          tooltip="Override the slide's alignment for just this element. Auto inherits from the slide."
          onChange={(v) => patchLayout({ alignSelf: v === "auto" ? undefined : v })}
        />
        {showNowrap ? (
          <SwitchInput
            id={`${idPrefix}-nowrap`}
            label="No wrap"
            value={layout.nowrap === true}
            testId={`${idPrefix}-nowrap`}
            tooltip="When on, the text stays on a single line and the box auto-fits its content. Leave Width / Max width on Auto and the size follows the text."
            onChange={(v) => patchLayout({ nowrap: v ? true : undefined })}
          />
        ) : null}
        <SpacingInput
          id={`${idPrefix}-margin`}
          label="Offsets (margin px)"
          value={layout.margin}
          testId={`${idPrefix}-margin`}
          onChange={(v: Spacing | undefined) => patchLayout({ margin: v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id={`${idPrefix}-width`}
            label="Width (px)"
            value={layout.width}
            min={0}
            step={1}
            placeholder="auto"
            testId={`${idPrefix}-width`}
            onChange={(v) => patchLayout({ width: v })}
          />
          <NumberInput
            id={`${idPrefix}-max-width`}
            label="Max width (px)"
            value={layout.maxWidth}
            min={0}
            step={1}
            placeholder="none"
            testId={`${idPrefix}-max-width`}
            onChange={(v) => patchLayout({ maxWidth: v })}
          />
          {onSizeChange ? (
            <NumberInput
              id={`${idPrefix}-font-size`}
              label="Font size (px)"
              value={size?.fontSize}
              min={1}
              step={1}
              placeholder="inherit"
              testId={`${idPrefix}-font-size`}
              onChange={(v) => onSizeChange(v === undefined ? undefined : { fontSize: v })}
            />
          ) : null}
        </div>
      </div>
    </details>
  );
}

function readLayout(props: Record<string, unknown>, key: string): ElementLayout {
  const raw = props[key];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ElementLayout;
  }
  return {};
}

function readSize(props: Record<string, unknown>, key: string): TextSize | undefined {
  const raw = props[key];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as TextSize;
  }
  return undefined;
}

function compactLayout(layout: ElementLayout): ElementLayout | undefined {
  const next: ElementLayout = {};
  let any = false;
  if (layout.alignSelf !== undefined) {
    next.alignSelf = layout.alignSelf;
    any = true;
  }
  if (layout.margin !== undefined) {
    next.margin = layout.margin;
    any = true;
  }
  if (layout.width !== undefined) {
    next.width = layout.width;
    any = true;
  }
  if (layout.maxWidth !== undefined) {
    next.maxWidth = layout.maxWidth;
    any = true;
  }
  if (layout.nowrap !== undefined) {
    next.nowrap = layout.nowrap;
    any = true;
  }
  return any ? next : undefined;
}
