"use client";

import { RichTextMirror } from "@/components/editor/edit-panels/controls/RichTextMirror";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readText(props: Record<string, unknown>): string {
  return typeof props.text === "string" ? props.text : "";
}

export type ParagraphEditPanelProps = { node: ComponentNode };

export function ParagraphEditPanel({ node }: ParagraphEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const text = readText(node.props);

  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Paragraph" className="space-y-3">
      <RichTextMirror
        fieldId="paragraph-text"
        fieldLabel="Text"
        plainKey="text"
        richKey="richText"
        plain={text}
        rawRich={node.props.richText}
        rows={6}
        writePartial={writePartial}
      />
    </div>
  );
}
