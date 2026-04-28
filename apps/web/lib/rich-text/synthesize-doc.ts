// Lift a plain string into a TipTap JSON doc. Used for two flows:
//
//   1) Lazy migration — first time the toolbar opens on a Heading whose
//      `props.richText` is undefined, we synthesize one from `props.text`
//      so the editor has something to mount.
//   2) Plain-text edit — when the user edits via the left-panel textarea
//      (the read-only-mirror's "Edit as plain text" button), the new
//      string round-trips through here so the rich field stays in sync.
//
// Profile-aware (Phase 3): the BLOCK profile wraps content in a single
// paragraph; the INLINE profile (used for Button labels) emits the
// content as flat inline children inside `doc` directly because
// `<button>` cannot legally contain block elements and the INLINE
// schema's Document is `content: "text*"`.
//
// Newlines (\n) become hard breaks; the empty string becomes an empty
// paragraph (block) or empty doc (inline). Migration is intentionally
// lossy in the safe direction (plain → rich preserves text, never
// invents formatting).

import type { RichTextDoc, RichTextNode } from "@/lib/site-config";

export type SynthesizeProfile = "block" | "inline";

function inlineSegments(text: string): RichTextNode[] {
  if (text === "") return [];
  const segments = text.split("\n");
  const inline: RichTextNode[] = [];
  segments.forEach((segment, idx) => {
    if (segment.length > 0) inline.push({ type: "text", text: segment });
    if (idx < segments.length - 1) inline.push({ type: "hardBreak" });
  });
  return inline;
}

export function synthesizeDoc(text: string, profile: SynthesizeProfile = "block"): RichTextDoc {
  const inline = inlineSegments(text);
  if (profile === "inline") {
    return { type: "doc", content: inline };
  }
  if (text === "") {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: inline }],
  };
}
