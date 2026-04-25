import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const dividerPropsSchema = z.object({
  thickness: z.number().nonnegative().default(1),
  color: z.string().default("#e5e7eb"),
});

type DividerProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Divider({ node, cssStyle }: DividerProps) {
  const parsed = dividerPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : { thickness: 1, color: "#e5e7eb" };

  // Override only the border properties — leave callers' margin/padding intact.
  const finalStyle: CSSProperties = {
    ...cssStyle,
    borderTopWidth: data.thickness,
    borderTopStyle: "solid",
    borderTopColor: data.color,
    borderRightStyle: "none",
    borderBottomStyle: "none",
    borderLeftStyle: "none",
  };

  return <hr data-component-id={node.id} data-component-type="Divider" style={finalStyle} />;
}
