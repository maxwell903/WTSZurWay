import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";

const rowPropsSchema = z.object({
  gap: z.number().nonnegative().default(16),
  alignItems: z.enum(["start", "center", "end", "stretch"]).default("stretch"),
  justifyContent: z.enum(["start", "center", "end", "between", "around"]).default("start"),
  wrap: z.boolean().default(false),
});

const ALIGN_ITEMS_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

const JUSTIFY_CONTENT_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
} as const;

type RowProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

export function Row({ node, cssStyle, children }: RowProps) {
  const parsed = rowPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : { gap: 16, alignItems: "stretch" as const, justifyContent: "start" as const, wrap: false };

  const finalStyle: CSSProperties = {
    ...cssStyle,
    display: "flex",
    flexDirection: "row",
    gap: `${data.gap}px`,
    alignItems: ALIGN_ITEMS_MAP[data.alignItems],
    justifyContent: JUSTIFY_CONTENT_MAP[data.justifyContent],
    flexWrap: data.wrap ? "wrap" : "nowrap",
  };

  return (
    <div data-component-id={node.id} data-component-type="Row" style={finalStyle}>
      {children}
    </div>
  );
}
