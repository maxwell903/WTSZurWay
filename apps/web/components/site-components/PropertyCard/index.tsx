import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const propertyCardPropsSchema = z.object({
  // propertyId is stored but unused in Sprint 5. Sprint 9 will hydrate the
  // card from `lib/rm-api/` when the binding lands.
  propertyId: z.number().int().nonnegative().optional(),
  heading: z.string().default("Property Name"),
  body: z.string().default("Property description goes here."),
  imageSrc: z.string().default(""),
  ctaLabel: z.string().default("View Details"),
  ctaHref: z.string().default("#"),
});

type PropertyCardProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function PropertyCard({ node, cssStyle }: PropertyCardProps) {
  const parsed = propertyCardPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : {
        propertyId: undefined,
        heading: "Property Name",
        body: "Property description goes here.",
        imageSrc: "",
        ctaLabel: "View Details",
        ctaHref: "#",
      };

  const finalStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    color: "#111827",
    ...cssStyle,
  };

  return (
    <article data-component-id={node.id} data-component-type="PropertyCard" style={finalStyle}>
      {data.imageSrc ? (
        <img
          src={data.imageSrc}
          alt={data.heading}
          style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          data-property-image-placeholder="true"
          aria-hidden="true"
          style={{ width: "100%", height: "180px", background: "#e5e7eb" }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>{data.heading}</h3>
        <p style={{ fontSize: "14px", margin: 0, color: "#4b5563" }}>{data.body}</p>
        <a
          href={data.ctaHref}
          style={{
            marginTop: "8px",
            display: "inline-block",
            color: "#0f3a5f",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {data.ctaLabel}
        </a>
      </div>
    </article>
  );
}
