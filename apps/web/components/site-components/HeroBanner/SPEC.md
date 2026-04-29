# HeroBanner (v2)

Top-tier above-the-fold hero with four layouts, image + video slides,
gradient overlays, motion + background + text effects, per-slide content
overrides, dual CTAs, and 5 named presets. Covers the surface area of
heroes on stripe.com / linear.app / framer.com / vercel.com / apple.com.

The v1 surface is preserved — older site configs render unchanged via
schema preprocess (boolean `overlay` and legacy `{src,alt}` slides both
coerce automatically).

## Props

### Text content (v1, preserved)

| Name | Type | Default | Description |
|---|---|---|---|
| `heading` | `string` | `"Welcome"` | Headline text. Supports the literal `{rotator}` token when `rotatingWords` is set. |
| `richHeading` | `RichTextDoc?` | — | Rich-text override for heading (BLOCK profile). |
| `subheading` | `string` | `""` | Sub-headline. Hidden when both per-slide and banner are empty. |
| `richSubheading` | `RichTextDoc?` | — | Rich-text override for sub-heading. |
| `ctaLabel` | `string` | `""` | Primary CTA label. Hidden when empty. |
| `richCtaLabel` | `RichTextDoc?` | — | Rich-text override for CTA label (INLINE profile). |
| `ctaHref` | `string` | `"#"` | Primary CTA href. |

### Dual CTA (v2, new)

| Name | Type | Default | Description |
|---|---|---|---|
| `secondaryCtaLabel` | `string?` | — | Secondary CTA label. Renders as outlined button next to primary. Hidden when both per-slide and banner are empty. |
| `secondaryCtaHref` | `string?` | — | Secondary CTA href. |

### Layout + transitions (v2, new)

| Name | Type | Default | Description |
|---|---|---|---|
| `layout` | `"centered" \| "split-left" \| "split-right" \| "full-bleed"` | `"centered"` | Centered overlays text on full-bleed media (v1 behavior). Split layouts put text on one half + media on the other (no overlap; stacks below 640px). Full-bleed is edge-to-edge media with text in a corner panel + stronger overlay. |
| `slideTransition` | `"crossfade" \| "slide-left" \| "slide-right" \| "zoom" \| "fade-up"` | `"crossfade"` | Crossfade preserves v1 stacked-opacity. The other 4 use Framer Motion `AnimatePresence`. |

### Static + slideshow (v1, preserved)

| Name | Type | Default | Description |
|---|---|---|---|
| `backgroundImage` | `string?` | — | Static background image — used only when slideshow has no slides. |
| `height` | `string` | `"480px"` | Any CSS length. |
| `images` | `Slide[]` | `[]` | Slideshow slides. Discriminated union on `kind: "image" \| "video"`. Legacy `{src, alt}` (no kind) is coerced to `{kind:"image", src, alt}`. |
| `autoplay` | `boolean` | `true` | Whether the slideshow advances on a timer. |
| `intervalMs` | `number` (≥500) | `5000` | Dwell time per slide in ms. For video slides, the actual dwell becomes `Math.max(intervalMs, video.duration*1000)`. |
| `loop` | `boolean` | `true` | Wrap from last back to first when autoplaying. |
| `pauseOnHover` | `boolean` | `true` | Pause autoplay while cursor is over the section. |
| `showDots` | `boolean` | `true` | Render pagination dots (only with 2+ slides). |
| `showArrows` | `boolean` | `false` | Render previous/next arrows. |

### Slide shape (v2, expanded)

```ts
type ImageSlide = {
  kind: "image";
  src: string;
  alt?: string;
  // Per-slide content overrides — when set, win over banner-level fields.
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
};

type VideoSlide = {
  kind: "video";
  videoSrc: string;          // mp4 source (required)
  videoSrcWebm?: string;     // optional webm — preferred when present
  videoPoster?: string;      // shown during load + under reduced motion
  alt?: string;
  // ... same per-slide content overrides as ImageSlide
};
```

