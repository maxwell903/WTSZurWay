"use client";

import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: String(n) }));

function readText(props: Record<string, unknown>): string {
  return typeof props.text === "string" ? props.text : "";
}

function readLevel(props: Record<string, unknown>): string {
  const raw = props.level;
  if (typeof raw === "number" && raw >= 1 && raw <= 6) return String(raw);
  return "2";
}

export type HeadingEditPanelProps = { node: ComponentNode };

export function HeadingEditPanel({ node }: HeadingEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const text = readText(node.props);
  const level = readLevel(node.props);

  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Heading" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="heading-text" className="text-xs text-zinc-300">
          Text
        </Label>
        <textarea
          id="heading-text"
          data-testid="heading-text"
          value={text}
          onChange={(e) => writePartial({ text: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
        />
      </div>
      <SelectInput
        id="heading-level"
        label="Level"
        value={level}
        options={LEVEL_OPTIONS}
        testId="heading-level"
        onChange={(next) => writePartial({ level: Number(next) })}
      />
    </div>
  );
}
