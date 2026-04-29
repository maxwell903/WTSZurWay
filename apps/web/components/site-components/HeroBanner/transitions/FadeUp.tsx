"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { SlideTransitionProps } from "./types";

// `fade-up`: incoming slide fades in while moving UP 20px.
export function FadeUp({ slides, activeIndex, prefersReducedMotion }: SlideTransitionProps) {
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
    return <span data-hero-transition="fade-up-snap">{active.render(baseStyle)}</span>;
  }

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={active.key}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        data-hero-transition="fade-up"
      >
        {active.render(baseStyle)}
      </motion.div>
    </AnimatePresence>
  );
}
