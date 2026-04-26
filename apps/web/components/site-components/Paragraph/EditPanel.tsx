"use client";

import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readText(props: Record<string, unknown>): string {
  return typeof props.text === "string" ? props.text : "";
}

export type ParagraphEditPanelProps = { node: ComponentNode };

export function ParagraphEditPanel({ node }: ParagraphEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const text = readText(node.props);

  return (
    <div data-component-edit-panel="Paragraph" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="paragraph-text" className="text-xs text-zinc-300">
          Text
        </Label>
        <textarea
          id="paragraph-text"
          data-testid="paragraph-text"
          value={text}
          onChange={(e) => setComponentProps(node.id, { ...node.props, text: e.target.value })}
          rows={6}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
        />
      </div>
    </div>
  );
}
