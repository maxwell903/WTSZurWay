import { type HeroBannerData, heroBannerPropsSchema } from "./schema";

export type HeroPreset = {
  id: string;
  name: string;
  description: string;
  // Plain-English vibe + best-use-case for the tooltip.
  tooltip: string;
  thumbnail?: string;
  // A partial HeroBanner props object. The shape is the SCHEMA INPUT, not
  // the parsed output — preprocess hooks let callers use `overlay: false`
  // (preset "split-hero", "minimalist") and other boolean shorthands that
  // are coerced at parse time. Each preset round-trips through
  // heroBannerPropsSchema.parse() cleanly (asserted by presets.test.tsx).
  props: Record<string, unknown>;
};

const SAMPLE_VIDEO = "https://placehold.co/1600x900.mp4";
const SAMPLE_VIDEO_POSTER = "https://placehold.co/1600x900?text=Cinematic";
const SAMPLE_IMAGE_1 = "https://placehold.co/1600x900?text=Hero+1";
const SAMPLE_IMAGE_2 = "https://placehold.co/1600x900?text=Hero+2";
const SAMPLE_IMAGE_3 = "https://placehold.co/1600x900?text=Hero+3";
const SAMPLE_LOGO = (n: number) => `https://placehold.co/120x40?text=Logo+${n}`;

export const heroPresets: HeroPreset[] = [
  {
    id: "cinematic-video",
    name: "Cinematic Video",
    description: "Full-bleed looping video with a centered headline and a single CTA.",
    tooltip:
      "Best for product launches and brand films — drops a video into a full-bleed hero with a soft top-to-bottom dim for legibility.",
    props: {
      layout: "full-bleed",
      heading: "Built for what's next",
      subheading: "",
      ctaLabel: "Watch the film",
      ctaHref: "#",
      kenBurns: false,
      parallax: true,
      overlay: {
        kind: "linear",
        angle: 180,
        stops: [
          { color: "#000000", opacity: 0.1, position: 0 },
          { color: "#000000", opacity: 0.7, position: 100 },
        ],
      },
      images: [
        {
          kind: "video",
          videoSrc: SAMPLE_VIDEO,
          videoPoster: SAMPLE_VIDEO_POSTER,
          alt: "Cinematic placeholder",
        },
      ],
      autoplay: true,
      intervalMs: 8000,
      showDots: false,
      showArrows: false,
    },
  },
  {
    id: "split-hero",
    name: "Split Hero",
    description: "Text on the right, media on the left, with a primary + secondary CTA.",
    tooltip:
      "Best for landing pages where you want a strong call-to-action paired with product imagery — text and visual share equal real estate.",
    props: {
      layout: "split-right",
      heading: "Lease today, move in tomorrow.",
      subheading: "Skip the paperwork. Browse units, sign online, get the keys.",
      ctaLabel: "Browse units",
      ctaHref: "/units",
      secondaryCtaLabel: "How it works",
      secondaryCtaHref: "/about",
      cursorSpotlight: true,
      overlay: false,
      images: [{ kind: "image", src: SAMPLE_IMAGE_1, alt: "Modern apartment interior" }],
      autoplay: false,
      showDots: false,
      showArrows: false,
    },
  },
  {
    id: "centered-carousel",
    name: "Centered Carousel",
    description: "Three rotating image slides with the banner heading centered above each.",
    tooltip:
      "Best for showing 2–4 features or testimonials in a rotating set — banner heading stays put while images cycle behind.",
    props: {
      layout: "centered",
      heading: "What you'll find here",
      subheading: "A quick tour of the experience",
      ctaLabel: "Get started",
      ctaHref: "#",
      slideTransition: "crossfade",
      kenBurns: true,
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showDots: true,
      showArrows: false,
      pauseOnHover: true,
      images: [
        { kind: "image", src: SAMPLE_IMAGE_1, alt: "Slide 1" },
        { kind: "image", src: SAMPLE_IMAGE_2, alt: "Slide 2" },
        { kind: "image", src: SAMPLE_IMAGE_3, alt: "Slide 3" },
      ],
    },
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Oversize headline with a rotating word and a soft starfield. No imagery.",
    tooltip:
      "Best for typography-led brand sites — a single oversize sentence with a {rotator} word that cycles, plus a quiet starfield.",
    props: {
      layout: "centered",
      heading: "Build {rotator} faster.",
      rotatingWords: ["websites", "apps", "forms"],
      subheading: "",
      ctaLabel: "Start free",
      ctaHref: "#",
      particles: "stars",
      overlay: false,
      images: [],
      autoplay: false,
      showDots: false,
      showArrows: false,
      height: "560px",
    },
  },
  {
    id: "logo-marquee",
    name: "Logo Marquee",
    description: "Centered headline above a horizontal scrolling row of customer logos.",
    tooltip:
      "Best for social-proof above-the-fold heroes — the centered heading sits above a continuously scrolling row of customer logos.",
    props: {
      layout: "centered",
      heading: "Trusted by teams everywhere",
      subheading: "",
      ctaLabel: "",
      images: [{ kind: "image", src: SAMPLE_IMAGE_1, alt: "Hero background" }],
      overlay: { kind: "solid", color: "#000000", opacity: 0.55 },
      autoplay: false,
      showDots: false,
      showArrows: false,
      logoStrip: [
        { src: SAMPLE_LOGO(1), alt: "Logo 1" },
        { src: SAMPLE_LOGO(2), alt: "Logo 2" },
        { src: SAMPLE_LOGO(3), alt: "Logo 3" },
        { src: SAMPLE_LOGO(4), alt: "Logo 4" },
        { src: SAMPLE_LOGO(5), alt: "Logo 5" },
        { src: SAMPLE_LOGO(6), alt: "Logo 6" },
      ],
    },
  },
];

// Helper: parse a preset's props through the v2 schema and return the
// resulting full HeroBannerData. Used by tests + PresetPicker so the
// caller always gets a fully-defaulted object.
export function parsePreset(preset: HeroPreset): HeroBannerData {
  return heroBannerPropsSchema.parse(preset.props);
}
