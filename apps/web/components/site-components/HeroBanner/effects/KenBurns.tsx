"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type KenBurnsProps = {
  enabled: boolean;
  intervalMs: number;
  prefersReducedMotion: boolean;
  children: ReactNode;
};

// Slowly zooms image slides 100% → 110% over the slideshow's intervalMs.
// Disabled under prefers-reduced-motion. Disabled when `enabled === false`
// (returns children unwrapped to keep the v1 DOM shape).
export function KenBurns({ enabled, intervalMs, prefersReducedMotion, children }: KenBurnsProps) {
  if (!enabled || prefersReducedMotion) return <>{children}</>;
  // Duration is in seconds for Framer Motion; intervalMs is the dwell time
  // per slide so the zoom completes exactly once per dwell.
  const durationSec = Math.max(0.1, intervalMs / 1000);
  return (
    <motion.div
      data-hero-effect="ken-burns"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={{ scale: 1 }}
      animate={{ scale: 1.1 }}
      transition={{ duration: durationSec, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}
