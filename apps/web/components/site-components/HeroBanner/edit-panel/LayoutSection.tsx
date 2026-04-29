"use client";

import { ColorInput } from "@/components/editor/edit-panels/controls/ColorInput";
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

const PANEL_BG_MODE_OPTIONS: SegmentedOption<"color" | "transparent">[] = [
  { label: "Color", value: "color" },
  { label: "Transparent", value: "transparent" },
];

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
        </div>
      ) : null}
    </div>
  );
}
