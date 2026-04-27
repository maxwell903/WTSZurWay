import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";

type FlowGroupProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

// FlowGroup is engine-managed. It is NEVER inserted by the user from the
// palette and is invisible to layer-tree / breadcrumb consumers. Its only
// job is to render its children in a horizontal flex row so two top-level
// components can sit side-by-side.
export function FlowGroup({ node, cssStyle, children }: FlowGroupProps) {
  const finalStyle: CSSProperties = {
    width: "100%",
    ...cssStyle,
    display: "flex",
    flexDirection: "row",
  };
  return (
    <div data-component-id={node.id} data-component-type="FlowGroup" style={finalStyle}>
      {children}
    </div>
  );
}
