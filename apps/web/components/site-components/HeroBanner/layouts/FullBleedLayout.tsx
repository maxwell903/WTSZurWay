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

export type FullBleedLayoutProps = {
  node: ComponentNode;
  data: HeroBannerData;
  containerStyle: CSSProperties;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

// Full-bleed: media fills the hero edge-to-edge with no padding; text floats
// in the bottom-left corner inside a stronger overlay panel for legibility.
export function FullBleedLayout({
  node,
  data,
  containerStyle,
  contentStyle,
  ctaStyle,
  prefersReducedMotion,
}: FullBleedLayoutProps) {
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;
  const spotlight = (
    <CursorSpotlight enabled={data.cursorSpotlight} prefersReducedMotion={prefersReducedMotion} />
  );
  const particles = <Particles kind={data.particles} prefersReducedMotion={prefersReducedMotion} />;
  // Corner-anchored text panel with a darker backdrop so text stays
  // legible even on busy media. Bottom-left chosen as the default; future
  // sprints can expose this as a prop.
  const cornerPanelStyle: CSSProperties = {
    ...contentStyle,
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "auto",
    height: "auto",
    maxWidth: "min(560px, 80%)",
    padding: "32px",
    background: "linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.35))",
    alignItems: "flex-start",
    textAlign: "left",
    zIndex: 4,
  };

  if (data.images.length === 0) {
    return (
      <section
        data-component-id={node.id}
        data-component-type="HeroBanner"
        data-hero-layout="full-bleed"
        style={containerStyle}
      >
        {particles}
        {data.backgroundImage ? overlay : null}
        {spotlight}
        <SlideContent
          node={node}
          data={data}
          contentStyle={cornerPanelStyle}
          ctaStyle={ctaStyle}
          prefersReducedMotion={prefersReducedMotion}
        />
        <CountdownTimer countdown={data.countdown} />
      </section>
    );
  }

  return (
    <FullBleedSlideshow
      node={node}
      data={data}
      containerStyle={containerStyle}
      cornerPanelStyle={cornerPanelStyle}
      ctaStyle={ctaStyle}
      prefersReducedMotion={prefersReducedMotion}
      overlay={overlay}
      spotlight={spotlight}
      particles={particles}
    />
  );
}

function FullBleedSlideshow({
  node,
  data,
  containerStyle,
  cornerPanelStyle,
  ctaStyle,
  prefersReducedMotion,
  overlay,
  spotlight,
  particles,
}: Omit<FullBleedLayoutProps, "contentStyle"> & {
  cornerPanelStyle: CSSProperties;
  overlay: React.ReactNode;
  spotlight: React.ReactNode;
  particles: React.ReactNode;
}) {
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
  );

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout="full-bleed"
      data-slideshow-index={index}
      style={containerStyle}
      {...mouseHandlers}
    >
      {particles}
      <SlideshowSlides
        renderEntries={renderEntries}
        activeIndex={index}
        intervalMs={data.intervalMs}
        prefersReducedMotion={prefersReducedMotion}
        slideTransition={data.slideTransition}
      />
      {overlay}
      {spotlight}
      <SlideContent
        node={node}
        data={data}
        slide={data.images[index]}
        slideIndex={index}
        contentStyle={cornerPanelStyle}
        ctaStyle={ctaStyle}
        prefersReducedMotion={prefersReducedMotion}
      />
      <CountdownTimer countdown={data.countdown} />
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
    </section>
  );
}

function OverlayLayer({ overlay }: { overlay: NonNullable<HeroBannerData["overlay"]> }) {
  if (overlay.kind === "solid") return <SolidOverlay config={overlay} />;
  if (overlay.kind === "linear") return <LinearOverlay config={overlay} />;
  return <RadialOverlay config={overlay} />;
}
