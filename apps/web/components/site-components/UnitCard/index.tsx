import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const unitCardPropsSchema = z.object({
  // unitId is stored but unused in Sprint 5. Sprint 9 will hydrate the
  // card from `lib/rm-api/getUnits` when the binding lands.
  unitId: z.number().int().nonnegative().optional(),
  heading: z.string().default("Unit Name"),
  // Rich-text Phase 4: optional formatted heading + CTA label.
  richHeading: richTextDocSchema.optional(),
  beds: z.number().nonnegative().default(0),
  baths: z.number().nonnegative().default(0),
  sqft: z.number().nonnegative().default(0),
  rent: z.number().nonnegative().default(0),
  imageSrc: z.string().default(""),
  ctaLabel: z.string().default("View Unit"),
  richCtaLabel: richTextDocSchema.optional(),
  ctaHref: z.string().default("#"),
});

type UnitCardProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

const RENT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function UnitCard({ node, cssStyle }: UnitCardProps) {
  const parsed = unitCardPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : {
        unitId: undefined,
        heading: "Unit Name",
        richHeading: undefined,
        beds: 0,
        baths: 0,
        sqft: 0,
        rent: 0,
        imageSrc: "",
        ctaLabel: "View Unit",
        richCtaLabel: undefined,
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

  const stats = `${data.beds} bd · ${data.baths} ba · ${data.sqft} sqft`;
  const rentDisplay = `${RENT_FORMATTER.format(data.rent)}/mo`;

  return (
    <article data-component-id={node.id} data-component-type="UnitCard" style={finalStyle}>
      {data.imageSrc ? (
        <img
          src={data.imageSrc}
          alt={data.heading}
          style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          data-unit-image-placeholder="true"
          aria-hidden="true"
          style={{ width: "100%", height: "180px", background: "#e5e7eb" }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "16px" }}>
        <EditableTextSlot
          nodeId={node.id}
          propKey="heading"
          richKey="richHeading"
          doc={data.richHeading}
          fallback={data.heading}
          fullProps={node.props}
          profile="block"
          as="h3"
          style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}
        />
        <div data-unit-stats="true" style={{ fontSize: "13px", color: "#4b5563" }}>
          {stats}
        </div>
        <div data-unit-rent="true" style={{ fontSize: "16px", fontWeight: 600 }}>
          {rentDisplay}
        </div>
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
          <EditableTextSlot
            nodeId={node.id}
            propKey="ctaLabel"
            richKey="richCtaLabel"
            doc={data.richCtaLabel}
            fallback={data.ctaLabel}
            fullProps={node.props}
            profile="inline"
            as="span"
          />
        </a>
      </div>
    </article>
  );
}
