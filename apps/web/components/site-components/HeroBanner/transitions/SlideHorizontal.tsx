"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { SlideTransitionProps } from "./types";

export type SlideHorizontalProps = SlideTransitionProps & {
  direction: "left" | "right";
};

// `slide-left`: outgoing slide pushes off to the LEFT, incoming arrives
//   from the RIGHT.
// `slide-right`: opposite.
export function SlideHorizontal({
  slides,
  activeIndex,
  prefersReducedMotion,
  direction,
}: SlideHorizontalProps) {
  const offset = direction === "left" ? "100%" : "-100%";
  const exitOffset = direction === "left" ? "-100%" : "100%";

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
    // Reduced motion: snap, no animation. Render only the active slide.
    return <span data-hero-transition="slide-snap">{active.render(baseStyle)}</span>;
  }

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={active.key}
        initial={{ x: offset }}
        animate={{ x: 0 }}
        exit={{ x: exitOffset }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        data-hero-transition={`slide-${direction}`}
      >
        {active.render(baseStyle)}
      </motion.div>
    </AnimatePresence>
  );
}
