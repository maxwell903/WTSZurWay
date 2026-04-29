import type { CSSProperties, ReactNode } from "react";

export type SlideTransitionKind = "crossfade" | "slide-left" | "slide-right" | "zoom" | "fade-up";

// Each slide is rendered by a callback the layout supplies. Transitions
// invoke `render(style)` with whatever per-slide style they want applied
// (opacity for crossfade, transform for slide/zoom, etc.). Slides are
// expected to merge that style onto their root element so the
// `data-hero-slide` attribute and the per-slide style live on the same DOM
// node — keeps the v1 test contract intact.
export type SlideRenderEntry = {
  key: string;
  render: (style: CSSProperties) => ReactNode;
};

export type SlideTransitionProps = {
  slides: SlideRenderEntry[];
  activeIndex: number;
  intervalMs: number;
  prefersReducedMotion: boolean;
};
