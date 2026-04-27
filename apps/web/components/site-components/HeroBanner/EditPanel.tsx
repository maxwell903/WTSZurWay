"use client";

import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import {
  type SlideshowImage,
  SlideshowImagesEditor,
} from "@/components/editor/edit-panels/controls/SlideshowImagesEditor";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readBool(props: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof props[key] === "boolean" ? (props[key] as boolean) : fallback;
}

function readNumber(
  props: Record<string, unknown>,
  key: string,
  fallback: number | undefined,
): number | undefined {
  return typeof props[key] === "number" ? (props[key] as number) : fallback;
}

function readImages(props: Record<string, unknown>): SlideshowImage[] {
  if (!Array.isArray(props.images)) return [];
  return props.images
    .map((entry): SlideshowImage | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const src = typeof e.src === "string" ? e.src : "";
      const alt = typeof e.alt === "string" ? e.alt : undefined;
      return { src, alt };
    })
    .filter((entry): entry is SlideshowImage => entry !== null);
}

export type HeroBannerEditPanelProps = { node: ComponentNode };

export function HeroBannerEditPanel({ node }: HeroBannerEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="HeroBanner" className="space-y-3">
      <TextInput
        id="hero-heading"
        label="Heading"
        value={readString(node.props, "heading")}
        testId="hero-heading"
        onChange={(next) => writePartial({ heading: next })}
      />
      <TextInput
        id="hero-subheading"
        label="Sub-heading"
        value={readString(node.props, "subheading")}
        testId="hero-subheading"
        onChange={(next) => writePartial({ subheading: next })}
      />
      <TextInput
        id="hero-cta-label"
        label="CTA label"
        value={readString(node.props, "ctaLabel")}
        placeholder="Learn more"
        testId="hero-cta-label"
        onChange={(next) => writePartial({ ctaLabel: next })}
      />
      <TextInput
        id="hero-cta-href"
        label="CTA href"
        value={readString(node.props, "ctaHref", "#")}
        placeholder="#"
        testId="hero-cta-href"
        onChange={(next) => writePartial({ ctaHref: next })}
      />
      <TextInput
        id="hero-bg-image"
        label="Background image URL"
        value={readString(node.props, "backgroundImage")}
        placeholder="https://... (used when no slides are added)"
        testId="hero-bg-image"
        onChange={(next) => writePartial({ backgroundImage: next === "" ? undefined : next })}
      />
      <SwitchInput
        id="hero-overlay"
        label="Overlay"
        value={readBool(node.props, "overlay", true)}
        testId="hero-overlay"
        onChange={(next) => writePartial({ overlay: next })}
      />
      <TextInput
        id="hero-height"
        label="Height"
        value={readString(node.props, "height", "480px")}
        placeholder="480px"
        testId="hero-height"
        onChange={(next) => writePartial({ height: next })}
      />
      <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Slideshow</p>
        <SlideshowImagesEditor
          id="hero-slides"
          label="Slides"
          value={readImages(node.props)}
          testId="hero-slides"
          onChange={(next) => writePartial({ images: next })}
        />
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
    </div>
  );
}
