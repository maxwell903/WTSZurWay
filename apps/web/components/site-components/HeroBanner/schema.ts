import { richTextDocSchema, spacingSchema } from "@/lib/site-config";
import { z } from "zod";

// ----- Per-element layout + size + CTA style (shared) -----
//
// These are reused across heading / subheading / each CTA so a user can
// nudge alignment + offsets independently of the slide-level `align`. All
// fields optional → existing site configs parse unchanged. Margin reuses
// the global spacingSchema so the SpacingInput control plugs in directly.

export const elementLayoutSchema = z.object({
  alignSelf: z.enum(["auto", "left", "center", "right"]).optional(),
  margin: spacingSchema.optional(),
  width: z.number().nonnegative().optional(),
  maxWidth: z.number().nonnegative().optional(),
  // When true, the element renders with `white-space: nowrap`. If width /
  // maxWidth are left unset, the element auto-sizes to fit its content
  // (`width: max-content`, `maxWidth: none`) so the user can leave both
  // sliders on Auto and let the text drive the box. Heading/subheading
  // only — CTAs already nowrap implicitly.
  nowrap: z.boolean().optional(),
});
export type ElementLayout = z.infer<typeof elementLayoutSchema>;

export const textSizeSchema = z.object({
  fontSize: z.number().min(1).optional(),
});
export type TextSize = z.infer<typeof textSizeSchema>;

export const ctaButtonStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().nonnegative().optional(),
  borderRadius: z.number().nonnegative().optional(),
  paddingX: z.number().nonnegative().optional(),
  paddingY: z.number().nonnegative().optional(),
  fontSize: z.number().min(1).optional(),
  fullWidth: z.boolean().optional(),
});
export type CtaButtonStyle = z.infer<typeof ctaButtonStyleSchema>;

// ----- Overlay (discriminated union: solid / linear / radial) -----

const overlayStopSchema = z.object({
  color: z.string(),
  opacity: z.number().min(0).max(1).default(1),
  position: z.number().min(0).max(100).default(0),
});

const solidOverlayConfigSchema = z.object({
  kind: z.literal("solid"),
  color: z.string().default("#000000"),
  opacity: z.number().min(0).max(1).default(0.45),
});

const linearOverlayConfigSchema = z.object({
  kind: z.literal("linear"),
  angle: z.number().default(180),
  stops: z.array(overlayStopSchema).default([]),
});

const radialOverlayConfigSchema = z.object({
  kind: z.literal("radial"),
  center: z.enum(["top", "center", "bottom"]).default("center"),
  stops: z.array(overlayStopSchema).default([]),
});

const overlayConfigSchema = z.discriminatedUnion("kind", [
  solidOverlayConfigSchema,
  linearOverlayConfigSchema,
  radialOverlayConfigSchema,
]);

// Backwards-compat: v1's `overlay` was `z.boolean().default(true)`, so a
// missing field meant "show the dim". Preserve that here:
//  - `true` or `undefined` (omitted) → default solid overlay
//  - `false` → no overlay
//  - object → parsed as the discriminated overlay shape
// Sprint 5 (Overlays) is the first place new callers will write the
// discriminated shape directly; older configs still hit the boolean path.
export const overlaySchema = z.preprocess((raw) => {
  if (raw === true || raw === undefined || raw === null) {
    return { kind: "solid", color: "#000000", opacity: 0.45 };
  }
  if (raw === false) return undefined;
  return raw;
}, overlayConfigSchema.optional());

export type OverlayConfig = z.infer<typeof overlayConfigSchema>;

// ----- Slides (discriminated union: image / video) -----

const slideContentFieldsSchema = {
  heading: z.string().optional(),
  richHeading: richTextDocSchema.optional(),
  subheading: z.string().optional(),
  richSubheading: richTextDocSchema.optional(),
  ctaLabel: z.string().optional(),
  richCtaLabel: richTextDocSchema.optional(),
  ctaHref: z.string().optional(),
  secondaryCtaLabel: z.string().optional(),
  richSecondaryCtaLabel: richTextDocSchema.optional(),
  secondaryCtaHref: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "center", "bottom"]).optional(),

  // Per-element layout / size / button-style overrides. Each is optional;
  // the renderer falls back to the banner-level field, then to defaults.
  headingLayout: elementLayoutSchema.optional(),
  headingSize: textSizeSchema.optional(),
  subheadingLayout: elementLayoutSchema.optional(),
  subheadingSize: textSizeSchema.optional(),
  primaryCtaLayout: elementLayoutSchema.optional(),
  primaryCtaStyle: ctaButtonStyleSchema.optional(),
  secondaryCtaLayout: elementLayoutSchema.optional(),
  secondaryCtaStyle: ctaButtonStyleSchema.optional(),
  ctaRowLayout: elementLayoutSchema.optional(),
};

const imageSlideSchema = z.object({
  kind: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  ...slideContentFieldsSchema,
});

