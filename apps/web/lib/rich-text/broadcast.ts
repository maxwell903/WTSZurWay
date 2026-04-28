// Pure JSON transformers for broadcast-mode rich-text edits. The human
// toolbar (in broadcast mode) and the AI `applyTextFormat` op both call
// these — applying the same change to one or many text-bearing components
// without ever mounting a TipTap editor instance.
//
// Why no headless editors: spinning up `new Editor({ element: null })` per
// descendant costs ~5–15ms each and leaks ProseMirror state on the
// non-DOM path. Direct JSON walks are cheap, deterministic, and round-trip
// cleanly through the same Zod schema the renderer uses.
//
// Behavior parity with single-mode: `mode: "toggle"` reads the current
// state of every text leaf; if every leaf already carries the mark, the
// toggle removes it; otherwise it adds it. This matches Google Docs's
// multi-cell-selection toggle behavior.

import type { RichTextDoc, RichTextMark, RichTextNode } from "@/lib/site-config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTextLeaf(node: RichTextNode): boolean {
  return node.type === "text" && typeof node.text === "string";
}

function walkTextLeaves(
  node: RichTextNode,
  visit: (leaf: RichTextNode) => RichTextNode,
): RichTextNode {
  if (isTextLeaf(node)) return visit(node);
  if (!node.content) return node;
  const next = node.content.map((child) => walkTextLeaves(child, visit));
  // Preserve identity if nothing changed (small win for React memo and
  // cheap structural-sharing semantics).
  const changed = next.some((c, i) => c !== node.content?.[i]);
  return changed ? { ...node, content: next } : node;
}

function hasMark(marks: readonly RichTextMark[] | undefined, markType: string): boolean {
  if (!marks) return false;
  return marks.some((m) => m.type === markType);
}

function setMark(
  marks: readonly RichTextMark[] | undefined,
  markType: string,
  attrs?: Record<string, unknown>,
): RichTextMark[] {
  const without = (marks ?? []).filter((m) => m.type !== markType);
  return attrs ? [...without, { type: markType, attrs }] : [...without, { type: markType }];
}

function unsetMark(
  marks: readonly RichTextMark[] | undefined,
  markType: string,
): RichTextMark[] | undefined {
  if (!marks || marks.length === 0) return marks ? [...marks] : undefined;
  const next = marks.filter((m) => m.type !== markType);
  return next.length === 0 ? undefined : next;
}

function everyTextLeafHasMark(doc: RichTextDoc, markType: string): boolean {
  let allHave = true;
  let sawAny = false;
  function visit(node: RichTextNode) {
    if (isTextLeaf(node)) {
      sawAny = true;
      if (!hasMark(node.marks, markType)) allHave = false;
      return;
    }
    for (const child of node.content ?? []) visit(child);
  }
  for (const child of doc.content ?? []) visit(child);
  return sawAny && allHave;
}

// ---------------------------------------------------------------------------
// Mark transformers
// ---------------------------------------------------------------------------

export type MarkApplyMode = "set" | "unset" | "toggle";

export function applyMarkToAllLeaves(
  doc: RichTextDoc,
  markType: string,
  attrs: Record<string, unknown> | undefined,
  mode: MarkApplyMode,
): RichTextDoc {
  const effectiveMode: "set" | "unset" =
    mode === "toggle" ? (everyTextLeafHasMark(doc, markType) ? "unset" : "set") : mode;

  const transform = (leaf: RichTextNode): RichTextNode => {
    if (effectiveMode === "set") {
      return { ...leaf, marks: setMark(leaf.marks, markType, attrs) };
    }
    const nextMarks = unsetMark(leaf.marks, markType);
    if (nextMarks === leaf.marks) return leaf;
    if (nextMarks === undefined) {
      const { marks: _omit, ...rest } = leaf;
      return rest;
    }
    return { ...leaf, marks: nextMarks };
  };

  const nextContent = doc.content?.map((child) => walkTextLeaves(child, transform));
  return nextContent ? { ...doc, content: nextContent } : doc;
}

// ---------------------------------------------------------------------------
// Block-attribute transformer
// ---------------------------------------------------------------------------

