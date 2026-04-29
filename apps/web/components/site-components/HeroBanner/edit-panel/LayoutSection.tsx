"use client";

import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/editor/edit-panels/controls/SegmentedControl";
import type { HeroBannerData } from "../schema";
import { type SectionProps, readString } from "./utils";

const LAYOUT_OPTIONS: SegmentedOption<HeroBannerData["layout"]>[] = [
  { label: "Centered", value: "centered" },
  { label: "Split L", value: "split-left" },
  { label: "Split R", value: "split-right" },
  { label: "Full bleed", value: "full-bleed" },
];

const LAYOUT_OPTION_TOOLTIPS: Record<HeroBannerData["layout"], string> = {
  centered: "Centers the heading and CTA over a full-width background or slideshow.",
  "split-left": "Puts the heading and CTA on the left half and the media on the right.",
  "split-right": "Puts the heading and CTA on the right half and the media on the left.",
  "full-bleed": "Stretches the media edge-to-edge with the text floating in a corner panel.",
};

function isLayoutValue(v: unknown): v is HeroBannerData["layout"] {
  return v === "centered" || v === "split-left" || v === "split-right" || v === "full-bleed";
}

export function LayoutSection({ node, writePartial }: SectionProps) {
  const raw = readString(node.props, "layout", "centered");
  const value: HeroBannerData["layout"] = isLayoutValue(raw) ? raw : "centered";

  return (
    <SegmentedControl
      id="hero-layout"
      label="Layout"
      value={value}
      options={LAYOUT_OPTIONS}
      testId="hero-layout"
      tooltip={LAYOUT_OPTION_TOOLTIPS[value]}
      onChange={(next) => writePartial({ layout: next })}
    />
  );
}