const videoSlideSchema = z.object({
  kind: z.literal("video"),
  videoSrc: z.string(),
  videoSrcWebm: z.string().optional(),
  videoPoster: z.string().optional(),
  alt: z.string().optional(),
  ...slideContentFieldsSchema,
});

// Backwards-compat: legacy `{ src, alt }` slides (no `kind`) are coerced to image slides.
export const slideSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object" && !Array.isArray(raw) && !("kind" in raw)) {
      return { ...(raw as Record<string, unknown>), kind: "image" };
    }
    return raw;
  },
  z.discriminatedUnion("kind", [imageSlideSchema, videoSlideSchema]),
);

export type Slide = z.infer<typeof slideSchema>;
export type ImageSlide = z.infer<typeof imageSlideSchema>;
export type VideoSlide = z.infer<typeof videoSlideSchema>;

// ----- Other v2-only nested schemas -----

export const countdownConfigSchema = z.object({
  targetIso: z.string(),
  label: z.string().optional(),
  expiredLabel: z.string().optional(),
});

export const logoStripEntrySchema = z.object({
  src: z.string(),
  alt: z.string(),
});

// ----- Top-level HeroBanner props (v1 + v2) -----

export const heroBannerPropsSchema = z.object({
  // v1 — text content (preserved unchanged)
  heading: z.string().default("Welcome"),
  richHeading: richTextDocSchema.optional(),
  subheading: z.string().default(""),
  richSubheading: richTextDocSchema.optional(),
  ctaLabel: z.string().default(""),
  richCtaLabel: richTextDocSchema.optional(),
  ctaHref: z.string().default("#"),

  // v1 — static background (preserved)
  backgroundImage: z.string().optional(),
  height: z.string().default("480px"),

  // v2 — overlay (was `boolean` in v1; coerced via overlaySchema preprocess)
  overlay: overlaySchema,

  // v1 — slideshow timing (preserved)
  images: z.array(slideSchema).default([]),
  autoplay: z.boolean().default(true),
  intervalMs: z.number().int().min(500).default(5000),
  loop: z.boolean().default(true),
  pauseOnHover: z.boolean().default(true),
  showDots: z.boolean().default(true),
  showArrows: z.boolean().default(false),

  // v2 — dual-CTA banner-level secondary
  secondaryCtaLabel: z.string().optional(),
  richSecondaryCtaLabel: richTextDocSchema.optional(),
  secondaryCtaHref: z.string().optional(),

  // v2 — per-element layout + size + button styling (banner-level defaults).
  // Mirrored on each slide for per-slide overrides; renderer merges
  // slide-over-banner with sparse undefined-aware merge so missing fields
  // fall through to defaults.
  headingLayout: elementLayoutSchema.optional(),
  headingSize: textSizeSchema.optional(),
  subheadingLayout: elementLayoutSchema.optional(),
  subheadingSize: textSizeSchema.optional(),
  primaryCtaLayout: elementLayoutSchema.optional(),
  primaryCtaStyle: ctaButtonStyleSchema.optional(),
  secondaryCtaLayout: elementLayoutSchema.optional(),
  secondaryCtaStyle: ctaButtonStyleSchema.optional(),
  ctaRowLayout: elementLayoutSchema.optional(),

  // v2 — split layout divider ratio (% width of the text panel) and
  // media-fit policy. `splitRatio` is clamped to [10, 90] so neither
  // panel can vanish. `splitMediaFit: "contain"` lets the section's
  // background show through any aspect-ratio slack.
  splitRatio: z.number().min(10).max(90).default(50),
  splitMediaFit: z.enum(["cover", "contain"]).default("cover"),

  // v2 — layout + slide transition
  layout: z.enum(["centered", "split-left", "split-right", "full-bleed"]).default("centered"),
  // Background of the text panel in split-left / split-right layouts. Hex
  // color (e.g. "#ffffff") or the literal "transparent". Ignored by other
  // layouts. Default preserves the v1 white panel for backwards compat.
  splitTextPanelBackground: z.string().default("#ffffff"),
  slideTransition: z
    .enum(["crossfade", "slide-left", "slide-right", "zoom", "fade-up"])
    .default("crossfade"),

  // v2 — motion effects
  kenBurns: z.boolean().default(false),
  parallax: z.boolean().default(false),

  // v2 — background effects
  cursorSpotlight: z.boolean().default(false),
  particles: z.enum(["none", "stars", "dots", "grid"]).default("none"),

  // v2 — text effects
  rotatingWords: z.array(z.string()).optional(),
  countdown: countdownConfigSchema.optional(),

  // v2 — logo marquee (used by the Logo Marquee preset)
  logoStrip: z.array(logoStripEntrySchema).optional(),
});

export type HeroBannerData = z.infer<typeof heroBannerPropsSchema>;

export const HERO_BANNER_FALLBACK: HeroBannerData = heroBannerPropsSchema.parse({});
