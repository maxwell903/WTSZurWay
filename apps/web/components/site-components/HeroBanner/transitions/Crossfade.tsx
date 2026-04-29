"use client";

import type { CSSProperties } from "react";
import type { SlideTransitionProps } from "./types";

// Wave 2 Crossfade preserves the v1 renderer's behavior verbatim: stack all
// slides absolutely, fade between them via inline opacity on each slide's
// root element, and disable the transition when prefers-reduced-motion
// is set. The per-slide style is composed here and handed to each slide's
// `render(style)` callback.
export function Crossfade({ slides, activeIndex, prefersReducedMotion }: SlideTransitionProps) {
  const transition = prefersReducedMotion ? "none" : "opacity 600ms ease-in-out";
  return (
    <>
      {slides.map((entry, i) => {
        const style: CSSProperties = {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: i === activeIndex ? 1 : 0,
          transition,
          zIndex: 0,
        };
        return <span key={entry.key}>{entry.render(style)}</span>;
      })}
    </>
  );
}
