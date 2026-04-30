// Read-side coordination between StyleTab's `style.textColor` (the
// component default) and the toolbar's per-range `textStyle.color` marks.
//
// Both pickers should display the same color when they're describing the
// same scope. Writes stay separate (StyleTab → CSS, toolbar → mark) so
// per-range overrides survive default changes — see CLAUDE.md / the
// previous design discussion. These helpers only support reads.
//
// "Dominant" means: every text node in the input doc(s) carries a
// `textStyle` mark with the same `color` attribute. If any text node is
// uncolored, or two nodes disagree, there is no dominant color and the
// helper returns null (StyleTab will then fall back to its own value).

import type { RichTextDoc, RichTextNode } from "@/lib/site-config";

type Walker = {
  textNodeCount: number;
  allCovered: boolean;
  colors: Set<string>;
};

function walk(node: RichTextNode | undefined, state: Walker): void {
  if (!node) return;
  if (typeof node.text === "string" && node.text.length > 0) {
    state.textNodeCount += 1;
    const textStyle = node.marks?.find((m) => m.type === "textStyle");
    const color = textStyle?.attrs?.color;
    if (typeof color !== "string") {
      state.allCovered = false;
      return;
    }
    state.colors.add(color);
    return;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, state);
  }
}

function visitDoc(doc: RichTextDoc | null | undefined, state: Walker): void {
  if (!doc || !Array.isArray(doc.content)) return;
  for (const child of doc.content) walk(child, state);
}

function finalize(state: Walker): string | null {
  if (state.textNodeCount === 0) return null;
  if (!state.allCovered) return null;
  if (state.colors.size !== 1) return null;
  const [only] = Array.from(state.colors);
  return only ?? null;
}

// Single-doc convenience. Used by tests and any caller that operates on
// one TipTap doc (Heading, Paragraph, Button label).
export function dominantTextStyleColor(doc: RichTextDoc | null | undefined): string | null {
  const state: Walker = { textNodeCount: 0, allCovered: true, colors: new Set() };
  visitDoc(doc, state);
  return finalize(state);
}

// Multi-doc variant. Used by NavBar / Footer / HeroBanner where a single
// component owns several TipTap docs (one per nav link, footer column,
// slide CTA, etc.). Returns the color iff EVERY text node across EVERY
// doc carries the same `textStyle.color`.
export function dominantTextStyleColorMulti(
  docs: ReadonlyArray<RichTextDoc | null | undefined>,
): string | null {
  const state: Walker = { textNodeCount: 0, allCovered: true, colors: new Set() };
  for (const doc of docs) visitDoc(doc, state);
  return finalize(state);
}
