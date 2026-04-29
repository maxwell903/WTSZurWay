"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { RichTextDoc } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { RotatingHeading } from "../effects/RotatingHeading";
import type { HeroBannerData, Slide } from "../schema";

export type SlideContentProps = {
  node: ComponentNode;
  data: HeroBannerData;
  // Optional active slide. When provided, per-slide overrides apply with
  // banner-level fallback per the spec's Feature 1 fallback rule.
  slide?: Slide;
  // Index of `slide` within `data.images`. Required when `slide` is given —
  // the EditableTextSlot deep-patch builders need it to write back to the
  // correct array element. (Used in Section E; declared now for the layout
  // call sites to pass it.)
  slideIndex?: number;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

// Per-slide overrides take precedence; when missing, fall back to the
// banner-level field; when both are missing, hide the field entirely.
function pickString(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

// Heading render decision (Section D of the design):
//  1. Rich content path — `richHeading` exists AND differs from
//     synthesizeDoc(plain, "block"). Render TipTap. No rotation.
//  2. Rotator path — no rich formatting AND plain string contains
//     "{rotator}" AND rotatingWords is non-empty. Render RotatingHeading
//     read-only.
//  3. Plain TipTap path — default. Render TipTap, no rotation.
type HeadingDecision =
  | { kind: "rich" }
  | { kind: "rotator"; plain: string; rotatingWords: readonly string[] }
  | { kind: "plain" };

function decideHeadingRender(
  plain: string,
  rich: RichTextDoc | undefined,
  rotatingWords: readonly string[] | undefined,
): HeadingDecision {
  if (rich !== undefined) {
    const synthesized = synthesizeDoc(plain, "block");
    if (JSON.stringify(rich) !== JSON.stringify(synthesized)) {
      return { kind: "rich" };
    }
  }
  if (
    plain.includes("{rotator}") &&
    rotatingWords !== undefined &&
    rotatingWords.length > 0
  ) {
    return { kind: "rotator", plain, rotatingWords };
  }
  return { kind: "plain" };
}

export function SlideContent({
  node,
  data,
  slide,
  slideIndex,
  contentStyle,
  ctaStyle,
  prefersReducedMotion,
}: SlideContentProps) {
  const subheading = pickString(slide?.subheading, data.subheading);
  const ctaLabel = pickString(slide?.ctaLabel, data.ctaLabel);
  const ctaHref = pickString(slide?.ctaHref, data.ctaHref);
  const secondaryCtaLabel = pickString(slide?.secondaryCtaLabel, data.secondaryCtaLabel);
  const secondaryCtaHref = pickString(slide?.secondaryCtaHref, data.secondaryCtaHref);

  const align = slide?.align;
  const verticalAlign = slide?.verticalAlign;
  const composedContentStyle: CSSProperties = {
    ...contentStyle,
    ...(align ? { alignItems: alignToFlex(align), textAlign: align } : {}),
    ...(verticalAlign ? { justifyContent: vAlignToFlex(verticalAlign) } : {}),
  };

  const headingNode = renderHeading({
    node,
    data,
    slide,
    slideIndex,
    prefersReducedMotion,
  });

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

function renderHeading({
  node,
  data,
  slide,
  slideIndex: _slideIndex,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
  prefersReducedMotion: boolean;
}): ReactNode {
  // Per-slide override path is added in Section E (Task E.2). For now, when
  // a slide.heading override is set we render plain text (existing behavior)
  // and leave the banner-level heading alone.
  if (slide?.heading) {
    return (
      <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{slide.heading}</h1>
    );
  }

  const decision = decideHeadingRender(
    data.heading,
    data.richHeading,
    data.rotatingWords,
  );
  const baseStyle: CSSProperties = { fontSize: "40px", fontWeight: 700, margin: 0 };

  if (decision.kind === "rotator") {
    return (
      <h1 style={baseStyle}>
        <RotatingHeading
          heading={decision.plain}
          rotatingWords={[...decision.rotatingWords]}
          prefersReducedMotion={prefersReducedMotion}
        />
      </h1>
    );
  }

  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="heading"
      richKey="richHeading"
      doc={data.richHeading}
      fallback={data.heading}
      fullProps={node.props}
      profile="block"
      as="h1"
      style={baseStyle}
    />
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
