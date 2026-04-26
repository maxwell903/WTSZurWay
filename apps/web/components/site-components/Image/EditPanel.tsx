"use client";

import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const FIT_OPTIONS = ["contain", "cover", "fill", "none", "scale-down"].map((v) => ({
  label: v,
  value: v,
}));

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

export type ImageEditPanelProps = { node: ComponentNode };

export function ImageEditPanel({ node }: ImageEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Image" className="space-y-3">
      <TextInput
        id="image-src"
        label="Src"
        value={readString(node.props, "src")}
        placeholder="https://..."
        testId="image-src"
        onChange={(next) => writePartial({ src: next })}
      />
      <TextInput
        id="image-alt"
        label="Alt"
        value={readString(node.props, "alt")}
        testId="image-alt"
        onChange={(next) => writePartial({ alt: next })}
      />
      <SelectInput
        id="image-fit"
        label="Fit"
        value={readString(node.props, "fit", "cover")}
        options={FIT_OPTIONS}
        testId="image-fit"
        onChange={(next) => writePartial({ fit: next })}
      />
    </div>
  );
}
