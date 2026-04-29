import type { HeroBannerData } from "./schema";

export type HeroPreset = {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  // A complete HeroBanner props object. Sprint 11 fills in five presets:
  // Cinematic Video, Split Hero, Centered Carousel, Minimalist, Logo Marquee.
  // Each must round-trip through heroBannerPropsSchema.parse() cleanly.
  props: Partial<HeroBannerData>;
};

export const heroPresets: HeroPreset[] = [];