// Sets (or clears) a single attribute on every block-level node whose type
// is in `blockTypes`. Used for `textAlign`, `lineHeight`, `dir`, etc.
// Pass `value: null` to clear the attribute (omits the key from `attrs`).
export function setBlockAttrAll(
  doc: RichTextDoc,
  blockTypes: readonly string[],
  attrKey: string,
  value: unknown,
): RichTextDoc {
  const types = new Set(blockTypes);
  function walk(node: RichTextNode): RichTextNode {
    let next = node;
    if (node.type !== undefined && types.has(node.type)) {
      const attrs = { ...(node.attrs ?? {}) };
      if (value === null) {
        delete attrs[attrKey];
      } else {
        attrs[attrKey] = value;
      }
      next = { ...node, attrs };
    }
    if (next.content) {
      const newContent = next.content.map(walk);
      const changed = newContent.some((c, i) => c !== next.content?.[i]);
      if (changed) next = { ...next, content: newContent };
    }
    return next;
  }
  const nextContent = doc.content?.map(walk);
  return nextContent ? { ...doc, content: nextContent } : doc;
}

// ---------------------------------------------------------------------------
// List wrap / unwrap
// ---------------------------------------------------------------------------

// Wrap every top-level paragraph in a list of the given type. Existing
// lists are preserved as-is. The transformer operates only on direct
// children of `doc` to keep behavior predictable — nested wrapping is not
// the caller's intent in the broadcast scenario.
export function wrapInListAll(
  doc: RichTextDoc,
  listType: "bulletList" | "orderedList",
): RichTextDoc {
  if (!doc.content) return doc;
  const nextContent: RichTextNode[] = [];
  for (const block of doc.content) {
    if (block.type === "paragraph") {
      nextContent.push({
        type: listType,
        content: [
          {
            type: "listItem",
            content: [block],
          },
        ],
      });
    } else {
      nextContent.push(block);
    }
  }
  return { ...doc, content: nextContent };
}

// Unwraps every list item from any list and inlines them as paragraphs at
// the top level. Symmetric counterpart of `wrapInListAll` for the
// "broadcast then untoggle" flow.
export function unwrapListAll(doc: RichTextDoc): RichTextDoc {
  if (!doc.content) return doc;
  const nextContent: RichTextNode[] = [];
  for (const block of doc.content) {
    if (block.type === "bulletList" || block.type === "orderedList") {
      for (const item of block.content ?? []) {
        if (item.type !== "listItem") continue;
        for (const inner of item.content ?? []) {
          nextContent.push(inner);
        }
      }
    } else {
      nextContent.push(block);
    }
  }
  return { ...doc, content: nextContent };
}

// ---------------------------------------------------------------------------
// Composite query helpers (for toolbar state in broadcast mode)
// ---------------------------------------------------------------------------

// "Mark X is active across this set of docs" === every doc has X on every
// text leaf. Empty docs and the empty set are treated as "not active" so
// the toolbar shows an unpressed button (matches Google Docs).
export function isMarkActiveAcrossDocs(docs: readonly RichTextDoc[], markType: string): boolean {
  if (docs.length === 0) return false;
  return docs.every((doc) => everyTextLeafHasMark(doc, markType));
}

// "Block attr X is uniformly Y" === every block-typed node in every doc
// has `attrs[attrKey] === expected`. Used for the alignment buttons'
// pressed state in broadcast mode.
export function isBlockAttrUniformAcrossDocs(
  docs: readonly RichTextDoc[],
  blockTypes: readonly string[],
  attrKey: string,
  expected: unknown,
): boolean {
  if (docs.length === 0) return false;
  const types = new Set(blockTypes);
  let foundAny = false;
  for (const doc of docs) {
    const ok = (function check(node: RichTextNode): boolean {
      if (node.type !== undefined && types.has(node.type)) {
        foundAny = true;
        if ((node.attrs?.[attrKey] ?? null) !== expected) return false;
      }
      for (const child of node.content ?? []) {
        if (!check(child)) return false;
      }
      return true;
    })({ type: "doc", content: doc.content });
    if (!ok) return false;
  }
  return foundAny;
}
