"use client";

import { HrefInput } from "@/components/editor/edit-panels/controls/HrefInput";
import { MediaInput } from "@/components/editor/edit-panels/controls/MediaInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

export type PropertyCardEditPanelProps = { node: ComponentNode };

export function PropertyCardEditPanel({ node }: PropertyCardEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="PropertyCard" className="space-y-3">
      <MediaInput
        id="propertycard-image-src"
        label="Image"
        value={readString(node.props, "imageSrc")}
        placeholder="https://... (optional)"
        testId="propertycard-image-src"
        onChange={(next) => writePartial({ imageSrc: next })}
      />
      <TextInput
        id="propertycard-heading"
        label="Heading"
        value={readString(node.props, "heading")}
        placeholder="Property Name"
        testId="propertycard-heading"
        onChange={(next) => writePartial({ heading: next })}
      />
      <TextInput
        id="propertycard-body"
        label="Description"
        value={readString(node.props, "body")}
        placeholder="Property description goes here."
        testId="propertycard-body"
        onChange={(next) => writePartial({ body: next })}
      />
      <TextInput
        id="propertycard-cta-label"
        label="CTA label"
        value={readString(node.props, "ctaLabel")}
        placeholder="View Details"
        testId="propertycard-cta-label"
        onChange={(next) => writePartial({ ctaLabel: next })}
      />
      <HrefInput
        id="propertycard-cta-href"
        label="CTA link"
        value={readString(node.props, "ctaHref")}
        placeholder="https://..."
        testId="propertycard-cta-href"
        onChange={(next) => writePartial({ ctaHref: next })}
      />
    </div>
  );
}
