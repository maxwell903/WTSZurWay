"use client";

import { BackgroundEffectsSubsection } from "./effects/BackgroundEffectsSubsection";
import { MotionEffectsSubsection } from "./effects/MotionEffectsSubsection";
import { TextEffectsSubsection } from "./effects/TextEffectsSubsection";
import type { SectionProps } from "./utils";

// Composition root. Wave 2 contains no controls of its own — it just
// mounts the three sub-sections in order. Wave 3 sprints (S6, S9, S10)
// each own one sub-section file:
//   - MotionEffectsSubsection      → Sprint 6  (slideTransition + kenBurns + parallax)
//   - BackgroundEffectsSubsection  → Sprint 9  (cursorSpotlight + particles)
//   - TextEffectsSubsection        → Sprint 10 (rotatingWords + countdown)
//
// They never collide on this file: it imports the sub-section names and
// renders them; each Wave 3 sprint replaces only its own sub-section file.
export function EffectsSection(props: SectionProps) {
  return (
    <>
      <MotionEffectsSubsection {...props} />
      <BackgroundEffectsSubsection {...props} />
      <TextEffectsSubsection {...props} />
    </>
  );
}
