"use client";

import { useEditorStore } from "@/lib/editor-state";
import { AiStockImagesSection } from "./AiStockImagesSection";
import { CanvasSettings } from "./CanvasSettings";
import { FontSelector } from "./FontSelector";
import { PaletteSelector } from "./PaletteSelector";

export function SiteTab() {
  const siteId = useEditorStore((s) => s.siteId);
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <PaletteSelector />
      <AiStockImagesSection siteId={siteId} />
      <FontSelector />
      <CanvasSettings />
    </div>
  );
}
