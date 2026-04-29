"use client";

import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, useRef } from "react";
import { CountdownTimer } from "../effects/CountdownTimer";
import { CursorSpotlight } from "../effects/CursorSpotlight";
import { Particles } from "../effects/Particles";
import { RotatingHeading } from "../effects/RotatingHeading";
import { LinearOverlay } from "../overlays/LinearOverlay";
import { RadialOverlay } from "../overlays/RadialOverlay";
import { SolidOverlay } from "../overlays/SolidOverlay";
import type { HeroBannerData } from "../schema";
import { SlideContent } from "../slides/SlideContent";
import { SlideshowControls, SlideshowSlides, useHeroSlideshow } from "./SlideshowFrame";

export type CenteredLayoutProps = {
  node: ComponentNode;
  data: HeroBannerData;
  containerStyle: CSSProperties;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

// Centered layout: text + CTA centered over a full-bleed background or
// slideshow. v1 behaviour preserved verbatim.
export function CenteredLayout({
  node,
  data,
  containerStyle,
  contentStyle,
  ctaStyle,
  prefersReducedMotion,
}: CenteredLayoutProps) {
  const overlay = data.overlay ? <OverlayLayer overlay={data.overlay} /> : null;
  const spotlight = (
    <CursorSpotlight enabled={data.cursorSpotlight} prefersReducedMotion={prefersReducedMotion} />
  );
  const particles = <Particles kind={data.particles} prefersReducedMotion={prefersReducedMotion} />;
  const heading = (
    <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>
      <RotatingHeading
        heading={data.heading}
        rotatingWords={data.rotatingWords}
        prefersReducedMotion={prefersReducedMotion}
      />
    </h1>
  );

  if (data.images.length === 0) {
    return (
      <section
        data-component-id={node.id}
        data-component-type="HeroBanner"
        data-hero-layout="centered"
        style={containerStyle}
      >
        {particles}
        {data.backgroundImage ? overlay : null}
        {spotlight}
        <SlideContent
          node={node}
          data={data}
          contentStyle={contentStyle}
          ctaStyle={ctaStyle}
          headingSlot={heading}
        />
        <CountdownTimer countdown={data.countdown} />
      </section>
    );
  }

  return (
    <CenteredSlideshow
      node={node}
      data={data}
      containerStyle={containerStyle}
      contentStyle={contentStyle}
      ctaStyle={ctaStyle}
      prefersReducedMotion={prefersReducedMotion}
      heading={heading}
      overlay={overlay}
      spotlight={spotlight}
      particles={particles}
    />
  );
}

function CenteredSlideshow({
  node,
  data,
  containerStyle,
  contentStyle,
  ctaStyle,
  prefersReducedMotion,
  heading,
  overlay,
  spotlight,
  particles,
}: CenteredLayoutProps & {
  heading: React.ReactNode;
  overlay: React.ReactNode;
  spotlight: React.ReactNode;
  particles: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    sectionRef,
  );

  return (
    <section
      ref={sectionRef}
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-hero-layout="centered"
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
        contentStyle={contentStyle}
        ctaStyle={ctaStyle}
        headingSlot={heading}
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
