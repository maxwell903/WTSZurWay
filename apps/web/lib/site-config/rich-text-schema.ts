// Zod schema for TipTap's JSONContent shape (the "ProseMirror JSON" doc).
//
// Stored on text-bearing components as `props.richText` / `props.richLabel`
// alongside the legacy plain-string `props.text` / `props.label`. The renderer
// prefers the rich doc and falls back to the plain string when the rich doc
// is absent or invalid.
//
// We intentionally do NOT enumerate every node/mark type here. The set of
// allowed types is gated at render time by the extension list passed to
// `generateHTML` (anything unknown is dropped) and at toolbar time by the
// extension list mounted on `useEditor`. Validating the doc shape (recursive
// objects of {type, attrs, content, marks, text}) is enough at the storage
// boundary; per-mark/per-node validation belongs in the extension layer.

import { z } from "zod";

export type RichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type RichTextNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
};

export type RichTextDoc = {
  type: "doc";
  content?: RichTextNode[];
};

const richTextMarkSchema: z.ZodType<RichTextMark> = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

export const richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(richTextNodeSchema).optional(),
    marks: z.array(richTextMarkSchema).optional(),
    text: z.string().optional(),
  }),
);

export const richTextDocSchema: z.ZodType<RichTextDoc> = z.object({
  type: z.literal("doc"),
  content: z.array(richTextNodeSchema).optional(),
});
