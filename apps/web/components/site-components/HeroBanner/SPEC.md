# HeroBanner

Big top-of-page band with a heading, optional sub-heading, optional CTA
button, and either a single static background image with a darkening
overlay or an autoplay slideshow of background images with crossfade,
dots, and arrows.

## Props

| Name              | Type                                     | Default      | Description                                                                                                                                  |
| ----------------- | ---------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `heading`         | `string`                                 | `"Welcome"`  | Headline text.                                                                                                                               |
| `subheading`      | `string`                                 | `""`         | Sub-headline text. Hidden when empty.                                                                                                        |
| `ctaLabel`        | `string`                                 | `""`         | CTA button label. Hidden when empty.                                                                                                         |
| `ctaHref`         | `string`                                 | `"#"`        | CTA href.                                                                                                                                    |
| `backgroundImage` | `string \| undefined`                    | `undefined`  | URL of a single background image. Used only when `images` is empty (backwards-compat path).                                                  |
| `overlay`         | `boolean`                                | `true`       | When true, draws a semi-transparent dark layer above the image(s) and below the text.                                                        |
| `height`          | `string`                                 | `"480px"`    | Any CSS length.                                                                                                                              |
| `images`          | `{ src: string; alt?: string }[]`        | `[]`         | Slideshow images. When empty, the component falls back to `backgroundImage`. When non-empty, takes over rendering with a crossfade carousel. |
| `autoplay`        | `boolean`                                | `true`       | Whether the slideshow advances on a timer.                                                                                                   |
| `intervalMs`      | `number` (>= 500)                        | `5000`       | Dwell time per slide in milliseconds.                                                                                                        |
| `loop`            | `boolean`                                | `true`       | Whether reaching the last slide wraps back to the first. Also disables prev/next arrows at boundaries when false.                            |
| `pauseOnHover`    | `boolean`                                | `true`       | Whether `mouseenter` over the section halts the autoplay timer (resumed on `mouseleave`).                                                    |
| `showDots`        | `boolean`                                | `true`       | Render pagination dots along the bottom (only with 2+ slides).                                                                               |
| `showArrows`      | `boolean`                                | `false`      | Render previous/next chevrons over the slideshow (only with 2+ slides).                                                                      |

Invalid props fall back silently to the defaults.

## Behavior

- **Backwards-compat path:** `images: []` (default) renders today's static
  hero — `backgroundImage` as the section background, optional overlay,
  text + CTA centered. The three Sprint-3 hero tests route through this
  branch.
- **Slideshow path:** `images.length >= 1` switches the renderer to
  absolutely-positioned, stacked `<img>` elements with a 600ms opacity
  crossfade between slides. The active slide has `opacity: 1`; the rest
  have `opacity: 0`. The first image uses `loading="eager"` to protect
  LCP; the rest use `loading="lazy"`.
- **Autoplay** uses `setInterval(intervalMs)` in a client-only hook.
  Effects only run after hydration, so server-rendered HTML always shows
  slide 0 with full opacity — no hydration mismatch.
- **`prefers-reduced-motion`** disables both the autoplay timer and the
  CSS opacity transition. The reduced-motion media query is read in a
  post-mount effect (never during render) so SSR is stable.
- **Pause on hover** is gated by the `pauseOnHover` prop. When false,
  `mouseenter` is a no-op.
- **Dots and arrows** are buttons with `aria-label`s and respect
  `loop=false` boundaries (arrows are disabled at the first/last slide).
- **AI guidance:** use `images` for slideshow heroes and `backgroundImage`
  for static heroes — never both. The runtime always prefers `images`
  when non-empty.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height (height also has a dedicated prop above).
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProp` for every prop above. Array prop `images` is mutated via
  dot-path notation, e.g. `propPath: "images.0.src"`, exactly like NavBar
  `links` and Gallery `images`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

No HeroBanner-specific ops are needed — the slideshow surface is just
props.

## Data binding

None.

## Children policy

`none` — heading, sub-heading, CTA, and slideshow images are all configured
via props.

## Non-goals (deferred)

- Dual CTA (primary + secondary) — single CTA only for now.
- Per-slide heading / sub-heading / CTA overrides — slides share the
  surrounding hero text.
- In-editor file upload for slide images — URL paste only. A shared
  upload primitive is a future cross-component upgrade benefiting Image,
  Logo, Gallery, and HeroBanner together.
- Gradient backgrounds, content alignment knobs (text/vertical align),
  height presets.
- Swipe/drag/touch gestures, Ken Burns zoom, video slides.
- Slide drag-reorder — add/remove/edit only in this iteration.
