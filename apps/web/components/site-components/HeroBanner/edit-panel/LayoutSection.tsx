"use client";

import { ColorInput } from "@/components/editor/edit-panels/controls/ColorInput";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/editor/edit-panels/controls/SegmentedControl";
import type { HeroBannerData } from "../schema";
import { type SectionProps, readNumber, readString } from "./utils";

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

const PANEL_BG_MODE_OPTIONS: SegmentedOption<"color" | "transparent">[] = [
  { label: "Color", value: "color" },
  { label: "Transparent", value: "transparent" },
];

const MEDIA_FIT_OPTIONS: SegmentedOption<"cover" | "contain">[] = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
];

function isMediaFitValue(v: unknown): v is "cover" | "contain" {
  return v === "cover" || v === "contain";
}

function clampSplitRatio(n: number): number {
  if (!Number.isFinite(n)) return 50;
  if (n < 10) return 10;
  if (n > 90) return 90;
  return n;
}

function isLayoutValue(v: unknown): v is HeroBannerData["layout"] {
  return v === "centered" || v === "split-left" || v === "split-right" || v === "full-bleed";
}

export function LayoutSection({ node, writePartial }: SectionProps) {
  const raw = readString(node.props, "layout", "centered");
  const value: HeroBannerData["layout"] = isLayoutValue(raw) ? raw : "centered";

  const isSplit = value === "split-left" || value === "split-right";
  const panelBgRaw = readString(node.props, "splitTextPanelBackground", "#ffffff");
  const panelMode: "color" | "transparent" = panelBgRaw === "transparent" ? "transparent" : "color";
  const panelColor = panelMode === "color" ? panelBgRaw : "#ffffff";

  const splitRatio = readNumber(node.props, "splitRatio", 50) ?? 50;
  const splitRatioClamped = clampSplitRatio(splitRatio);
  const splitMediaFitRaw = node.props.splitMediaFit;
  const splitMediaFit: "cover" | "contain" = isMediaFitValue(splitMediaFitRaw)
    ? splitMediaFitRaw
    : "cover";

  return (
    <div className="space-y-3">
      <SegmentedControl
        id="hero-layout"
        label="Layout"
        value={value}
        options={LAYOUT_OPTIONS}
        testId="hero-layout"
        tooltip={LAYOUT_OPTION_TOOLTIPS[value]}
        onChange={(next) => writePartial({ layout: next })}
      />
      {isSplit ? (
        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
          <SegmentedControl
            id="hero-text-panel-bg-mode"
            label="Text panel background"
            value={panelMode}
            options={PANEL_BG_MODE_OPTIONS}
            testId="hero-text-panel-bg-mode"
            tooltip="Background color of the text half. Transparent lets effects like cursor spotlight show through."
            onChange={(next) =>
              writePartial({
                splitTextPanelBackground: next === "transparent" ? "transparent" : panelColor,
              })
            }
          />
          {panelMode === "color" ? (
            <ColorInput
              id="hero-text-panel-bg-color"
              value={panelColor}
              testId="hero-text-panel-bg-color"
              onChange={(next) => writePartial({ splitTextPanelBackground: next })}
            />
          ) : null}
          {/* TODO(max): canvas drag handle for the split divider — slider works but a hit-test on the boundary would be nicer */}
          <NumberInput
            id="hero-split-ratio"
            label="Text panel width (%)"
            value={splitRatioClamped}
            min={10}
            step={1}
            placeholder="50"
            testId="hero-split-ratio"
            tooltip="Percentage of the hero's width given to the text panel (10–90). The media panel takes the rest."
            onChange={(v) => {
              if (v === undefined) {
                writePartial({ splitRatio: 50 });
                return;
              }
              writePartial({ splitRatio: clampSplitRatio(v) });
            }}
          />
          <SegmentedControl
            id="hero-split-media-fit"
            label="Image fit"
            value={splitMediaFit}
            options={MEDIA_FIT_OPTIONS}
            testId="hero-split-media-fit"
            tooltip="Cover crops the image to fill the panel; Contain preserves the aspect ratio and lets the hero's background show through any slack."
            onChange={(next) => writePartial({ splitMediaFit: next })}
          />
        </div>
      ) : null}
    </div>
  );
}
