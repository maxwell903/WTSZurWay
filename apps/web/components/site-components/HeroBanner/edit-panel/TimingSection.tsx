"use client";

import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { type SectionProps, readBool, readNumber } from "./utils";

// All slideshow timing controls extracted from the v1 EditPanel's
// "Slideshow" bordered group. The slideshow images themselves are owned by
// SlidesSection so drag-reorder (Sprint 8) and timing live independently.
export function TimingSection({ node, writePartial }: SectionProps) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Timing</p>
      <SwitchInput
        id="hero-autoplay"
        label="Autoplay"
        value={readBool(node.props, "autoplay", true)}
        testId="hero-autoplay"
        tooltip="Automatically advances to the next slide on a timer."
        onChange={(next) => writePartial({ autoplay: next })}
      />
      <NumberInput
        id="hero-interval-ms"
        label="Interval (ms)"
        value={readNumber(node.props, "intervalMs", 5000)}
        min={500}
        step={500}
        placeholder="5000"
        testId="hero-interval-ms"
        tooltip="Sets how long each slide stays on screen before advancing, in milliseconds."
        onChange={(next) => writePartial({ intervalMs: next ?? 5000 })}
      />
      <SwitchInput
        id="hero-loop"
        label="Loop"
        value={readBool(node.props, "loop", true)}
        testId="hero-loop"
        tooltip="Wraps from the last slide back to the first when autoplaying."
        onChange={(next) => writePartial({ loop: next })}
      />
      <SwitchInput
        id="hero-pause-on-hover"
        label="Pause on hover"
        value={readBool(node.props, "pauseOnHover", true)}
        testId="hero-pause-on-hover"
        tooltip="Stops the autoplay timer while the visitor's mouse is over the hero."
        onChange={(next) => writePartial({ pauseOnHover: next })}
      />
      <SwitchInput
        id="hero-show-dots"
        label="Show dots"
        value={readBool(node.props, "showDots", true)}
        testId="hero-show-dots"
        tooltip="Displays clickable position indicators along the bottom of the hero."
        onChange={(next) => writePartial({ showDots: next })}
      />
      <SwitchInput
        id="hero-show-arrows"
        label="Show arrows"
        value={readBool(node.props, "showArrows", false)}
        testId="hero-show-arrows"
        tooltip="Displays previous/next navigation arrows on the sides of the hero."
        onChange={(next) => writePartial({ showArrows: next })}
      />
    </div>
  );
}
