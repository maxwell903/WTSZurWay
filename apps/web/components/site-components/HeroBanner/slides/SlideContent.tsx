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

// Builds a deep-patch function for a single slide field. The patch must
// include the entire `images` array so siblings are not clobbered.
function makeSlideFieldPatcher(
  data: HeroBannerData,
  slideIndex: number,
  plainKey: keyof Slide,
  richKey: string,
): (json: RichTextDoc, plain: string) => Record<string, unknown> {
  return (json, plain) => {
    const next = data.images.slice();
    const current = next[slideIndex];
    if (!current) return {};
    next[slideIndex] = { ...current, [plainKey]: plain, [richKey]: json };
    return { images: next };
  };
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

  const subheadingNode = renderSubheading({ node, data, slide, slideIndex });

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
              {renderCtaLabel({ node, data, slide, slideIndex })}
            </a>
          ) : null}
          {secondaryCtaLabel ? (
            <a href={secondaryCtaHref || "#"} data-hero-cta="secondary" style={secondaryCtaStyle}>
              {renderSecondaryCtaLabel({ node, data, slide, slideIndex })}
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
  slideIndex,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
  prefersReducedMotion: boolean;
}): ReactNode {
  const baseStyle: CSSProperties = { fontSize: "40px", fontWeight: 700, margin: 0 };

  // Per-slide override path
  if (slide && slideIndex !== undefined && (slide.heading !== undefined || slide.richHeading !== undefined)) {
    const slidePlain = slide.heading ?? "";
    const slideRich = slide.richHeading;
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.heading`}
        richKey={`images.${slideIndex}.richHeading`}
        doc={slideRich}
        fallback={slidePlain}
        fullProps={node.props}
        profile="block"
        as="h1"
        style={baseStyle}
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "heading", "richHeading")}
      />
    );
  }

  // Banner-level path (rich / rotator / plain)
  const decision = decideHeadingRender(
    data.heading,
    data.richHeading,
    data.rotatingWords,
  );

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

function renderSubheading({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide && (slide.subheading !== undefined || slide.richSubheading !== undefined);
  const baseStyle: CSSProperties = { fontSize: "18px", margin: 0, maxWidth: "640px" };

  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.subheading`}
        richKey={`images.${slideIndex}.richSubheading`}
        doc={slide.richSubheading}
        fallback={slide.subheading ?? ""}
        fullProps={node.props}
        profile="block"
        as="p"
        style={baseStyle}
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "subheading", "richSubheading")}
      />
    );
  }

  if (!data.subheading && !data.richSubheading) return null;
  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="subheading"
      richKey="richSubheading"
      doc={data.richSubheading}
      fallback={data.subheading}
      fullProps={node.props}
      profile="block"
      as="p"
      style={baseStyle}
    />
  );
}

function renderCtaLabel({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide && (slide.ctaLabel !== undefined || slide.richCtaLabel !== undefined);
  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.ctaLabel`}
        richKey={`images.${slideIndex}.richCtaLabel`}
        doc={slide.richCtaLabel}
        fallback={slide.ctaLabel ?? ""}
        fullProps={node.props}
        profile="inline"
        as="span"
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "ctaLabel", "richCtaLabel")}
      />
    );
  }
  return (
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
  );
}

function renderSecondaryCtaLabel({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide &&
    (slide.secondaryCtaLabel !== undefined || slide.richSecondaryCtaLabel !== undefined);
  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.secondaryCtaLabel`}
        richKey={`images.${slideIndex}.richSecondaryCtaLabel`}
        doc={slide.richSecondaryCtaLabel}
        fallback={slide.secondaryCtaLabel ?? ""}
        fullProps={node.props}
        profile="inline"
        as="span"
        buildWritePatch={makeSlideFieldPatcher(
          data,
          slideIndex,
          "secondaryCtaLabel",
          "richSecondaryCtaLabel",
        )}
      />
    );
  }
  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="secondaryCtaLabel"
      richKey="richSecondaryCtaLabel"
      doc={data.richSecondaryCtaLabel}
      fallback={data.secondaryCtaLabel ?? ""}
      fullProps={node.props}
      profile="inline"
      as="span"
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
