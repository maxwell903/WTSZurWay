"use client";

import { SlideshowImagesEditor } from "@/components/editor/edit-panels/controls/SlideshowImagesEditor";
import { type SectionProps, readImages } from "./utils";

export function SlidesSection({ node, writePartial }: SectionProps) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Slideshow</p>
      <SlideshowImagesEditor
        id="hero-slides"
        label="Slides"
        value={readImages(node.props)}
        testId="hero-slides"
        onChange={(next) => writePartial({ images: next })}
      />
    </div>
  );
}
