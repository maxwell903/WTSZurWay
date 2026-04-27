"use client";

import { CanvasSettings } from "./CanvasSettings";
import { FontSelector } from "./FontSelector";
import { PaletteSelector } from "./PaletteSelector";

export function SiteTab() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <PaletteSelector />
      <FontSelector />
      <CanvasSettings />
    </div>
  );
}
