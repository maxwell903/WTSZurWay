"use client";

import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import {
  type SlideshowImage,
  SlideshowImagesEditor,
} from "@/components/editor/edit-panels/controls/SlideshowImagesEditor";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

function readNumber(
  props: Record<string, unknown>,
  key: string,
  fallback: number,
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

export type GalleryEditPanelProps = { node: ComponentNode };

export function GalleryEditPanel({ node }: GalleryEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Gallery" className="space-y-3">
      <SlideshowImagesEditor
        id="gallery-images"
        label="Images"
        value={readImages(node.props)}
        testId="gallery-images"
        onChange={(next) => writePartial({ images: next })}
      />
      <NumberInput
        id="gallery-columns"
        label="Columns"
        value={readNumber(node.props, "columns", 3)}
        min={1}
        step={1}
        placeholder="3"
        testId="gallery-columns"
        onChange={(next) => writePartial({ columns: next ?? 3 })}
      />
      <NumberInput
        id="gallery-gap"
        label="Gap (px)"
        value={readNumber(node.props, "gap", 8)}
        min={0}
        step={2}
        placeholder="8"
        testId="gallery-gap"
        onChange={(next) => writePartial({ gap: next ?? 8 })}
      />
    </div>
  );
}
