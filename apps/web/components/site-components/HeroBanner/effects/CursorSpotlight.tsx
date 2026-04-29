"use client";

import { type CSSProperties, useEffect, useRef } from "react";

export type CursorSpotlightProps = {
  enabled: boolean;
  prefersReducedMotion: boolean;
};

// Soft radial spotlight that follows the cursor across the hero. Disabled
// on touch devices (no hover) and under prefers-reduced-motion (renders a
// static spotlight at center). Uses CSS custom properties so the heavy
// render path is just a positioned overlay reading vars.
export function CursorSpotlight({ enabled, prefersReducedMotion }: CursorSpotlightProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isTouchDevice =
    typeof window !== "undefined" &&
    typeof matchMedia === "function" &&
    matchMedia("(hover: none)").matches;
  const useStatic = !enabled || prefersReducedMotion || isTouchDevice;

  useEffect(() => {
    if (useStatic) return;
    const el = overlayRef.current;
    if (!el) return;
    // Attach to the parent (the hero section) so we get pointer coords
    // relative to the hero, not the overlay (which is full-bleed).
    const parent = el.parentElement;
    if (!parent) return;

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--spotlight-x", `${x}px`);
      el.style.setProperty("--spotlight-y", `${y}px`);
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, [useStatic]);

  if (!enabled) return null;

  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 2,
    background: useStatic
      ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 50%)"
      : "radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255,255,255,0.22), transparent 45%)",
  };

  return (
    <div
      ref={overlayRef}
      data-hero-effect="cursor-spotlight"
      data-hero-spotlight-mode={useStatic ? "static" : "follow"}
      style={baseStyle}
    />
  );
}
