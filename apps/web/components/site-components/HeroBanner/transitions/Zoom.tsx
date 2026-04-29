"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { SlideTransitionProps } from "./types";

// `zoom`: incoming slide scales from 90% → 100% while fading in.
export function Zoom({ slides, activeIndex, prefersReducedMotion }: SlideTransitionProps) {
  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
  };
  const active = slides[activeIndex];
  if (!active) return null;

  if (prefersReducedMotion) {
    return <span data-hero-transition="zoom-snap">{active.render(baseStyle)}</span>;
  }

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={active.key}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        data-hero-transition="zoom"
      >
        {active.render(baseStyle)}
      </motion.div>
    </AnimatePresence>
  );
}
