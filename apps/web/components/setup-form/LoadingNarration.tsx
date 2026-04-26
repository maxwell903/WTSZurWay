"use client";

// LoadingNarration -- the rotating-message text used while a generation is
// in flight. PROJECT_SPEC.md §9.5 specifies the seven Initial Generation
// strings in order; the AI Edit surface (Sprint 11) will pass its own
// four-string list via the optional `messages` prop.
//
// Fades between messages with a simple CSS opacity transition. Framer
// Motion is not in package.json; rolling a tiny opacity transition avoids
// adding a dependency. Respects prefers-reduced-motion by snapping rather
// than fading.

import { useEffect, useState } from "react";

export const INITIAL_GENERATION_NARRATION = [
  "Reading your brand details…",
  "Choosing a layout…",
  "Pulling your Rent Manager properties…",
  "Generating components…",
  "Applying your color palette…",
  "Wiring up your forms…",
  "Finishing touches…",
] as const;

export type LoadingNarrationProps = {
  messages?: readonly string[];
  intervalMs?: number;
};

export function LoadingNarration({
  messages = INITIAL_GENERATION_NARRATION,
  intervalMs = 3500,
}: LoadingNarrationProps) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      if (reducedMotion) {
        setIndex((i) => (i + 1) % messages.length);
        return;
      }
      // Fade out, then advance and fade back in. Two timers feels more
      // responsive than a CSS animation hooked to React state.
      setFadeIn(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setFadeIn(true);
      }, 250);
      return () => clearTimeout(swap);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs, reducedMotion]);

  const message = messages[index] ?? "";

  return (
    <div
      data-testid="loading-narration"
      aria-live="polite"
      className="text-center text-sm text-zinc-300"
      style={{
        opacity: reducedMotion ? 1 : fadeIn ? 1 : 0,
        transition: reducedMotion ? "none" : "opacity 250ms ease-in-out",
      }}
    >
      {message}
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
