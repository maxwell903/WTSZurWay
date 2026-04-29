"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export type ParallaxProps = {
  enabled: boolean;
  prefersReducedMotion: boolean;
  children: ReactNode;
};

// Translates the wrapped media vertically at a slower rate than the page
// scroll. Uses a passive scroll listener throttled with requestAnimationFrame
// so the scroll thread stays responsive. Listener torn down on unmount.
// Disabled under prefers-reduced-motion (returns children unwrapped).
export function Parallax({ enabled, prefersReducedMotion, children }: ParallaxProps) {
  const [offsetY, setOffsetY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;
    if (typeof window === "undefined") return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        // Slide media drifts upward at half the page-scroll rate.
        setOffsetY(window.scrollY * 0.3);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, prefersReducedMotion]);

  if (!enabled || prefersReducedMotion) return <>{children}</>;

  return (
    <div
      data-hero-effect="parallax"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        transform: `translateY(${offsetY}px)`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
