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
import { SlideshowControls, SlideshowSlides, useHeroSlideshow } from "./SlideshowFrame";

export type SplitLayoutProps = {
  node: ComponentNode;
  data: HeroBannerData;
  containerStyle: CSSProperties;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  prefersReducedMotion: boolean;
  side: "left" | "right";
};

// Split layout: text on one half, media on the other. Media never bleeds
// under the text. Each half has min-width:320px so on viewports below
// ~640px the flex-wrap drops the media half below the text half (CSS-only,
// no media query — keeps the renderer pure for SSR).
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
  ctaStyle,
  prefersReducedMotion,
  side,
}: SplitLayoutProps) {
  const layoutName: HeroBannerData["layout"] = side === "left" ? "split-left" : "split-right";
  const textOnLeft = side === "left";
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout={layoutName}
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
        ctaStyle={ctaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
      <div
        data-hero-split-pane="media"
        style={{
          ...halfPanelStyle,
          order: textOnLeft ? 2 : 1,
          backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
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
  ctaStyle,
  prefersReducedMotion,
  side,
}: SplitLayoutProps) {
  const layoutName: HeroBannerData["layout"] = side === "left" ? "split-left" : "split-right";
  const textOnLeft = side === "left";
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
  );
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout={layoutName}
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
        ctaStyle={ctaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
      <div
        data-hero-split-pane="media"
        data-slideshow-index={index}
        style={{ ...halfPanelStyle, order: textOnLeft ? 2 : 1 }}
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
  ctaStyle,
  textOnLeft,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: HeroBannerData["images"][number] | undefined;
  slideIndex: number | undefined;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  textOnLeft: boolean;
  prefersReducedMotion: boolean;
}) {
  const textPanelContentStyle: CSSProperties = {
    ...contentStyle,
    textAlign: textOnLeft ? "left" : "right",
    alignItems: textOnLeft ? "flex-start" : "flex-end",
    color: "#0f172a",
  };
  return (
    <div
      data-hero-split-pane="text"
      style={{
        ...halfPanelStyle,
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
        ctaStyle={{ ...ctaStyle, background: "#0f3a5f", color: "#ffffff" }}
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

const halfPanelStyle: CSSProperties = {
  position: "relative",
  flex: "1 1 50%",
  minWidth: "320px",
  minHeight: "240px",
  overflow: "hidden",
};

function OverlayLayer({ overlay }: { overlay: NonNullable<HeroBannerData["overlay"]> }) {
  if (overlay.kind === "solid") return <SolidOverlay config={overlay} />;
  if (overlay.kind === "linear") return <LinearOverlay config={overlay} />;
  return <RadialOverlay config={overlay} />;
}
