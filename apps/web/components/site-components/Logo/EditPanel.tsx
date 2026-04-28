"use client";

import { MediaInput } from "@/components/editor/edit-panels/controls/MediaInput";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { SegmentedControl } from "@/components/editor/edit-panels/controls/SegmentedControl";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

type LogoSource = "primary" | "secondary" | "custom";

const SOURCE_OPTIONS: { label: string; value: LogoSource }[] = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Custom", value: "custom" },
];

function readSource(props: Record<string, unknown>): LogoSource {
  const v = props.source;
  if (v === "primary" || v === "secondary" || v === "custom") return v;
  return "primary";
}

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readNumber(props: Record<string, unknown>, key: string, fallback: number): number {
  return typeof props[key] === "number" ? (props[key] as number) : fallback;
}

export type LogoEditPanelProps = { node: ComponentNode };

export function LogoEditPanel({ node }: LogoEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  const source = readSource(node.props);

  return (
    <div data-component-edit-panel="Logo" className="space-y-3">
      <SegmentedControl
        id="logo-source"
        label="Source"
        value={source}
        options={SOURCE_OPTIONS}
        testId="logo-source"
        onChange={(next) => writePartial({ source: next })}
      />
      {source === "custom" ? (
        <MediaInput
          id="logo-custom-url"
          label="Custom URL"
          value={readString(node.props, "customUrl")}
          placeholder="https://..."
          testId="logo-custom-url"
          onChange={(next) => writePartial({ customUrl: next === "" ? undefined : next })}
        />
      ) : null}
      <TextInput
        id="logo-alt"
        label="Alt"
        value={readString(node.props, "alt", "Logo")}
        placeholder="Logo"
        testId="logo-alt"
        onChange={(next) => writePartial({ alt: next })}
      />
      <NumberInput
        id="logo-height"
        label="Height (px)"
        value={readNumber(node.props, "height", 32)}
        min={0}
        step={2}
        placeholder="32"
        testId="logo-height"
        onChange={(next) => writePartial({ height: next ?? 32 })}
      />
    </div>
  );
}
