import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const galleryPropsSchema = z.object({
  images: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string().optional(),
      }),
    )
    .default([]),
  columns: z.number().int().min(1).max(6).default(3),
  gap: z.number().nonnegative().default(8),
});

type GalleryProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Gallery({ node, cssStyle }: GalleryProps) {
  const parsed = galleryPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : { images: [], columns: 3, gap: 8 };

  if (data.images.length === 0) {
    return (
      <div
        data-component-id={node.id}
        data-component-type="Gallery"
        data-empty="true"
        style={cssStyle}
      />
    );
  }

  const finalStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${data.columns}, 1fr)`,
    gap: `${data.gap}px`,
    ...cssStyle,
  };

  return (
    <div data-component-id={node.id} data-component-type="Gallery" style={finalStyle}>
      {data.images.map((image, index) => (
        <img
          // biome-ignore lint/suspicious/noArrayIndexKey: gallery is a flat list keyed by position
          key={index}
          src={image.src}
          alt={image.alt ?? ""}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      ))}
    </div>
  );
}
