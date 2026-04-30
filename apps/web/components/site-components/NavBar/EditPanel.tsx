"use client";

import { MediaInput } from "@/components/editor/edit-panels/controls/MediaInput";
import {
  type NavLinkEntry,
  NavLinksEditor,
} from "@/components/editor/edit-panels/controls/NavLinksEditor";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const PLACEMENT_OPTIONS = ["left", "center", "right"].map((v) => ({ label: v, value: v }));

function readEntryShape(raw: Record<string, unknown>): NavLinkEntry {
  const label = typeof raw.label === "string" ? raw.label : "";
  const rawKind = raw.kind;
  const kind: "page" | "external" =
    rawKind === "page" || rawKind === "external" ? rawKind : "external";
  if (kind === "page") {
    const pageSlug = typeof raw.pageSlug === "string" ? raw.pageSlug : undefined;
    return { kind: "page", label, pageSlug };
  }
  const href = typeof raw.href === "string" ? raw.href : "";
  return { kind: "external", label, href };
}

function readLinks(props: Record<string, unknown>): NavLinkEntry[] {
  if (!Array.isArray(props.links)) return [];
  return props.links
    .map((entry): NavLinkEntry | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const top = readEntryShape(e);
      if (!Array.isArray(e.children)) return top;
      const children: NavLinkEntry[] = [];
      for (const c of e.children) {
        if (c && typeof c === "object") {
          children.push(readEntryShape(c as Record<string, unknown>));
        }
      }
      return { ...top, children };
    })
    .filter((entry): entry is NavLinkEntry => entry !== null);
}

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readBool(props: Record<string, unknown>, key: string): boolean {
  return props[key] === true;
}

function readNumber(props: Record<string, unknown>, key: string): number | undefined {
  const v = props[key];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

export type NavBarEditPanelProps = { node: ComponentNode };

export function NavBarEditPanel({ node }: NavBarEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const setGlobalNavBarLocked = useEditorStore((s) => s.setGlobalNavBarLocked);
  const setNavBarOverrideShared = useEditorStore((s) => s.setNavBarOverrideShared);
  // navBarLocked is optional in the schema (undefined === locked). Read it
  // through the same default as `isGlobalNavBarLocked` to keep behavior
  // consistent across reads and writes.
  const globalLocked = useEditorStore((s) => s.draftConfig.global.navBarLocked !== false);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };
  const overrideShared = readBool(node.props, "overrideShared");

  return (
    <div data-component-edit-panel="NavBar" className="space-y-3">
      <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
        <SwitchInput
          id="navbar-global-locked"
          label="Lock across all pages"
          value={globalLocked}
          testId="navbar-global-locked"
          onChange={(next) => setGlobalNavBarLocked(next)}
        />
        <SwitchInput
          id="navbar-override-shared"
          label="Override content on this specific page"
          value={overrideShared}
          testId="navbar-override-shared"
          onChange={(next) => setNavBarOverrideShared(node.id, next)}
        />
        {globalLocked && !overrideShared ? (
          <p className="text-[11px] text-zinc-500">
            Edits to this NavBar apply to every page's NavBar.
          </p>
        ) : null}
        {!globalLocked ? (
          <p className="text-[11px] text-zinc-500">
            Lock is off — each page's NavBar is independent.
          </p>
        ) : null}
        {overrideShared ? (
          <p className="text-[11px] text-zinc-500">
            This NavBar diverges from the shared content; other pages are unaffected.
          </p>
        ) : null}
      </div>
      <NavLinksEditor
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
      <NumberInput
        id="navbar-link-gap"
        label="Spacing between links (px)"
        value={readNumber(node.props, "linkGap")}
        placeholder="20"
        testId="navbar-link-gap"
        onChange={(next) => writePartial({ linkGap: next })}
      />
      <NumberInput
        id="navbar-logo-margin-x"
        label="Horizontal margin around logo (px)"
        value={readNumber(node.props, "logoMarginX")}
        placeholder="0"
        testId="navbar-logo-margin-x"
        onChange={(next) => writePartial({ logoMarginX: next })}
      />
      <NumberInput
        id="navbar-logo-size"
        label="Logo height (px)"
        value={readNumber(node.props, "logoSize")}
        placeholder="32"
        testId="navbar-logo-size"
        onChange={(next) => writePartial({ logoSize: next })}
      />
      <SwitchInput
        id="navbar-sticky"
        label="Sticky"
        value={readBool(node.props, "sticky")}
        testId="navbar-sticky"
        onChange={(next) => writePartial({ sticky: next })}
      />
      <MediaInput
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
