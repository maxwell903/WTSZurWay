import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { type RichTextDoc, richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const paragraphPropsSchema = z.object({
  text: z.string().default(""),
  // Rich-text Phase 2: optional alongside `text`. Renderer prefers the rich
  // doc; the plain-text field is kept as a denormalized fallback.
  richText: richTextDocSchema.optional(),
});

type ParagraphProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Paragraph({ node, cssStyle }: ParagraphProps) {
  const parsed = paragraphPropsSchema.safeParse(node.props);
  const text = parsed.success ? parsed.data.text : "";
  const richText: RichTextDoc | undefined = parsed.success ? parsed.data.richText : undefined;

  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="text"
      richKey="richText"
      doc={richText}
      fallback={text}
      fullProps={node.props}
      profile="block"
      as="p"
      style={cssStyle}
      passthroughAttrs={{
        "data-component-id": node.id,
        "data-component-type": "Paragraph",
      }}
    />
  );
}
