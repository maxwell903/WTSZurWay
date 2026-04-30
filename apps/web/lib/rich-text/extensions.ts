// TipTap extension lists. Two profiles:
//
//   BLOCK_PROFILE  — Heading, Paragraph (paragraphs, lists, headings allowed,
//                    plus inline marks). Phase 1 + 2.
//   INLINE_PROFILE — Button label (inline marks only; block elements like
//                    <h1> / <ul> are illegal inside <button>). Phase 2.
//
// The same extension instances must be shared between `useEditor` (editor
// canvas) and `generateHTML` (visitor renderer) so mark/node serialization
// matches in both directions.

import type { Extensions } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Color } from "@tiptap/extension-color";
import { Document } from "@tiptap/extension-document";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Italic } from "@tiptap/extension-italic";
import { Link } from "@tiptap/extension-link";
import { Strike } from "@tiptap/extension-strike";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Text } from "@tiptap/extension-text";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import { CaseTransform } from "./extensions-custom/case-transform";
import { Direction } from "./extensions-custom/direction";
import { FontSize } from "./extensions-custom/font-size";
import { LetterSpacing } from "./extensions-custom/letter-spacing";
import { LineHeight } from "./extensions-custom/line-height";

// Inline marks shared across both profiles.
const SHARED_MARK_EXTENSIONS = [
  TextStyle,
  Color,
  FontFamily,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  FontSize,
  LetterSpacing,
  CaseTransform,
];

export const BLOCK_PROFILE: Extensions = [
  StarterKit.configure({
    // Drop nodes the website builder doesn't surface yet.
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    code: false,
    // StarterKit 3.x bundles its own Link extension; SHARED_MARK_EXTENSIONS
    // registers a configured Link below (openOnClick: false, autolink,
    // noopener/noreferrer/target=_blank). Disable the bundled one so TipTap
    // doesn't see two Link extensions and emit a "Duplicate extension names"
    // warning on every generateHTML call.
    link: false,
  }),
  TextAlign.configure({
    types: ["paragraph", "heading"],
    alignments: ["left", "center", "right", "justify"],
  }),
  LineHeight.configure({ types: ["paragraph", "heading"] }),
  Direction.configure({ types: ["paragraph", "heading"] }),
  ...SHARED_MARK_EXTENSIONS,
];

// For Button labels: a custom Document whose content schema allows inline
// content directly (no <p> wrapper). Avoids invalid HTML — `<button>`
// cannot legally contain block elements.
const InlineDocument = Document.extend({
  name: "doc",
  content: "text*",
});

export const INLINE_PROFILE: Extensions = [
  InlineDocument,
  Text,
  Bold,
  Italic,
  Underline,
  Strike,
  ...SHARED_MARK_EXTENSIONS,
];

export type RichTextProfile = "block" | "inline";

export function profileExtensions(profile: RichTextProfile): Extensions {
  return profile === "inline" ? INLINE_PROFILE : BLOCK_PROFILE;
}
