"use client";

import { HrefInput } from "@/components/editor/edit-panels/controls/HrefInput";
import { MediaInput } from "@/components/editor/edit-panels/controls/MediaInput";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readNumber(props: Record<string, unknown>, key: string): number | undefined {
  const v = props[key];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

export type UnitCardEditPanelProps = { node: ComponentNode };

export function UnitCardEditPanel({ node }: UnitCardEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  // NumberInput emits `undefined` when the user clears the field. UnitCard's
  // schema defaults numeric props to 0; coalesce so the live preview never
  // shows NaN or flickers.
  const writeNumber = (key: string) => (next: number | undefined) =>
    writePartial({ [key]: next ?? 0 });

  return (
    <div data-component-edit-panel="UnitCard" className="space-y-3">
      <MediaInput
        id="unitcard-image-src"
        label="Image"
        value={readString(node.props, "imageSrc")}
        placeholder="https://... (optional)"
        testId="unitcard-image-src"
        onChange={(next) => writePartial({ imageSrc: next })}
      />
      <TextInput
        id="unitcard-heading"
        label="Heading"
        value={readString(node.props, "heading")}
        placeholder="Unit Name"
        testId="unitcard-heading"
        onChange={(next) => writePartial({ heading: next })}
      />
      <NumberInput
        id="unitcard-beds"
        label="Bedrooms"
        value={readNumber(node.props, "beds")}
        placeholder="0"
        testId="unitcard-beds"
        onChange={writeNumber("beds")}
      />
      <NumberInput
        id="unitcard-baths"
        label="Bathrooms"
        value={readNumber(node.props, "baths")}
        placeholder="0"
        testId="unitcard-baths"
        onChange={writeNumber("baths")}
      />
      <NumberInput
        id="unitcard-sqft"
        label="Square feet"
        value={readNumber(node.props, "sqft")}
        placeholder="0"
        testId="unitcard-sqft"
        onChange={writeNumber("sqft")}
      />
      <NumberInput
        id="unitcard-rent"
        label="Monthly rent (USD)"
        value={readNumber(node.props, "rent")}
        placeholder="0"
        testId="unitcard-rent"
        onChange={writeNumber("rent")}
      />
      <TextInput
        id="unitcard-cta-label"
        label="CTA label"
        value={readString(node.props, "ctaLabel")}
        placeholder="View Unit"
        testId="unitcard-cta-label"
        onChange={(next) => writePartial({ ctaLabel: next })}
      />
      <HrefInput
        id="unitcard-cta-href"
        label="CTA link"
        value={readString(node.props, "ctaHref")}
        placeholder="https://..."
        testId="unitcard-cta-href"
        onChange={(next) => writePartial({ ctaHref: next })}
      />
    </div>
  );
}
