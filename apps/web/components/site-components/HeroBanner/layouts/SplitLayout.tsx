"use client";

import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { CountdownTimer } from "../effects/CountdownTimer";
import { CursorSpotlight } from "../effects/CursorSpotlight";
import { Particles } from "../effects/Particles";
import { LinearOverlay } from "../overlays/LinearOverlay";
import { RadialOverlay } from "../overlays/RadialOverlay";
import { SolidOverlay } from "../overlays/SolidOverlay";
import type { HeroBannerData } from "../schema";
import { SlideContent } from "../slides/SlideContent";
import { mergeCtaStyle } from "../style/cta-style";
import { SlideshowControls, SlideshowSlides, useHeroSlideshow } from "./SlideshowFrame";

export type SplitLayoutProps = {
  node: ComponentNode;
  data: HeroBannerData;
  containerStyle: CSSProperties;
  contentStyle: CSSProperties;
  primaryCtaStyle: CSSProperties;
  secondaryCtaStyle: CSSProperties;
  prefersReducedMotion: boolean;
  side: "left" | "right";
};

// Split layout: text on one half, media on the other. Media never bleeds
// under the text. Each half has min-width:320px so on viewports below
// ~640px the flex-wrap drops the media half below the text half (CSS-only,
// no media query — keeps the renderer pure for SSR).
//
// `data.splitRatio` controls the text panel's % width (clamped 10..90 by
// the schema). `data.splitMediaFit` switches the media panel between
// `cover` (crop to fill) and `contain` (preserve aspect; the section's
// background paints the slack).
export function SplitLayout(props: SplitLayoutProps) {
  if (props.data.images.length === 0) {
    return <SplitStatic {...props} />;
  }
  return <SplitWithSlideshow {...props} />;
}

function SplitStatic({
  node,
  data,
  containerStyle,
  contentStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
  prefersReducedMotion,
  side,
}: SplitLayoutProps) {
  const layoutName: HeroBannerData["layout"] = side === "left" ? "split-left" : "split-right";
  const textOnLeft = side === "left";
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;
  const containMode = data.splitMediaFit === "contain";

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout={layoutName}
      data-hero-split-ratio={data.splitRatio}
      data-hero-split-media-fit={data.splitMediaFit}
      style={splitContainerStyle(containerStyle)}
    >
      <Particles kind={data.particles} prefersReducedMotion={prefersReducedMotion} />
      <CursorSpotlight enabled={data.cursorSpotlight} prefersReducedMotion={prefersReducedMotion} />
      <TextPanel
        node={node}
        data={data}
        slide={undefined}
        slideIndex={undefined}
        contentStyle={contentStyle}
        primaryCtaStyle={primaryCtaStyle}
        secondaryCtaStyle={secondaryCtaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
      <div
        data-hero-split-pane="media"
        style={{
          ...mediaPanelStyle(data.splitRatio),
          order: textOnLeft ? 2 : 1,
          backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined,
          backgroundSize: containMode ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          // Longhand backgroundColor — using the shorthand `background`
          // here would reset backgroundImage above. Transparent in
          // contain-mode lets the section's own backgroundImage paint
          // through the aspect-ratio slack.
          backgroundColor: containMode ? "transparent" : undefined,
        }}
      >
        {data.backgroundImage ? overlay : null}
      </div>
    </section>
  );
}

