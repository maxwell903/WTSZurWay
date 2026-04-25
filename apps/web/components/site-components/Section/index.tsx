import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
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

  if (tag === "div") {
    return (
      <div data-component-id={node.id} data-component-type="Section" style={cssStyle}>
        {children}
      </div>
    );
  }
  if (tag === "main") {
    return (
      <main data-component-id={node.id} data-component-type="Section" style={cssStyle}>
        {children}
      </main>
    );
  }
  if (tag === "article") {
    return (
      <article data-component-id={node.id} data-component-type="Section" style={cssStyle}>
        {children}
      </article>
    );
  }
  return (
    <section data-component-id={node.id} data-component-type="Section" style={cssStyle}>
      {children}
    </section>
  );
}
