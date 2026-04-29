"use client";

import type { CSSProperties } from "react";
import type { HeroBannerData } from "../schema";

export type ParticlesProps = {
  kind: HeroBannerData["particles"];
  prefersReducedMotion: boolean;
};

// Pure-CSS particle backgrounds. No new dependencies, no canvas. Each kind
// renders as a single positioned div with an inline `background-image`
// composed of layered radial-gradients (stars/dots) or repeating-linear
// (grid). Animation is keyframed via CSS classes registered in
// app/globals.css; under prefers-reduced-motion the animation classes are
// omitted so the pattern is static decorative.
export function Particles({ kind, prefersReducedMotion }: ParticlesProps) {
  if (kind === "none") return null;

  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundRepeat: "repeat",
  };

  if (kind === "stars") {
    return (
      <div
        data-hero-effect="particles"
        data-hero-particles-kind="stars"
        data-hero-particles-motion={prefersReducedMotion ? "static" : "animated"}
        style={{
          ...baseStyle,
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.7) 0.5px, transparent 1.5px)," +
            "radial-gradient(circle at 65% 80%, rgba(255,255,255,0.5) 0.5px, transparent 1.5px)," +
            "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.6) 0.5px, transparent 1.5px)," +
            "radial-gradient(circle at 40% 60%, rgba(255,255,255,0.4) 0.5px, transparent 1.5px)",
          backgroundSize: "240px 240px, 320px 320px, 180px 180px, 200px 200px",
          animation: prefersReducedMotion ? undefined : "hero-particles-drift 80s linear infinite",
        }}
      />
    );
  }

  if (kind === "dots") {
    return (
      <div
        data-hero-effect="particles"
        data-hero-particles-kind="dots"
        data-hero-particles-motion={prefersReducedMotion ? "static" : "animated"}
        style={{
          ...baseStyle,
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(255,180,90,0.6) 1px, transparent 3px)," +
            "radial-gradient(circle at 70% 70%, rgba(160,200,255,0.55) 1px, transparent 3px)",
          backgroundSize: "120px 120px, 160px 160px",
          animation: prefersReducedMotion ? undefined : "hero-particles-float 30s linear infinite",
        }}
      />
    );
  }

  // kind === "grid"
  return (
    <div
      data-hero-effect="particles"
      data-hero-particles-kind="grid"
      data-hero-particles-motion={prefersReducedMotion ? "static" : "animated"}
      style={{
        ...baseStyle,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 1px, transparent 1.5px)",
        backgroundSize: "32px 32px",
        animation: prefersReducedMotion ? undefined : "hero-particles-grid 40s linear infinite",
      }}
    />
  );
}
