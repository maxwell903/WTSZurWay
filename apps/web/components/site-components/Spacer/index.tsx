import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const spacerPropsSchema = z.object({
  height: z.number().nonnegative().default(40),
});

type SpacerProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Spacer({ node, cssStyle }: SpacerProps) {
  const parsed = spacerPropsSchema.safeParse(node.props);
  const height = parsed.success ? parsed.data.height : 40;

  // The Spacer overrides the cssStyle height with its own height prop so the
  // edit-panel UI (Sprint 8) controls "how tall" via a dedicated input.
  const finalStyle: CSSProperties = { ...cssStyle, height: `${height}px` };

  return (
    <div
      data-component-id={node.id}
      data-component-type="Spacer"
      aria-hidden="true"
      style={finalStyle}
    />
  );
}
