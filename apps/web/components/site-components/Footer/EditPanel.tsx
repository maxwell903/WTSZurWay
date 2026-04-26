"use client";

import {
  type FooterColumn,
  FooterColumnsEditor,
} from "@/components/editor/edit-panels/controls/FooterColumnsEditor";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readColumns(props: Record<string, unknown>): FooterColumn[] {
  if (!Array.isArray(props.columns)) return [];
  return props.columns
    .map((col): FooterColumn | null => {
      if (!col || typeof col !== "object") return null;
      const c = col as Record<string, unknown>;
      const title = typeof c.title === "string" ? c.title : "";
      const links = Array.isArray(c.links)
        ? c.links
            .filter((link): link is { label: string; href: string } => {
              if (!link || typeof link !== "object") return false;
              const l = link as Record<string, unknown>;
              return typeof l.label === "string" && typeof l.href === "string";
            })
            .map((link) => ({ label: link.label, href: link.href }))
        : [];
      return { title, links };
    })
    .filter((c): c is FooterColumn => c !== null);
}

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

export type FooterEditPanelProps = { node: ComponentNode };

export function FooterEditPanel({ node }: FooterEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Footer" className="space-y-3">
      <FooterColumnsEditor
        id="footer-columns"
        value={readColumns(node.props)}
        testId="footer-columns"
        onChange={(next) => writePartial({ columns: next })}
      />
      <TextInput
        id="footer-copyright"
        label="Copyright"
        value={readString(node.props, "copyright")}
        placeholder="© 2026 Acme"
        testId="footer-copyright"
        onChange={(next) => writePartial({ copyright: next })}
      />
    </div>
  );
}
