"use client";

import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/editor/edit-panels/controls/SegmentedControl";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import type { HeroBannerData } from "../../schema";
import { type SectionProps, readBool, readString } from "../utils";

const PARTICLES_OPTIONS: SegmentedOption<HeroBannerData["particles"]>[] = [
  { label: "None", value: "none" },
  { label: "Stars", value: "stars" },
  { label: "Dots", value: "dots" },
  { label: "Grid", value: "grid" },
];

const PARTICLES_TOOLTIPS: Record<HeroBannerData["particles"], string> = {
  none: "Removes the particle background.",
  stars: "Adds a slow drifting starfield behind the hero content.",
  dots: "Adds a gently floating colored dot pattern.",
  grid: "Adds a subtle drifting dot grid.",
};

function isParticlesValue(v: unknown): v is HeroBannerData["particles"] {
  return v === "none" || v === "stars" || v === "dots" || v === "grid";
}

export function BackgroundEffectsSubsection({ node, writePartial }: SectionProps) {
  const rawParticles = readString(node.props, "particles", "none");
  const particles: HeroBannerData["particles"] = isParticlesValue(rawParticles)
    ? rawParticles
    : "none";

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Background</p>
      <SwitchInput
        id="hero-cursor-spotlight"
        label="Cursor spotlight"
        value={readBool(node.props, "cursorSpotlight", false)}
        testId="hero-cursor-spotlight"
        tooltip="Adds a soft glow that follows the visitor's mouse across the hero."
        onChange={(next) => writePartial({ cursorSpotlight: next })}
      />
      <SegmentedControl
        id="hero-particles"
        label="Particles"
        value={particles}
        options={PARTICLES_OPTIONS}
        testId="hero-particles"
        tooltip={PARTICLES_TOOLTIPS[particles]}
        onChange={(next) => writePartial({ particles: next })}
      />
    </div>
  );
}
