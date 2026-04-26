"use client";

import { type LinkEntry, LinksEditor } from "@/components/editor/edit-panels/controls/LinksEditor";
import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const PLACEMENT_OPTIONS = ["left", "center", "right"].map((v) => ({ label: v, value: v }));

function readLinks(props: Record<string, unknown>): LinkEntry[] {
  if (!Array.isArray(props.links)) return [];
  return props.links
    .filter((entry): entry is LinkEntry => {
      if (!entry || typeof entry !== "object") return false;
      const e = entry as Record<string, unknown>;
      return typeof e.label === "string" && typeof e.href === "string";
    })
    .map((entry) => ({ label: entry.label, href: entry.href }));
}

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readBool(props: Record<string, unknown>, key: string): boolean {
  return props[key] === true;
}

export type NavBarEditPanelProps = { node: ComponentNode };

export function NavBarEditPanel({ node }: NavBarEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="NavBar" className="space-y-3">
      <LinksEditor
        id="navbar-links"
        label="Links"
        value={readLinks(node.props)}
        testId="navbar-links"
        onChange={(next) => writePartial({ links: next })}
      />
      <SelectInput
        id="navbar-logo-placement"
        label="Logo placement"
        value={readString(node.props, "logoPlacement", "left")}
        options={PLACEMENT_OPTIONS}
        testId="navbar-logo-placement"
        onChange={(next) => writePartial({ logoPlacement: next })}
      />
      <SwitchInput
        id="navbar-sticky"
        label="Sticky"
        value={readBool(node.props, "sticky")}
        testId="navbar-sticky"
        onChange={(next) => writePartial({ sticky: next })}
      />
      <TextInput
        id="navbar-logo-src"
        label="Logo URL"
        value={readString(node.props, "logoSrc")}
        placeholder="https://... (optional)"
        testId="navbar-logo-src"
        onChange={(next) => writePartial({ logoSrc: next === "" ? undefined : next })}
      />
    </div>
  );
}
