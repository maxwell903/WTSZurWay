"use client";

import { type RefObject, useEffect } from "react";

export type UseSwipeArgs = {
  ref: RefObject<HTMLElement | null>;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  thresholdPx?: number;
};

const DEFAULT_THRESHOLD_PX = 50;

// Pure pointer-event swipe detection. Triggers callbacks when horizontal
// travel exceeds `thresholdPx` (default 50) without significant vertical
// travel (vertical travel must stay below thresholdPx as well — prevents
// vertical-scroll gestures from being misclassified as swipes).
//
// No gesture library imported. Use Pointer Events for unified mouse + touch
// handling.
export function useSwipe({
  ref,
  onSwipeLeft,
  onSwipeRight,
  thresholdPx = DEFAULT_THRESHOLD_PX,
}: UseSwipeArgs): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!onSwipeLeft && !onSwipeRight) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onPointerDown = (e: PointerEvent) => {
      // Only react to primary pointer; ignore secondary buttons.
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dy) >= thresholdPx) return;
      if (dx <= -thresholdPx) onSwipeLeft?.();
      else if (dx >= thresholdPx) onSwipeRight?.();
    };

    const onPointerCancel = () => {
      tracking = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [ref, onSwipeLeft, onSwipeRight, thresholdPx]);
}
