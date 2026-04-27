import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { Children } from "react";
import { z } from "zod";

const sectionPropsSchema = z.object({
  as: z.enum(["section", "div", "main", "article"]).default("section"),
});

type SectionProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

export function Section({ node, cssStyle, children }: SectionProps) {
  const parsed = sectionPropsSchema.safeParse(node.props);
  const tag = parsed.success ? parsed.data.as : "section";

  // Conditional flex layout: switch to flex-row-wrap when ANY direct child
  // has an explicit `style.width`. This lets two children with width:50% sit
  // side-by-side, while sections with all-default-width children keep their
  // existing block-stack behavior unchanged.
  const childNodes = node.children ?? [];
  const hasExplicitWidthChild = childNodes.some((c) => c.style?.width !== undefined);

  let renderedChildren: ReactNode = children;
  let finalStyle: CSSProperties = cssStyle;

  if (hasExplicitWidthChild) {
    finalStyle = {
      ...cssStyle,
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
    };
    // Wrap each child with a flex-sizing div so children without explicit
    // widths still take a full row (matches the no-flex behavior they had
    // before any sibling got an explicit width).
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
