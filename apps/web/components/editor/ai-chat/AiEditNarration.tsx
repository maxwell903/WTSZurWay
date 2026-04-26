"use client";

/**
 * Rotates the four §9.5 AI Edit narration strings every 3.5 seconds while
 * the chat is loading. Strings are reproduced verbatim from PROJECT_SPEC.md
 * §9.5 including the ellipsis character `…`.
 */

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const AI_EDIT_NARRATION_STRINGS = [
  "Reading your request…",
  "Looking at the current page…",
  "Planning the changes…",
  "Writing the diff…",
] as const;

export const NARRATION_INTERVAL_MS = 3500;

export type AiEditNarrationProps = {
  className?: string;
};

export function AiEditNarration({ className }: AiEditNarrationProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // setInterval is the simplest primitive for a wall-clock cadence; the
    // cleanup guard fires when the parent unmounts (e.g., loading -> idle).
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % AI_EDIT_NARRATION_STRINGS.length);
    }, NARRATION_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <output
      aria-live="polite"
      data-testid="ai-edit-narration"
      className={cn("block text-sm text-zinc-400", className)}
    >
      {AI_EDIT_NARRATION_STRINGS[index]}
    </output>
  );
}
