import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { Children } from "react";
import { z } from "zod";

const sectionPropsSchema = z.object({
  as: z.enum(["section", "div", "main", "article"]).default("section"),
  // When true, direct children render in absolute layout at their
  // `position.{x,y}`. Resizing, moving, or AI-inserting one child can no
  // longer reflow its siblings. Snapshot of current visual rects fires on
  // false→true transitions in the EditPanel.
  freePlacement: z.boolean().optional(),
});

type SectionProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

function readFreePlacement(props: Record<string, unknown>): boolean {
  // Transitional read: legacy `fitToContents` (Approach B) is treated as
  // `freePlacement` so a config saved before the rename still toggles on.
  if (props.freePlacement === true) return true;
  if ((props as { fitToContents?: unknown }).fitToContents === true) return true;
  return false;
}

function computeFreePlacementMinHeight(children: readonly ComponentNode[]): number {
  let max = 0;
  for (const c of children) {
    const y = c.position?.y ?? 0;
    const hStr = c.style?.height;
    const h = typeof hStr === "string" ? Number.parseFloat(hStr) : 0;
    const bottom = y + (Number.isFinite(h) ? h : 0);
    if (bottom > max) max = bottom;
  }
  return Math.round(max);
}

export function Section({ node, cssStyle, children }: SectionProps) {
  const parsed = sectionPropsSchema.safeParse(node.props);
  const tag = parsed.success ? parsed.data.as : "section";
  const freePlacement = readFreePlacement(node.props);

  const childNodes = node.children ?? [];
  const childArray = Children.toArray(children);

  let renderedChildren: ReactNode = children;
  let finalStyle: CSSProperties = cssStyle;

  if (freePlacement) {
    // Absolute layout for direct children. Section becomes the positioning
    // context. Each child is wrapped in an absolute div fed from
    // `child.position` (defaulting to (0,0)) and the child's own
    // `style.width`/`style.height` (defaulting to "auto").
    //
    // Force the section's height to fit its children's bounding box when
    // free-placement is on. We deliberately drop any `cssStyle.height` /
    // `cssStyle.minHeight` here because in flow mode those values are sized
    // for normal block layout (often inherited from a sibling-stack height
    // calc the user never explicitly chose) and are usually wrong once the
    // children are absolutely positioned — they leave a tall empty void
    // below the last child. The user can still override via the Style tab,
    // but in absolute mode "fit to children" is the right default.
    const minHeight = computeFreePlacementMinHeight(childNodes);
    const { height: _h, minHeight: _mh, ...cssStyleNoHeight } = cssStyle;
    finalStyle = {
      ...cssStyleNoHeight,
      position: "relative",
      ...(minHeight > 0 ? { minHeight: `${minHeight}px` } : {}),
    };
    if (typeof window !== "undefined") {
      // Editor-only diagnostic: surface the computed min-height + the
      // children's positions so we can verify the rendered section bounds
      // match expectations.
      console.info(
        `[Section freePlacement] id=${node.id} minHeight=${minHeight}px children=${childNodes.length}`,
        childNodes.map((c) => ({
          id: c.id,
          type: c.type,
          x: c.position?.x,
          y: c.position?.y,
          w: c.style?.width,
          h: c.style?.height,
        })),
      );
    }
    renderedChildren = childArray.map((child, idx) => {
      const childNode = childNodes[idx];
      const x = childNode?.position?.x ?? 0;
      const y = childNode?.position?.y ?? 0;
      const w = childNode?.style?.width ?? "auto";
      const h = childNode?.style?.height ?? "auto";
      return (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: no stable id at this layer; children are positional
          key={idx}
          data-free-placement-child={childNode?.id ?? ""}
          data-parent-section-id={node.id}
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: w,
            height: h,
          }}
        >
          {child}
        </div>
      );
    });
  } else {
    // Conditional flex layout: switch to flex-row-wrap when ANY direct child
    // has an explicit `style.width`. This lets two children with width:50%
    // sit side-by-side; sections with all-default-width children keep
    // their block-stack behavior unchanged.
    const hasExplicitWidthChild = childNodes.some((c) => c.style?.width !== undefined);
    if (hasExplicitWidthChild) {
      finalStyle = {
        ...cssStyle,
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-start",
      };
      renderedChildren = Children.map(children, (child, idx) => {
        const childNode = childNodes[idx];
        const w = childNode?.style?.width;
        const flex = w ? `0 0 ${w}` : "1 1 100%";
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: no stable id available at render time; children are positional
          <div key={idx} style={{ flex, minWidth: 0, maxWidth: "100%" }}>
            {child}
          </div>
        );
      });
    }
  }

  if (tag === "div") {
    return (
      <div data-component-id={node.id} data-component-type="Section" style={finalStyle}>
        {renderedChildren}
      </div>
    );
  }
  if (tag === "main") {
    return (
      <main data-component-id={node.id} data-component-type="Section" style={finalStyle}>
        {renderedChildren}
      </main>
    );
  }
  if (tag === "article") {
    return (
      <article data-component-id={node.id} data-component-type="Section" style={finalStyle}>
        {renderedChildren}
      </article>
    );
  }
  return (
    <section data-component-id={node.id} data-component-type="Section" style={finalStyle}>
      {renderedChildren}
    </section>
  );
}
