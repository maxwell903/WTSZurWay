import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const imagePropsSchema = z.object({
  src: z.string().default(""),
  alt: z.string().default(""),
  fit: z.enum(["contain", "cover", "fill", "none", "scale-down"]).default("cover"),
});

type ImageProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// TODO(architect): migrate to next/image after remotePatterns are configured
// in Sprint 15. Sprint 3 ships a plain <img> so arbitrary external URLs work
// without next.config.mjs touchpoints.
export function Image({ node, cssStyle }: ImageProps) {
  const parsed = imagePropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : { src: "", alt: "", fit: "cover" as const };

  const finalStyle: CSSProperties = { ...cssStyle, objectFit: data.fit };

  return (
    <img
      data-component-id={node.id}
      data-component-type="Image"
      src={data.src}
      alt={data.alt}
      style={finalStyle}
    />
  );
}