Per-slide content fallback rule: per-slide value → banner-level value →
hide. For example, if slide 2 has `heading: "Custom"`, slide 2's h1 reads
"Custom" while slides 1 and 3 read the banner's `heading`.

### Overlay (v2, replaces boolean)

```ts
overlay?:
  | false                    // no overlay
  | true                     // legacy v1 boolean — coerced to default solid
  | { kind: "solid"; color: string; opacity: number }
  | { kind: "linear"; angle: number; stops: { color; opacity; position }[] }
  | { kind: "radial"; center: "top"|"center"|"bottom"; stops: ... }
```

Backwards-compat: a missing/undefined `overlay` preserves the v1 default
("show the dim") and is coerced to the default solid overlay
(`{kind:"solid", color:"#000000", opacity:0.45}`). To explicitly remove
the overlay, pass `false`.

### Motion + background + text effects (v2, new)

| Name | Type | Default | Description |
|---|---|---|---|
| `kenBurns` | `boolean` | `false` | Slow `scale(1)→scale(1.1)` zoom on image slides over `intervalMs`. Disabled on video slides and under reduced motion. |
| `parallax` | `boolean` | `false` | Wrapped media drifts vertically at a slower rate than page scroll. Passive listener throttled with rAF. |
| `cursorSpotlight` | `boolean` | `false` | Soft radial glow follows the cursor. Static at center on touch devices and under reduced motion. |
| `particles` | `"none" \| "stars" \| "dots" \| "grid"` | `"none"` | Pure-CSS animated background pattern. Static under reduced motion. |
| `rotatingWords` | `string[]?` | — | When set and `heading` contains `{rotator}`, replaces the token with words from the list, cycling every 2.5s with Framer Motion fade. Empty list ⇒ literal `{rotator}` renders verbatim. |
| `countdown` | `{targetIso: string; label?: string; expiredLabel?: string}?` | — | Renders d/h/m/s remaining via `setInterval(1000)`. Switches to `expiredLabel` (default `"Now live"`) at zero. |
| `logoStrip` | `{src, alt}[]?` | — | Adds a horizontal scrolling customer-logo row pinned to the bottom of the hero. Used by the Logo Marquee preset. |

`prefers-reduced-motion` disables: autoplay, slide transitions, Ken Burns,
parallax, particle animation, cursor spotlight follow, text rotation,
video autoplay (poster only). Static content always renders.

## Presets

Five named presets ship in [`presets.ts`](./presets.ts). Each is a complete
props object that round-trips through `heroBannerPropsSchema.parse()`.

| ID | Vibe | Best for |
|---|---|---|
| `cinematic-video` | Full-bleed looping video + dark linear gradient overlay + parallax. | Product launches and brand films. |
| `split-hero` | Split-right (text left, media right) + dual CTA + cursor spotlight. | Landing pages where the CTA must compete with product imagery. |
| `centered-carousel` | 3 image slides + Ken Burns + crossfade + dots. | Cycling features or testimonials with a stable banner heading. |
| `minimalist` | Oversize centered heading with `{rotator}` token + 3 rotating words + soft starfield. No imagery. | Typography-led brand sites. |
| `logo-marquee` | Centered heading above a horizontally scrolling logo row. | Social-proof above-the-fold heroes. |

Picking a preset from the EditPanel `PresetPicker` replaces the current
banner props (with a confirmation dialog when the banner has been
customized).

## Internal architecture

Sprint 2 + Sprint 3 split the v1 monolith into the following module
folders so Wave 3's 7 feature sprints could land in disjoint files:

