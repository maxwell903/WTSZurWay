"use client";

import type { CSSProperties } from "react";
import type { HeroBannerData } from "../schema";

export type LogoMarqueeProps = {
  logos: NonNullable<HeroBannerData["logoStrip"]>;
};

// Horizontal scrolling logo strip pinned to the bottom of the hero. Used
// by the Logo Marquee preset (S11). Pure CSS animation via marquee
// keyframes registered in globals.css.
export function LogoMarquee({ logos }: LogoMarqueeProps) {
  // Duplicate the list so the loop is seamless — the first half scrolls
  // off the left as the duplicate enters from the right.
  const doubled = [...logos, ...logos];
  return (
    <div data-hero-logo-marquee="true" style={containerStyle}>
      <div style={trackStyle}>
        {doubled.map((logo, i) => (
          <img key={`${logo.src}-${i}`} src={logo.src} alt={logo.alt} style={logoStyle} />
        ))}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 48,
  zIndex: 5,
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
};

const trackStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 48,
  paddingLeft: 48,
  animation: "hero-logo-marquee 30s linear infinite",
  willChange: "transform",
};

const logoStyle: CSSProperties = {
  height: 24,
  flexShrink: 0,
  opacity: 0.85,
};
