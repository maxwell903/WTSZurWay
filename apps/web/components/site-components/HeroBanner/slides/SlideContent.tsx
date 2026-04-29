"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import type { HeroBannerData, Slide } from "../schema";

export type SlideContentProps = {
  node: ComponentNode;
  data: HeroBannerData;
  // Optional active slide. When provided, per-slide overrides apply with
  // banner-level fallback per the spec's Feature 1 fallback rule.
  slide?: Slide;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  // The heading slot is rendered by the parent so RotatingHeading can
  // decorate it; if not supplied SlideContent renders the literal heading.
  headingSlot?: ReactNode;
};

// Per-slide overrides take precedence; when missing, fall back to the
// banner-level field; when both are missing, hide the field entirely.
function pickString(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

export function SlideContent({
  node,
  data,
  slide,
  contentStyle,
  ctaStyle,
  headingSlot,
}: SlideContentProps) {
  const subheading = pickString(slide?.subheading, data.subheading);
  const ctaLabel = pickString(slide?.ctaLabel, data.ctaLabel);
  const ctaHref = pickString(slide?.ctaHref, data.ctaHref);
  const secondaryCtaLabel = pickString(slide?.secondaryCtaLabel, data.secondaryCtaLabel);
  const secondaryCtaHref = pickString(slide?.secondaryCtaHref, data.secondaryCtaHref);

  // Per-slide alignment overrides the layout's default alignment when set.
  const align = slide?.align;
  const verticalAlign = slide?.verticalAlign;
  const composedContentStyle: CSSProperties = {
    ...contentStyle,
    ...(align ? { alignItems: alignToFlex(align), textAlign: align } : {}),
    ...(verticalAlign ? { justifyContent: vAlignToFlex(verticalAlign) } : {}),
  };

  // When a per-slide override is in play we render plain text instead of
  // EditableTextSlot — EditableTextSlot only knows how to write back to
  // the banner-level `propKey`. The slide-level fields are edited from
  // the per-slide editor in Sprint 8's SlideshowImagesEditor.
  //
  // Precedence: slide.heading wins over the layout's `headingSlot` (which
  // wraps banner-level heading with RotatingHeading effect). This matches
  // the spec's fallback rule: per-slide → banner-level. Rotating words
  // therefore only animate the banner-level heading; per-slide headings
  // render verbatim.
  const headingNode = slide?.heading ? (
    <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{slide.heading}</h1>
  ) : (
    (headingSlot ?? (
      <EditableTextSlot
        nodeId={node.id}
        propKey="heading"
        richKey="richHeading"
        doc={data.richHeading}
        fallback={data.heading}
        fullProps={node.props}
        profile="block"
        as="h1"
        style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}
      />
    ))
  );

  const subheadingNode = subheading ? (
    slide?.subheading ? (
      <p style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}>{slide.subheading}</p>
    ) : (
      <EditableTextSlot
        nodeId={node.id}
        propKey="subheading"
        richKey="richSubheading"
        doc={data.richSubheading}
        fallback={data.subheading}
        fullProps={node.props}
        profile="block"
        as="p"
        style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}
      />
    )
  ) : null;

  const secondaryCtaStyle: CSSProperties = {
    ...ctaStyle,
    background: "transparent",
    color: ctaStyle.color ?? "#0f3a5f",
    border: `2px solid ${ctaStyle.color ?? "#0f3a5f"}`,
  };

  return (
    <div style={composedContentStyle}>
      {headingNode}
      {subheadingNode}
      {(ctaLabel || secondaryCtaLabel) && (
        <div data-hero-cta-row="true" style={{ display: "flex", gap: 12 }}>
          {ctaLabel ? (
            <a href={ctaHref || "#"} data-hero-cta="primary" style={ctaStyle}>
              {slide?.ctaLabel ? (
                ctaLabel
              ) : (
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
              )}
            </a>
          ) : null}
          {secondaryCtaLabel ? (
            <a href={secondaryCtaHref || "#"} data-hero-cta="secondary" style={secondaryCtaStyle}>
              {secondaryCtaLabel}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function alignToFlex(a: "left" | "center" | "right"): CSSProperties["alignItems"] {
  if (a === "left") return "flex-start";
  if (a === "right") return "flex-end";
  return "center";
}

function vAlignToFlex(a: "top" | "center" | "bottom"): CSSProperties["justifyContent"] {
  if (a === "top") return "flex-start";
  if (a === "bottom") return "flex-end";
  return "center";
}
