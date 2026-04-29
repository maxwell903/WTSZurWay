import type { SlideshowImage } from "@/components/editor/edit-panels/controls/SlideshowImagesEditor";
import type { ComponentNode } from "@/lib/site-config";

// Each section receives the same {node, writePartial} pair the v1 EditPanel
// composed inline. Keep these types here so adding a new section is a
// one-line import.
export type SectionProps = {
  node: ComponentNode;
  writePartial: (patch: Record<string, unknown>) => void;
};

export function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

export function readBool(props: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof props[key] === "boolean" ? (props[key] as boolean) : fallback;
}

export function readNumber(
  props: Record<string, unknown>,
  key: string,
  fallback: number | undefined,
): number | undefined {
  return typeof props[key] === "number" ? (props[key] as number) : fallback;
}

// Preserve every field on each slide so the editor's per-slide override
// inputs (heading, subheading, ctaLabel, secondaryCtaLabel + their rich
// twins, kind, videoSrc, align, etc.) round-trip through the panel.
// Filtering down to {src, alt} here would silently strip user edits on
// every re-render — the visible symptom is "I can't type in any slide
// override field."
export function readImages(props: Record<string, unknown>): SlideshowImage[] {
  if (!Array.isArray(props.images)) return [];
  return props.images
    .map((entry): SlideshowImage | null => {
      if (!entry || typeof entry !== "object") return null;
      return entry as SlideshowImage;
    })
    .filter((entry): entry is SlideshowImage => entry !== null);
}
