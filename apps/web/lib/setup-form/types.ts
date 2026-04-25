import type { z } from "zod";
import type { setupFormSchema } from "./schema";

export const PALETTE_IDS = ["ocean", "forest", "sunset", "violet", "monochrome", "rose"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const TEMPLATE_STARTS = [
  "ai_generate",
  "blank",
  "template_residential",
  "template_commercial",
  "template_mh",
] as const;
export type TemplateStart = (typeof TEMPLATE_STARTS)[number];

export const PROPERTY_TYPES_FEATURED = [
  "residential",
  "commercial",
  "manufactured_housing",
] as const;
export type PropertyTypeFeatured = (typeof PROPERTY_TYPES_FEATURED)[number];

export const PAGE_INCLUSIONS = [
  "home",
  "properties",
  "units",
  "about",
  "contact",
  "apply_now",
  "testimonials",
] as const;
export type PageInclusion = (typeof PAGE_INCLUSIONS)[number];

export const TONES = ["professional", "warm", "modern", "bold", "minimal"] as const;
export type Tone = (typeof TONES)[number];

export const PRIMARY_CTAS = [
  "schedule_a_tour",
  "apply_now",
  "contact_us",
  "browse_listings",
] as const;
export type PrimaryCta = (typeof PRIMARY_CTAS)[number];

export type SetupFormValues = z.infer<typeof setupFormSchema>;