function SplitWithSlideshow({
  node,
  data,
  containerStyle,
  contentStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
  prefersReducedMotion,
  side,
}: SplitLayoutProps) {
  const layoutName: HeroBannerData["layout"] = side === "left" ? "split-left" : "split-right";
  const textOnLeft = side === "left";
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
    undefined,
    data.splitMediaFit,
  );
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout={layoutName}
      data-hero-split-ratio={data.splitRatio}
      data-hero-split-media-fit={data.splitMediaFit}
      style={splitContainerStyle(containerStyle)}
    >
      <Particles kind={data.particles} prefersReducedMotion={prefersReducedMotion} />
      <CursorSpotlight enabled={data.cursorSpotlight} prefersReducedMotion={prefersReducedMotion} />
      <TextPanel
        node={node}
        data={data}
        slide={data.images[index]}
        slideIndex={index}
        contentStyle={contentStyle}
        primaryCtaStyle={primaryCtaStyle}
        secondaryCtaStyle={secondaryCtaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
      <div
        data-hero-split-pane="media"
        data-slideshow-index={index}
        style={{ ...mediaPanelStyle(data.splitRatio), order: textOnLeft ? 2 : 1 }}
        {...mouseHandlers}
      >
        <SlideshowSlides
          renderEntries={renderEntries}
          activeIndex={index}
          intervalMs={data.intervalMs}
          prefersReducedMotion={prefersReducedMotion}
          slideTransition={data.slideTransition}
        />
        {overlay}
        <SlideshowControls
          index={index}
          count={data.images.length}
          loop={data.loop}
          showDots={data.showDots}
          showArrows={data.showArrows}
          goTo={goTo}
          next={next}
          prev={prev}
        />
      </div>
    </section>
  );
}

function TextPanel({
  node,
  data,
  slide,
  slideIndex,
  contentStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
  textOnLeft,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: HeroBannerData["images"][number] | undefined;
  slideIndex: number | undefined;
  contentStyle: CSSProperties;
  primaryCtaStyle: CSSProperties;
  secondaryCtaStyle: CSSProperties;
  textOnLeft: boolean;
  prefersReducedMotion: boolean;
}) {
  const textPanelContentStyle: CSSProperties = {
    ...contentStyle,
    textAlign: textOnLeft ? "left" : "right",
    alignItems: textOnLeft ? "flex-start" : "flex-end",
    color: "#0f172a",
  };

  // Split text panel has a light background by default, so the v1 white-on-
  // light primary CTA would disappear. Apply the layout's dark-blue inverted
  // primary as the *base* — user-set primaryCtaStyle.backgroundColor /
  // textColor on top of that still wins (mergeCtaStyle was already applied
  // upstream in HeroBanner/index.tsx, so primaryCtaStyle here represents
  // user-merged style. Inverting only when the user hasn't set their own
  // background avoids overwriting their choice).
  const splitPrimaryCta: CSSProperties = data.primaryCtaStyle?.backgroundColor
    ? primaryCtaStyle
    : mergeCtaStyle(primaryCtaStyle, { backgroundColor: "#0f3a5f", textColor: "#ffffff" });

  return (
    <div
      data-hero-split-pane="text"
      style={{
        ...textPanelStyle(data.splitRatio),
        order: textOnLeft ? 1 : 2,
        background: data.splitTextPanelBackground,
      }}
    >
      <SlideContent
        node={node}
        data={data}
        slide={slide}
        slideIndex={slideIndex}
        contentStyle={textPanelContentStyle}
        primaryCtaStyle={splitPrimaryCta}
        secondaryCtaStyle={secondaryCtaStyle}
        prefersReducedMotion={prefersReducedMotion}
      />
      <CountdownTimer countdown={data.countdown} />
    </div>
  );
}

function splitContainerStyle(base: CSSProperties): CSSProperties {
  return {
    ...base,
    display: "flex",
    flexWrap: "wrap",
  };
}

const HALF_PANEL_BASE: CSSProperties = {
  position: "relative",
  minWidth: "320px",
  minHeight: "240px",
  overflow: "hidden",
};

function textPanelStyle(splitRatio: number): CSSProperties {
  return {
    ...HALF_PANEL_BASE,
    flex: `0 0 ${splitRatio}%`,
  };
}

function mediaPanelStyle(splitRatio: number): CSSProperties {
  return {
    ...HALF_PANEL_BASE,
    flex: `0 0 ${100 - splitRatio}%`,
  };
}

function OverlayLayer({ overlay }: { overlay: NonNullable<HeroBannerData["overlay"]> }) {
  if (overlay.kind === "solid") return <SolidOverlay config={overlay} />;
  if (overlay.kind === "linear") return <LinearOverlay config={overlay} />;
  return <RadialOverlay config={overlay} />;
}
