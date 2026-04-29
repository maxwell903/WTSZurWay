"use client";

import { type CSSProperties, type RefObject, useCallback, useRef, useState } from "react";
import { KenBurns } from "../effects/KenBurns";
import { Parallax } from "../effects/Parallax";
import { useSlideshow } from "../hooks/useSlideshow";
import { useSwipe } from "../hooks/useSwipe";
import type { HeroBannerData } from "../schema";
import { ImageSlide } from "../slides/ImageSlide";
import { VideoSlide } from "../slides/VideoSlide";
import { Crossfade } from "../transitions/Crossfade";
import { FadeUp } from "../transitions/FadeUp";
import { SlideHorizontal } from "../transitions/SlideHorizontal";
import { Zoom } from "../transitions/Zoom";
import type { SlideRenderEntry, SlideTransitionKind } from "../transitions/types";

// Hook that returns everything a layout needs to render a slideshow:
// state, mouse handlers (for pause-on-hover), the pre-built SlideRenderEntry
// list, and controls. Each layout composes the rest of its DOM around this.
//
// If `swipeTargetRef` is provided, attaches Sprint 8's pointer-event swipe
// detection: swipe-left → next, swipe-right → prev. The ref is for the
// container element you want swipes detected on (usually the layout's
// section root or the slideshow's media pane).
export function useHeroSlideshow(
  data: HeroBannerData,
  prefersReducedMotion: boolean,
  swipeTargetRef?: RefObject<HTMLElement | null>,
) {
  const [paused, setPaused] = useState(false);

  // Sprint 7: per-slide video durations reported by VideoSlide on
  // `loadedmetadata`. Used to extend the slideshow's dwell to
  // max(intervalMs, durationMs) when the active slide is a long video.
  const videoDurationsRef = useRef<Record<number, number>>({});
  const activeIndexRef = useRef(0);

  const getDwellMsOverride = useCallback((): number | null => {
    const i = activeIndexRef.current;
    const known = videoDurationsRef.current[i];
    return known ?? null;
  }, []);

  const { index, goTo, next, prev } = useSlideshow({
    count: data.images.length,
    autoplay: data.autoplay,
    intervalMs: data.intervalMs,
    loop: data.loop,
    paused: data.pauseOnHover ? paused : false,
    prefersReducedMotion,
    getDwellMsOverride,
  });

  // Keep activeIndexRef in sync so the dwell override sees the right slide.
  activeIndexRef.current = index;

  const handleVideoDuration = useCallback((slideIndex: number, durationMs: number) => {
    videoDurationsRef.current[slideIndex] = durationMs;
  }, []);

  const renderEntries: SlideRenderEntry[] = data.images.map((slide, i) => ({
    key: String(i),
    render: (style: CSSProperties) =>
      slide.kind === "image" ? (
        <KenBurns
          enabled={data.kenBurns}
          intervalMs={data.intervalMs}
          prefersReducedMotion={prefersReducedMotion}
        >
          <Parallax enabled={data.parallax} prefersReducedMotion={prefersReducedMotion}>
            <ImageSlide slide={slide} index={i} isFirst={i === 0} style={style} />
          </Parallax>
        </KenBurns>
      ) : (
        <VideoSlide
          slide={slide}
          index={i}
          prefersReducedMotion={prefersReducedMotion}
          onDurationKnown={(ms) => handleVideoDuration(i, ms)}
          style={style}
        />
      ),
  }));

  const mouseHandlers = data.pauseOnHover
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
      }
    : {};

  // Sprint 8: pointer-event swipe (50px horizontal, vertical < 50px)
  // attaches to the layout's chosen target ref. Swipe-left → next slide,
  // swipe-right → prev slide. The hook is a no-op when no target ref is
  // supplied or when no slides exist.
  useSwipe({
    ref: swipeTargetRef ?? { current: null },
    onSwipeLeft: data.images.length > 1 ? next : undefined,
    onSwipeRight: data.images.length > 1 ? prev : undefined,
  });

  return { index, goTo, next, prev, renderEntries, mouseHandlers };
}

// Renders the slide stack (no wrapping element — slides are absolutely
// positioned). Layouts mount this inside whatever container they want.
// Dispatches on `slideTransition` to pick the right transition variant.
// Crossfade keeps the v1 stacked-opacity behavior (so backwards-compat
// tests pass); the other 3 use Framer Motion AnimatePresence and only
// render the active slide.
export function SlideshowSlides({
  renderEntries,
  activeIndex,
  intervalMs,
  prefersReducedMotion,
  slideTransition = "crossfade",
}: {
  renderEntries: SlideRenderEntry[];
  activeIndex: number;
  intervalMs: number;
  prefersReducedMotion: boolean;
  slideTransition?: SlideTransitionKind;
}) {
  const props = {
    slides: renderEntries,
    activeIndex,
    intervalMs,
    prefersReducedMotion,
  };
  if (slideTransition === "slide-left") return <SlideHorizontal {...props} direction="left" />;
  if (slideTransition === "slide-right") return <SlideHorizontal {...props} direction="right" />;
  if (slideTransition === "zoom") return <Zoom {...props} />;
  if (slideTransition === "fade-up") return <FadeUp {...props} />;
  return <Crossfade {...props} />;
}

// Renders dots + arrows. Layouts mount this inside their hero section.
export function SlideshowControls({
  index,
  count,
  loop,
  showDots,
  showArrows,
  goTo,
  next,
  prev,
}: {
  index: number;
  count: number;
  loop: boolean;
  showDots: boolean;
  showArrows: boolean;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
}) {
  if (count <= 1) return null;

  const atFirst = index === 0;
  const atLast = index === count - 1;
  const arrowDisabledPrev = !loop && atFirst;
  const arrowDisabledNext = !loop && atLast;

  return (
    <>
      {showArrows ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            data-hero-arrow="prev"
            disabled={arrowDisabledPrev}
            aria-disabled={arrowDisabledPrev || undefined}
            onClick={prev}
            style={ARROW_STYLE_LEFT(arrowDisabledPrev)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            data-hero-arrow="next"
            disabled={arrowDisabledNext}
            aria-disabled={arrowDisabledNext || undefined}
            onClick={next}
            style={ARROW_STYLE_RIGHT(arrowDisabledNext)}
          >
            ›
          </button>
        </>
      ) : null}
      {showDots ? (
        <div style={DOTS_CONTAINER_STYLE}>
          {Array.from({ length: count }).map((_, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: slideshow order is the identifier
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              data-hero-dot={i}
              onClick={() => goTo(i)}
              style={dotStyle(i === index)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

const ARROW_STYLE_LEFT = (disabled: boolean): CSSProperties => ({
  position: "absolute",
  left: 16,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 3,
  width: 36,
  height: 36,
  borderRadius: "999px",
  border: "none",
  background: "rgba(0, 0, 0, 0.45)",
  color: "#ffffff",
  fontSize: 20,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

const ARROW_STYLE_RIGHT = (disabled: boolean): CSSProperties => ({
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 3,
  width: 36,
  height: 36,
  borderRadius: "999px",
  border: "none",
  background: "rgba(0, 0, 0, 0.45)",
  color: "#ffffff",
  fontSize: 20,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

const DOTS_CONTAINER_STYLE: CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: 0,
  right: 0,
  zIndex: 3,
  display: "flex",
  justifyContent: "center",
  gap: 8,
};

const dotStyle = (active: boolean): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: "999px",
  border: "none",
  padding: 0,
  background: active ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
  cursor: "pointer",
});
