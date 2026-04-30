"use client";

import { ColorInput } from "@/components/editor/edit-panels/controls/ColorInput";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { Label } from "@/components/ui/label";
import type { CtaButtonStyle } from "../schema";
import type { SectionProps } from "./utils";

// CTA "Full Kit" styling: per-CTA controls for color (bg/text/border),
// border width, corner radius, padding X/Y, font size, and full-width.
// Two collapsible groups (Primary / Secondary) so the panel stays scannable.
export function CtaStyleSection({ node, writePartial }: SectionProps) {
  const primary = readCtaStyle(node.props, "primaryCtaStyle");
  const secondary = readCtaStyle(node.props, "secondaryCtaStyle");

  return (
    <div className="space-y-3">
      <CtaStyleGroup
        title="Primary CTA"
        idPrefix="hero-primary-cta"
        value={primary}
        onChange={(next) => writePartial({ primaryCtaStyle: next })}
      />
      <CtaStyleGroup
        title="Secondary CTA"
        idPrefix="hero-secondary-cta"
        value={secondary}
        onChange={(next) => writePartial({ secondaryCtaStyle: next })}
      />
    </div>
  );
}

function CtaStyleGroup({
  title,
  idPrefix,
  value,
  onChange,
}: {
  title: string;
  idPrefix: string;
  value: CtaButtonStyle;
  onChange: (next: CtaButtonStyle | undefined) => void;
}) {
  const patch = (delta: Partial<CtaButtonStyle>) => {
    const merged: CtaButtonStyle = { ...value, ...delta };
    onChange(compactCtaStyle(merged));
  };

  return (
    <details className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2" open>
      <summary className="cursor-pointer select-none text-xs font-medium text-zinc-200">
        {title}
      </summary>
      <div className="mt-2 space-y-2">
        <ColorInput
          id={`${idPrefix}-bg`}
          label="Background color"
          value={value.backgroundColor ?? ""}
          testId={`${idPrefix}-bg`}
          onChange={(v) => patch({ backgroundColor: v === "" ? undefined : v })}
        />
        <ColorInput
          id={`${idPrefix}-text`}
          label="Text color"
          value={value.textColor ?? ""}
          testId={`${idPrefix}-text`}
          onChange={(v) => patch({ textColor: v === "" ? undefined : v })}
        />
        <ColorInput
          id={`${idPrefix}-border-color`}
          label="Border color"
          value={value.borderColor ?? ""}
          testId={`${idPrefix}-border-color`}
          onChange={(v) => patch({ borderColor: v === "" ? undefined : v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id={`${idPrefix}-border-width`}
            label="Border width (px)"
            value={value.borderWidth}
            min={0}
            step={1}
            placeholder="0"
            testId={`${idPrefix}-border-width`}
            onChange={(v) => patch({ borderWidth: v })}
          />
          <NumberInput
            id={`${idPrefix}-radius`}
            label="Corner radius (px)"
            value={value.borderRadius}
            min={0}
            step={1}
            placeholder="8"
            testId={`${idPrefix}-radius`}
            onChange={(v) => patch({ borderRadius: v })}
          />
          <NumberInput
            id={`${idPrefix}-padding-x`}
            label="Padding X (px)"
            value={value.paddingX}
            min={0}
            step={1}
            placeholder="24"
            testId={`${idPrefix}-padding-x`}
            onChange={(v) => patch({ paddingX: v })}
          />
          <NumberInput
            id={`${idPrefix}-padding-y`}
            label="Padding Y (px)"
            value={value.paddingY}
            min={0}
            step={1}
            placeholder="12"
            testId={`${idPrefix}-padding-y`}
            onChange={(v) => patch({ paddingY: v })}
          />
          <NumberInput
            id={`${idPrefix}-font-size`}
            label="Font size (px)"
            value={value.fontSize}
            min={1}
            step={1}
            placeholder="inherit"
            testId={`${idPrefix}-font-size`}
            onChange={(v) => patch({ fontSize: v })}
          />
        </div>
        <label
          htmlFor={`${idPrefix}-full-width`}
          className="flex items-center gap-2 text-xs text-zinc-300"
        >
          <input
            id={`${idPrefix}-full-width`}
            type="checkbox"
            checked={value.fullWidth ?? false}
            data-testid={`${idPrefix}-full-width`}
            onChange={(e) => patch({ fullWidth: e.target.checked || undefined })}
            className="h-3.5 w-3.5 cursor-pointer"
          />
          <Label
            htmlFor={`${idPrefix}-full-width`}
            className="cursor-pointer text-xs text-zinc-300"
          >
            Full width
          </Label>
        </label>
      </div>
    </details>
  );
}

function readCtaStyle(props: Record<string, unknown>, key: string): CtaButtonStyle {
  const raw = props[key];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as CtaButtonStyle;
  }
  return {};
}

// Strip undefined fields so the persisted JSON stays sparse. Returns
// undefined when the result is fully empty so the parent can drop the
// whole field from props (keeping defaults clean).
function compactCtaStyle(style: CtaButtonStyle): CtaButtonStyle | undefined {
  const next: CtaButtonStyle = {};
  let any = false;
  for (const [k, v] of Object.entries(style) as [keyof CtaButtonStyle, unknown][]) {
    if (v !== undefined && v !== "") {
      // biome-ignore lint/suspicious/noExplicitAny: write-through to known-shape object
      (next as any)[k] = v;
      any = true;
    }
  }
  return any ? next : undefined;
}
