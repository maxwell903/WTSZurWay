"use client";

import { useEffect, useRef, useState } from "react";

export type UseSlideshowArgs = {
  count: number;
  autoplay: boolean;
  intervalMs: number;
  loop: boolean;
  paused: boolean;
  prefersReducedMotion: boolean;
  // Sprint 7 extension: when set, the active slide must dwell at least
  // `Math.max(intervalMs, getDwellMsOverride())` before the next advance.
  // VideoSlide reports `video.duration*1000` here so a long video doesn't
  // get cut off mid-play. Returning null means "no override" and intervalMs
  // is used as the dwell.
  getDwellMsOverride?: () => number | null;
};

export type UseSlideshowResult = {
  index: number;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
};

export function useSlideshow({
  count,
  autoplay,
  intervalMs,
  loop,
  paused,
  prefersReducedMotion,
  getDwellMsOverride,
}: UseSlideshowArgs): UseSlideshowResult {
  const [index, setIndex] = useState(0);
  const slideStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (count <= 1 || !autoplay || paused || prefersReducedMotion) return;

    slideStartedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - slideStartedAtRef.current;
      const override = getDwellMsOverride?.();
      const requiredDwell =
        override === null || override === undefined ? intervalMs : Math.max(intervalMs, override);
      if (elapsed < requiredDwell) return;
      setIndex((i) => (loop ? (i + 1) % count : Math.min(i + 1, count - 1)));
      slideStartedAtRef.current = Date.now();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [count, autoplay, intervalMs, loop, paused, prefersReducedMotion, getDwellMsOverride]);

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(i, Math.max(0, count - 1))));
    slideStartedAtRef.current = Date.now();
  };
  const next = () => {
    setIndex((i) => (loop ? (i + 1) % count : Math.min(i + 1, count - 1)));
    slideStartedAtRef.current = Date.now();
  };
  const prev = () => {
    setIndex((i) => (loop ? (i - 1 + count) % count : Math.max(i - 1, 0)));
    slideStartedAtRef.current = Date.now();
  };

  return { index, goTo, next, prev };
}
