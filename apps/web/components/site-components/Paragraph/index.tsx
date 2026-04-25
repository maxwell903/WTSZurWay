import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const paragraphPropsSchema = z.object({
  text: z.string().default(""),
});

type ParagraphProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Paragraph({ node, cssStyle }: ParagraphProps) {
  const parsed = paragraphPropsSchema.safeParse(node.props);
  const text = parsed.success ? parsed.data.text : "";

  return (
    <p data-component-id={node.id} data-component-type="Paragraph" style={cssStyle}>
      {text}
    </p>
  );
}
