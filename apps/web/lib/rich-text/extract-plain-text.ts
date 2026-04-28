// Project a TipTap JSON doc back to a plain string. Used to denormalize
// `richText` → `text` on every edit so:
//
//   (a) the visitor renderer can fall back to `text` if `richText` ever
//       fails to parse, and
//   (b) AI ops that read `props.text` (existing setText, generation
//       prompts that quote the current text) keep seeing the user's
//       words even when the doc has formatting.
//
// Block boundaries collapse to a single newline. Hard breaks become "\n".
// Marks are ignored — the projection is lossy by design.

import type { RichTextDoc, RichTextNode } from "@/lib/site-config";

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "bulletList",
  "orderedList",
  "blockquote",
]);

function walk(node: RichTextNode, out: string[]): void {
  if (node.type === "text" && typeof node.text === "string") {
    out.push(node.text);
    return;
  }
  if (node.type === "hardBreak") {
    out.push("\n");
    return;
  }

  const isBlock = node.type !== undefined && BLOCK_TYPES.has(node.type);
  // Only emit a block separator if we already have output and the previous
  // character isn't already a newline — keeps output tight without doubling
  // up on consecutive empty paragraphs.
  if (isBlock && out.length > 0 && out[out.length - 1] !== "\n") {
    out.push("\n");
  }

  for (const child of node.content ?? []) walk(child, out);
}

export function extractPlainText(doc: RichTextDoc | undefined): string {
  if (!doc) return "";
  const out: string[] = [];
  for (const child of doc.content ?? []) walk(child, out);
  // Trim a single trailing newline that the block-separator rule may have
  // appended after the last block.
  const joined = out.join("");
  return joined.endsWith("\n") ? joined.slice(0, -1) : joined;
}
