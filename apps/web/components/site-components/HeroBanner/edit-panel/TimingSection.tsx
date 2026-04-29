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
        onChange={(next) => writePartial({ intervalMs: next ?? 5000 })}
      />
      <SwitchInput
        id="hero-loop"
        label="Loop"
        value={readBool(node.props, "loop", true)}
        testId="hero-loop"
        onChange={(next) => writePartial({ loop: next })}
      />
      <SwitchInput
        id="hero-pause-on-hover"
        label="Pause on hover"
        value={readBool(node.props, "pauseOnHover", true)}
        testId="hero-pause-on-hover"
        onChange={(next) => writePartial({ pauseOnHover: next })}
      />
      <SwitchInput
        id="hero-show-dots"
        label="Show dots"
        value={readBool(node.props, "showDots", true)}
        testId="hero-show-dots"
        onChange={(next) => writePartial({ showDots: next })}
      />
      <SwitchInput
        id="hero-show-arrows"
        label="Show arrows"
        value={readBool(node.props, "showArrows", false)}
        testId="hero-show-arrows"
        onChange={(next) => writePartial({ showArrows: next })}
      />
    </div>
  );
}
