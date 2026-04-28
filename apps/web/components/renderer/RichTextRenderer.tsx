// Visitor-side rich text renderer. Pure server-renderable: takes a TipTap
// JSON doc, runs `generateHTML` against the same extension list the editor
// uses, sanitizes with isomorphic-dompurify, and emits the result through
// `dangerouslySetInnerHTML` on the caller's chosen tag.
//
// Importantly, this module imports `@tiptap/html` (small, no DOM) but NOT
// `@tiptap/react` — so the visitor bundle does not pull in the editor
// runtime. The editor canvas uses TipTapEditableSlot (separate file) which
// imports `@tiptap/react`.

import { type RichTextProfile, profileExtensions } from "@/lib/rich-text/extensions";
import type { RichTextDoc } from "@/lib/site-config";
import { richTextDocSchema } from "@/lib/site-config";
import { generateHTML } from "@tiptap/html";
import DOMPurify from "isomorphic-dompurify";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

type AnyHtmlAttrs = HTMLAttributes<HTMLElement> & Record<string, unknown>;

export type RichTextRendererProps = {
  doc: RichTextDoc | undefined;
  fallback: string;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
  // BLOCK is for Heading / Paragraph; INLINE is for Button (no <p>
  // wrapper, no block elements that would be illegal inside <button>).
  profile?: RichTextProfile;
  // Forward arbitrary data-* / aria-* attributes (e.g. `data-component-id`
  // that the existing Heading/Paragraph renders today).
  passthroughAttrs?: Record<string, unknown>;
  // Used as visible content when no doc is present AND the parent wants to
  // render plain text inside a child slot (e.g., Button's icon + label).
  children?: ReactNode;
};

export function RichTextRenderer({
  doc,
  fallback,
  as,
  style,
  className,
  passthroughAttrs,
  profile = "block",
  children,
}: RichTextRendererProps) {
  const Tag = (as ?? "div") as ElementType;
  const baseAttrs: AnyHtmlAttrs = {
    ...(passthroughAttrs ?? {}),
    style,
    className,
  };

  if (!doc) {
    return (
      <Tag {...baseAttrs}>
        {fallback}
        {children}
      </Tag>
    );
  }

  const parsed = richTextDocSchema.safeParse(doc);
  if (!parsed.success) {
    // Shape-invalid docs (corruption, AI hallucination that slipped past
    // the op-level validation) fall back to plain text rather than throw —
    // the visitor site never goes down because of a bad rich-text doc.
    return (
      <Tag {...baseAttrs}>
        {fallback}
        {children}
      </Tag>
    );
  }

  const rawHtml = generateHTML(parsed.data, profileExtensions(profile));
  const safeHtml = DOMPurify.sanitize(rawHtml);

  return (
    <Tag
      {...baseAttrs}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is produced by TipTap's generateHTML against a closed extension list and then sanitized by isomorphic-dompurify; the schema rejects unknown nodes/marks at the storage boundary.
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
