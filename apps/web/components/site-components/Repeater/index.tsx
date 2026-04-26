// Sprint 5 ships the Repeater SHELL only. PROJECT_SPEC.md §8.9 describes
// the full data-binding behavior (data source, filters, connected inputs,
// sort, limit, empty state, RM-token resolution). Sprint 9 owns that work.
//
// In this sprint:
//   - We render the first child once.
//   - We do not import the RM-API client.
//   - We do not import the data-fetching library.
//   - RM-token expressions in props pass through verbatim, unresolved.
//
// Touching any of those in this sprint is a Deviation.
import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, Children, type ReactNode } from "react";

type RepeaterProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

export function Repeater({ node, cssStyle, children }: RepeaterProps) {
  const childArray = Children.toArray(children);
  const firstChild = childArray[0] ?? null;

  return (
    <div data-component-id={node.id} data-component-type="Repeater" style={cssStyle}>
      {firstChild}
    </div>
  );
}