```
apps/web/components/site-components/HeroBanner/
  index.tsx                       — thin entry: parse props, dispatch by data.layout
  schema.ts                       — full v2 Zod schema (S2)
  presets.ts                      — 5 named presets (S11)
  SPEC.md                         — this file (S11)
  EditPanel.tsx                   — 4-line back-compat re-export (S3)
  edit-panel/
    index.tsx                     — composition root: mounts each section in spec order
    PresetPicker.tsx              — preset gallery + confirmation dialog (S11)
    SlidesSection.tsx             — wraps SlideshowImagesEditor
    LayoutSection.tsx             — SegmentedControl for `layout` (S4)
    OverlaySection.tsx            — OverlayInput + height (S5)
    EffectsSection.tsx            — composition root for the 3 sub-sections
    effects/
      MotionEffectsSubsection.tsx       — slideTransition + kenBurns + parallax (S6)
      BackgroundEffectsSubsection.tsx   — cursorSpotlight + particles (S9)
      TextEffectsSubsection.tsx         — rotatingWords + countdown (S10)
    TimingSection.tsx             — autoplay + intervalMs + loop + dots/arrows
    CtaSection.tsx                — heading + subheading + dual CTA + bg image
    utils.ts                      — SectionProps + readString/Bool/Number/Images
  layouts/
    CenteredLayout.tsx            — owns static + slideshow centered render paths
    SplitLayout.tsx               — text-left / text-right (side-by-side ≥640px) (S4)
    FullBleedLayout.tsx           — edge-to-edge media + corner text panel (S4)
    SlideshowFrame.tsx            — useHeroSlideshow hook + SlideshowSlides + SlideshowControls
    LogoMarquee.tsx               — bottom-pinned scrolling logo row (S11)
  slides/
    ImageSlide.tsx                — <img> renderer; receives style from transition
    VideoSlide.tsx                — <video> with webm>mp4 sources + dwell gating (S7)
    SlideContent.tsx              — text + dual CTAs with per-slide → banner fallback (S8)
  transitions/
    types.ts                      — SlideTransitionProps + SlideRenderEntry (callback-based)
    Crossfade.tsx                 — v1 stacked-opacity behavior (preserved)
    SlideHorizontal.tsx           — Framer Motion left/right slide (S6)
    Zoom.tsx                      — Framer Motion 90%→100% scale + fade (S6)
    FadeUp.tsx                    — Framer Motion translateY + fade (S6)
  effects/
    KenBurns.tsx                  — Framer Motion scale animation (S6)
    Parallax.tsx                  — passive scroll listener + rAF throttle (S6)
    CursorSpotlight.tsx           — pointermove → CSS custom properties (S9)
    Particles.tsx                 — pure-CSS animated background (S9)
    RotatingHeading.tsx           — {rotator} token replacement w/ fade cycle (S10)
    CountdownTimer.tsx            — d/h/m/s setInterval(1000) (S10)
  overlays/
    SolidOverlay.tsx              — handles default + legacy boolean coercion
    LinearOverlay.tsx             — CSS linear-gradient with stops (S5)
    RadialOverlay.tsx             — CSS radial-gradient with center + stops (S5)
  hooks/
    useSlideshow.ts               — interval + per-slide dwell override (S7)
    usePrefersReducedMotion.ts
    useSwipe.ts                   — pointer-event 50px threshold (S8)
  __tests__/                      — 14 test files, 147 tests
```

## AI ops supported

- `setProp` for every prop above. Array prop `images` is mutated via
  dot-path notation, e.g. `propPath: "images.0.heading"`. Slide kind is
  switched via `propPath: "images.0.kind"` with value `"image"` or
  `"video"`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

The AI's [`component-catalog.ts`](../../../lib/ai/prompts/snippets/component-catalog.ts)
entry includes a "when to pick which preset" guide so the AI can switch
the banner to a complete preset shape with a single `setProp` on the
synthetic preset key (or via the PresetPicker UI when the user is in the
editor).

## Data binding

None.

## Children policy

`none` — heading, sub-heading, CTAs, slideshow, overlay, effects, presets,
and logo strip are all configured via props.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height (height also has a dedicated prop above).
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.
