import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const headingPropsSchema = z.object({
  text: z.string().default(""),
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
  const level = parsed.success ? parsed.data.level : 2;
  const Tag = levelToTag(level);

  return (
    <Tag data-component-id={node.id} data-component-type="Heading" style={cssStyle}>
      {text}
    </Tag>
  );
}
