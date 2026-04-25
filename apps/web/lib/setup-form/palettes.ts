import { PALETTE_IDS, type PaletteId } from "./types";

export type Palette = {
  id: PaletteId;
  label: string;
  swatches: readonly [string, string, string, string];
};

export const PALETTES: Record<PaletteId, Palette> = {
  ocean: {
    id: "ocean",
    label: "Ocean",
    swatches: ["#0c4a6e", "#0284c7", "#7dd3fc", "#f0f9ff"],
  },
  forest: {
    id: "forest",
    label: "Forest",
    swatches: ["#14532d", "#16a34a", "#86efac", "#f0fdf4"],
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    swatches: ["#7c2d12", "#ea580c", "#fdba74", "#fff7ed"],
  },
  violet: {
    id: "violet",
    label: "Violet",
    swatches: ["#581c87", "#9333ea", "#d8b4fe", "#faf5ff"],
  },
  monochrome: {
    id: "monochrome",
    label: "Monochrome",
    swatches: ["#0f172a", "#475569", "#cbd5e1", "#f8fafc"],
  },
  rose: {
    id: "rose",
    label: "Rose",
    swatches: ["#881337", "#e11d48", "#fda4af", "#fff1f2"],
  },
};

export const PALETTE_LIST: readonly Palette[] = PALETTE_IDS.map((id) => PALETTES[id]);
