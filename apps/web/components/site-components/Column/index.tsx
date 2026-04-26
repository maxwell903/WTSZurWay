import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";

const columnPropsSchema = z.object({
  span: z.number().int().min(1).max(12).default(12),
  gap: z.number().nonnegative().default(8),
  alignItems: z.enum(["start", "center", "end", "stretch"]).default("stretch"),
});

const ALIGN_ITEMS_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

type ColumnProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

export function Column({ node, cssStyle, children }: ColumnProps) {
  const parsed = columnPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : { span: 12, gap: 8, alignItems: "stretch" as const };

  const finalStyle: CSSProperties = {
    ...cssStyle,
    display: "flex",
    flexDirection: "column",
    flex: data.span,
    gap: `${data.gap}px`,
    alignItems: ALIGN_ITEMS_MAP[data.alignItems],
  };

  return (
    <div
      data-component-id={node.id}
      data-component-type="Column"
      data-column-span={data.span}
      style={finalStyle}
    >
      {children}
    </div>
  );
}
