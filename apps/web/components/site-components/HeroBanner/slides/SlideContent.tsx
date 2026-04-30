"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { RichTextDoc } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { RotatingHeading } from "../effects/RotatingHeading";
import type { CtaButtonStyle, ElementLayout, HeroBannerData, Slide, TextSize } from "../schema";
import { applyElementLayout, mergeCtaStyle } from "../style/cta-style";

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
  primaryCtaStyle: CSSProperties;
  secondaryCtaStyle: CSSProperties;
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
  if (plain.includes("{rotator}") && rotatingWords !== undefined && rotatingWords.length > 0) {
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

// Resolve a per-slide override against a banner-level fallback. Slide takes
// precedence; banner is the default. Both can be undefined.
function pickLayout(
  slideLayout: ElementLayout | undefined,
  bannerLayout: ElementLayout | undefined,
): ElementLayout | undefined {
  return slideLayout ?? bannerLayout;
}
function pickSize(
  slideSize: TextSize | undefined,
  bannerSize: TextSize | undefined,
): TextSize | undefined {
  return slideSize ?? bannerSize;
}
function pickCta(
  slideStyle: CtaButtonStyle | undefined,
  bannerStyle: CtaButtonStyle | undefined,
): CtaButtonStyle | undefined {
  return slideStyle ?? bannerStyle;
}

export function SlideContent({
  node,
  data,
  slide,
  slideIndex,
  contentStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
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

  // Slide-level CTA style overrides ride on top of the banner-level styles
  // already merged by HeroBanner/index.tsx (which gave us primaryCtaStyle
  // and secondaryCtaStyle pre-built from PRIMARY_CTA_DEFAULTS + data.*Style).
  const finalPrimaryCtaBase = mergeCtaStyle(
    primaryCtaStyle,
    pickCta(slide?.primaryCtaStyle, undefined),
  );
  const finalSecondaryCtaBase = mergeCtaStyle(
    secondaryCtaStyle,
    pickCta(slide?.secondaryCtaStyle, undefined),
  );

  // Per-element layout (alignSelf, margins, width, maxWidth) wraps the
  // styled CTA so position is decoupled from style. Slide layout > banner.
  const finalPrimaryCta = applyElementLayout(
    finalPrimaryCtaBase,
    pickLayout(slide?.primaryCtaLayout, data.primaryCtaLayout),
  );
  const finalSecondaryCta = applyElementLayout(
    finalSecondaryCtaBase,
    pickLayout(slide?.secondaryCtaLayout, data.secondaryCtaLayout),
  );

  const ctaRowStyle = applyElementLayout(
    { display: "flex", gap: 12 },
    pickLayout(slide?.ctaRowLayout, data.ctaRowLayout),
  );

  const headingNode = renderHeading({
    node,
    data,
    slide,
    slideIndex,
    prefersReducedMotion,
  });

  const subheadingNode = renderSubheading({ node, data, slide, slideIndex });

  return (
    <div style={composedContentStyle}>
      {headingNode}
      {subheadingNode}
      {(ctaLabel || secondaryCtaLabel) && (
        <div data-hero-cta-row="true" style={ctaRowStyle}>
          {ctaLabel ? (
            <a href={ctaHref || "#"} data-hero-cta="primary" style={finalPrimaryCta}>
              {renderCtaLabel({ node, data, slide, slideIndex })}
            </a>
          ) : null}
          {secondaryCtaLabel ? (
            <a href={secondaryCtaHref || "#"} data-hero-cta="secondary" style={finalSecondaryCta}>
              {renderSecondaryCtaLabel({ node, data, slide, slideIndex })}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function buildHeadingBaseStyle(data: HeroBannerData, slide: Slide | undefined): CSSProperties {
  const size = pickSize(slide?.headingSize, data.headingSize);
  const layout = pickLayout(slide?.headingLayout, data.headingLayout);
  const base: CSSProperties = {
    fontSize: size?.fontSize !== undefined ? `${size.fontSize}px` : "40px",
    fontWeight: 700,
    margin: 0,
  };
  return applyElementLayout(base, layout);
}

function buildSubheadingBaseStyle(data: HeroBannerData, slide: Slide | undefined): CSSProperties {
  const size = pickSize(slide?.subheadingSize, data.subheadingSize);
  const layout = pickLayout(slide?.subheadingLayout, data.subheadingLayout);
  const base: CSSProperties = {
    fontSize: size?.fontSize !== undefined ? `${size.fontSize}px` : "18px",
    margin: 0,
    maxWidth: "640px",
  };
  return applyElementLayout(base, layout);
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
  const baseStyle = buildHeadingBaseStyle(data, slide);

  // When a slide is active, ALL canvas editing routes to that slide's
  // per-slide override fields. The visible content falls back to banner-
  // level when the slide has no override yet, but TipTap writes back to
  // images[slideIndex] so the per-slide panel field and the per-slide
  // canvas TipTap stay in 1:1 sync (and the banner-level field is left
  // untouched, acting only as the initial default).
  if (slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.heading`}
        richKey={`images.${slideIndex}.richHeading`}
        doc={slide.richHeading ?? data.richHeading}
        fallback={slide.heading || data.heading}
        fullProps={node.props}
        profile="block"
        as="h1"
        style={baseStyle}
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "heading", "richHeading")}
      />
    );
  }

  // No slide active (static, no-slides hero) — banner-level path.
  const decision = decideHeadingRender(data.heading, data.richHeading, data.rotatingWords);

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
  const baseStyle = buildSubheadingBaseStyle(data, slide);

  // Slide-active path: TipTap edits always write to the per-slide override.
  // Hide entirely only when both slide and banner are empty.
  if (slide && slideIndex !== undefined) {
    const slidePlain = slide.subheading || data.subheading;
    const slideRich = slide.richSubheading ?? data.richSubheading;
    if (!slidePlain && !slideRich) return null;
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.subheading`}
        richKey={`images.${slideIndex}.richSubheading`}
        doc={slideRich}
        fallback={slidePlain}
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
  // Slide-active path: TipTap edits always write to the per-slide override.
  if (slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.ctaLabel`}
        richKey={`images.${slideIndex}.richCtaLabel`}
        doc={slide.richCtaLabel ?? data.richCtaLabel}
        fallback={slide.ctaLabel || data.ctaLabel}
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
  // Slide-active path: TipTap edits always write to the per-slide override.
  if (slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.secondaryCtaLabel`}
        richKey={`images.${slideIndex}.richSecondaryCtaLabel`}
        doc={slide.richSecondaryCtaLabel ?? data.richSecondaryCtaLabel}
        fallback={slide.secondaryCtaLabel || data.secondaryCtaLabel || ""}
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
