"use client";

// Bridge between the toolbar (which thinks in commands like "toggle bold")
// and the JSON transformers in `broadcast.ts`. For each id in the active
// broadcast scope, we look up the node, walk its registered text fields,
// transform every doc, and write both the rich-text doc AND the
// denormalized plain-text fallback back to the store via
// `setComponentProps`.
//
// `applyMarkBroadcast` is the human-toolbar entry point. The AI op
// `applyTextFormat` (in lib/site-config/ops.ts) calls a sibling helper
// from the same broadcast.ts transformers — same code path, byte-identical
// output.

import { type TextFieldDescriptor, componentRegistry } from "@/components/site-components/registry";
import { useEditorStore } from "@/lib/editor-state";
import { findComponentById } from "@/lib/editor-state/store";
import {
  type MarkApplyMode,
  applyMarkToAllLeaves,
  setBlockAttrAll,
  unwrapListAll,
  wrapInListAll,
} from "@/lib/rich-text/broadcast";
import { extractPlainText } from "@/lib/rich-text/extract-plain-text";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import {
  type ComponentNode,
  type ComponentType,
  type RichTextDoc,
  richTextDocSchema,
} from "@/lib/site-config";

function findNode(
  config: ReturnType<typeof useEditorStore.getState>["draftConfig"],
  id: string,
): ComponentNode | null {
  for (const page of config.pages) {
    const found = findComponentById(page.rootComponent, id);
    if (found) return found;
  }
  return null;
}

function readDoc(
  props: Record<string, unknown>,
  richKey: string,
  plain: string,
  profile: TextFieldDescriptor["profile"],
): RichTextDoc {
  const raw = props[richKey];
  if (raw !== undefined) {
    const parsed = richTextDocSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return synthesizeDoc(plain, profile);
}

function applyToOneNode(
  node: ComponentNode,
  transform: (doc: RichTextDoc) => RichTextDoc,
): Record<string, unknown> | null {
  const fields = componentRegistry[node.type].meta.textFields;
  if (!fields || fields.length === 0) return null;
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    // Phase 4.5: array fields (NavBar links, Footer column titles) are
    // skipped in toolbar broadcast — array-aware broadcast is a follow-up.
    if (field.kind === "array") continue;
    const plain =
      typeof node.props[field.propKey] === "string" ? (node.props[field.propKey] as string) : "";
    const before = readDoc(node.props, field.richKey, plain, field.profile);
    const after = transform(before);
    patch[field.richKey] = after;
    patch[field.propKey] = extractPlainText(after);
  }
  return patch;
}

// ---------------------------------------------------------------------------
// Public dispatch helpers (called by toolbar)
// ---------------------------------------------------------------------------

export function broadcastMarkToggle(
  ids: readonly string[],
  markType: string,
  attrs: Record<string, unknown> | undefined,
  mode: MarkApplyMode,
): void {
  const state = useEditorStore.getState();
  for (const id of ids) {
    const node = findNode(state.draftConfig, id);
    if (!node) continue;
    const patch = applyToOneNode(node, (doc) => applyMarkToAllLeaves(doc, markType, attrs, mode));
    if (patch) {
      state.setComponentProps(id, { ...node.props, ...patch });
    }
  }
}

export function broadcastBlockAttr(
  ids: readonly string[],
  blockTypes: readonly string[],
  attrKey: string,
  value: unknown,
): void {
  const state = useEditorStore.getState();
  for (const id of ids) {
    const node = findNode(state.draftConfig, id);
    if (!node) continue;
    const patch = applyToOneNode(node, (doc) => setBlockAttrAll(doc, blockTypes, attrKey, value));
    if (patch) {
      state.setComponentProps(id, { ...node.props, ...patch });
    }
  }
}

export function broadcastList(
  ids: readonly string[],
  listType: "bulletList" | "orderedList",
  action: "wrap" | "unwrap",
): void {
  const state = useEditorStore.getState();
  for (const id of ids) {
    const node = findNode(state.draftConfig, id);
    if (!node) continue;
    // Inline-profile components (Button) don't carry list nodes — skip them
    // so a "make this a bulleted list" broadcast against a parent containing
    // both Heading and Button affects the Heading and is a no-op on Button.
    const fields: readonly TextFieldDescriptor[] | undefined =
      componentRegistry[node.type].meta.textFields;
    if (!fields || fields.length === 0) continue;
    const inlineOnly = fields.every((f) => f.profile === "inline");
    if (inlineOnly) continue;
    const patch = applyToOneNode(node, (doc) =>
      action === "wrap" ? wrapInListAll(doc, listType) : unwrapListAll(doc),
    );
    if (patch) {
      state.setComponentProps(id, { ...node.props, ...patch });
    }
  }
}

// Aggregate every selected node's docs into one flat array — used by the
// toolbar to compute "is this mark active?" / "is alignment uniform?" in
// broadcast mode without re-traversing the config per query.
export function collectBroadcastDocs(
  ids: readonly string[],
): { doc: RichTextDoc; node: ComponentNode; field: TextFieldDescriptor }[] {
  const state = useEditorStore.getState();
  const out: { doc: RichTextDoc; node: ComponentNode; field: TextFieldDescriptor }[] = [];
  for (const id of ids) {
    const node = findNode(state.draftConfig, id);
    if (!node) continue;
    const fields = componentRegistry[node.type].meta.textFields;
    if (!fields) continue;
    for (const field of fields) {
      if (field.kind === "array") continue; // see applyToOneNode comment
      const plain =
        typeof node.props[field.propKey] === "string" ? (node.props[field.propKey] as string) : "";
      out.push({ doc: readDoc(node.props, field.richKey, plain, field.profile), node, field });
    }
  }
  return out;
}

// Re-export the ComponentType type-narrow for tests + toolbar UI.
export type { ComponentType };
