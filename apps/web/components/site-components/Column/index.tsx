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

  // Width-source resolution (post-2026-04-28 redesign):
  //   - When the user resizes a Column, we now write `style.width: "${px}px"`
  //     (see `ResizeHandles.tsx`). To make that pixel value actually take
  //     effect inside a flex Row, we set `flex: 0 0 <width>` so flex-basis is
  //     the explicit width and the Column does not grow/shrink.
  //   - When `style.width` is unset (legacy configs / never resized), fall
  //     back to `flex: <span>` so the Column distributes proportionally.
  const hasExplicitWidth = cssStyle.width !== undefined && cssStyle.width !== null;
  const flexValue: CSSProperties["flex"] = hasExplicitWidth
    ? `0 0 ${cssStyle.width as string | number}`
    : data.span;

  const finalStyle: CSSProperties = {
    ...cssStyle,
    display: "flex",
    flexDirection: "column",
    flex: flexValue,
    gap: `${data.gap}px`,
    alignItems: ALIGN_ITEMS_MAP[data.alignItems],
    // Override the default `min-width: auto` / `min-height: auto` that
    // every flex item carries — without these overrides, the Column
    // refuses to shrink below its content's intrinsic size, so an explicit
    // pixel `style.width` / `style.height` smaller than the children stays
    // capped at content size and the user sees their resize "stop short."
    // Setting both to 0 lets the wrapper actually be the size the user
    // chose; content overflows when too small (Style Tab will eventually
    // expose `overflow: hidden | scroll | expand` to clip / scroll).
    minWidth: 0,
    minHeight: 0,
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
