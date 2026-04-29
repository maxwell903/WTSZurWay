"use client";

import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/editor/edit-panels/controls/SegmentedControl";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import type { HeroBannerData } from "../../schema";
import { type SectionProps, readBool, readString } from "../utils";

const TRANSITION_OPTIONS: SegmentedOption<HeroBannerData["slideTransition"]>[] = [
  { label: "Cross", value: "crossfade" },
  { label: "← L", value: "slide-left" },
  { label: "R →", value: "slide-right" },
  { label: "Zoom", value: "zoom" },
  { label: "↑ Up", value: "fade-up" },
];

const TRANSITION_TOOLTIPS: Record<HeroBannerData["slideTransition"], string> = {
  crossfade: "Cross-fades between slides — current slide fades out as the next fades in.",
  "slide-left":
    "Slides the outgoing slide off to the left and the incoming slide in from the right.",
  "slide-right":
    "Slides the outgoing slide off to the right and the incoming slide in from the left.",
  zoom: "Incoming slide scales from 90% to 100% while fading in.",
  "fade-up": "Incoming slide fades in while moving up 20 pixels.",
};

function isTransitionValue(v: unknown): v is HeroBannerData["slideTransition"] {
  return (
    v === "crossfade" ||
    v === "slide-left" ||
    v === "slide-right" ||
    v === "zoom" ||
    v === "fade-up"
  );
}

export function MotionEffectsSubsection({ node, writePartial }: SectionProps) {
  const rawTrans = readString(node.props, "slideTransition", "crossfade");
  const transition: HeroBannerData["slideTransition"] = isTransitionValue(rawTrans)
    ? rawTrans
    : "crossfade";

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Motion</p>
      <SegmentedControl
        id="hero-slide-transition"
        label="Slide transition"
        value={transition}
        options={TRANSITION_OPTIONS}
        testId="hero-slide-transition"
        tooltip={TRANSITION_TOOLTIPS[transition]}
        onChange={(next) => writePartial({ slideTransition: next })}
      />
      <SwitchInput
        id="hero-ken-burns"
        label="Ken Burns zoom"
        value={readBool(node.props, "kenBurns", false)}
        testId="hero-ken-burns"
        tooltip="Slowly zooms each image while it is visible, for a cinematic feel."
        onChange={(next) => writePartial({ kenBurns: next })}
      />
      <SwitchInput
        id="hero-parallax"
        label="Parallax"
        value={readBool(node.props, "parallax", false)}
        testId="hero-parallax"
        tooltip="Drifts the hero media at a slower rate than the page scroll for a sense of depth."
        onChange={(next) => writePartial({ parallax: next })}
      />
    </div>
  );
}
