"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type RotatingHeadingProps = {
  heading: string;
  rotatingWords?: string[];
  prefersReducedMotion: boolean;
};

const ROTATOR_TOKEN = "{rotator}";
const CYCLE_MS = 2500;

// Replaces the literal `{rotator}` token in `heading` with a word from
// `rotatingWords`, cycling every 2.5 seconds with a soft fade.
//
// Reduced motion: picks `rotatingWords[0]` (or leaves the literal {rotator}
// if the list is empty/undefined) and stops cycling.
//
// When `rotatingWords` is empty/undefined, `{rotator}` (if present) renders
// verbatim — matching the spec's "literal text" fallback.
export function RotatingHeading({
  heading,
  rotatingWords,
  prefersReducedMotion,
}: RotatingHeadingProps) {
  const hasToken = heading.includes(ROTATOR_TOKEN);
  const words = rotatingWords ?? [];
  const cycle = hasToken && words.length > 0 && !prefersReducedMotion;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!cycle) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [cycle, words.length]);

  // No token → render the heading verbatim.
  if (!hasToken) return <>{heading}</>;

  // Token present but no words → leave the literal {rotator} in place.
  if (words.length === 0) return <>{heading}</>;

  const [before, after] = heading.split(ROTATOR_TOKEN, 2);
  const wordsList = words;
  const safeIndex = Math.min(index, wordsList.length - 1);
  const currentWord = wordsList[safeIndex] ?? wordsList[0] ?? "";

  if (prefersReducedMotion) {
    return (
      <>
        {before}
        <span data-hero-rotator="static">{currentWord}</span>
        {after}
      </>
    );
  }

  return (
    <>
      {before}
      <motion.span
        key={safeIndex}
        data-hero-rotator="animated"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: "inline-block" }}
      >
        {currentWord}
      </motion.span>
      {after}
    </>
  );
}
