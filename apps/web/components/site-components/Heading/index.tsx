import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { type RichTextDoc, richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const headingPropsSchema = z.object({
  text: z.string().default(""),
  // Rich-text Phase 1: optional alongside `text`. Renderer prefers the
  // rich doc; the plain-text field is kept as a denormalized fallback.
  richText: richTextDocSchema.optional(),
  level: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
    .default(2),
});

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function levelToTag(level: 1 | 2 | 3 | 4 | 5 | 6): HeadingTag {
  return `h${level}` as HeadingTag;
}

type HeadingProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Heading({ node, cssStyle }: HeadingProps) {
  const parsed = headingPropsSchema.safeParse(node.props);
  const text = parsed.success ? parsed.data.text : "";
  const richText: RichTextDoc | undefined = parsed.success ? parsed.data.richText : undefined;
  const level = parsed.success ? parsed.data.level : 2;
  const Tag = levelToTag(level);

  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="text"
      richKey="richText"
      doc={richText}
      fallback={text}
      fullProps={node.props}
      as={Tag}
      style={cssStyle}
      passthroughAttrs={{
        "data-component-id": node.id,
        "data-component-type": "Heading",
      }}
    />
  );
}
