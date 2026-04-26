import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const DEFAULT_ADDRESS = "Cincinnati, OH";

const mapEmbedPropsSchema = z.object({
  address: z.string().default(DEFAULT_ADDRESS),
  zoom: z.number().int().min(1).max(20).default(14),
  height: z.string().default("320px"),
});

type MapEmbedProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function MapEmbed({ node, cssStyle }: MapEmbedProps) {
  const parsed = mapEmbedPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : { address: DEFAULT_ADDRESS, zoom: 14, height: "320px" };

  // An empty address produces an invalid Google Maps URL, so we fall back to
  // the default address if the caller passes an empty string.
  const address = data.address.trim().length > 0 ? data.address : DEFAULT_ADDRESS;

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${data.zoom}&output=embed`;

  const finalStyle: CSSProperties = {
    border: 0,
    width: "100%",
    height: data.height,
    ...cssStyle,
  };

  return (
    <iframe
      data-component-id={node.id}
      data-component-type="MapEmbed"
      title={`Map of ${address}`}
      src={src}
      style={finalStyle}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
