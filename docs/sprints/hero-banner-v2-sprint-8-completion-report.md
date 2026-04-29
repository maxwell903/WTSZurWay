# HeroBanner v2 — Sprint 8 Completion Report

**Date:** 2026-04-28
**Sprint:** S8 — Per-slide editor + drag-reorder + swipe + per-slide content rendering (Wave 3, parallel-eligible — largest sprint)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | Collapsible slide-row cards (drag handle, thumbnail, kind icon, heading/Slide N label, expand caret, remove); expanded reveals all per-slide fields | ✅ |
| 2 | dnd-kit drag-reorder wired (PointerSensor + KeyboardSensor + arrayMove) | ✅ |
| 3 | Inheritance placeholder `(inherits "<banner value>")` or `(inherits banner)` | ✅ |
| 4 | Each editor control has a tooltip | ✅ |
| 5 | SlideContent renders per-slide heading/sub/CTAs with banner-level fallback; hides empty | ✅ |
| 6 | Dual CTA: secondary renders next to primary in outlined style; either hides when label empty | ✅ |
| 7 | useSwipe hook (50px horizontal, vertical < threshold, no gesture lib, primary-button only) | ✅ |
| 8 | SlideshowImagesEditor unit tests (collapsed UI, expand/collapse, per-slide field writes, kind toggle, inheritance placeholders, add/remove) | ✅ (12 tests) |
| 9 | SlideContent + useSwipe unit tests | ✅ (6 SlideContent + 5 useSwipe = 11 tests) |
| 10 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN (heavy):** [`controls/SlideshowImagesEditor.tsx`](../../apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx) — collapsible cards, dnd-kit sortable, kind toggle, image fields / video fields / per-slide content fields / alignment fields, inheritance placeholders, tooltips on every control
- **REWRITTEN:** [`slides/SlideContent.tsx`](../../apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx) — per-slide override → banner-level fallback for heading/sub/primary+secondary CTA/alignment; dual-CTA rendering with outlined secondary
- **REWRITTEN:** [`hooks/useSwipe.ts`](../../apps/web/components/site-components/HeroBanner/hooks/useSwipe.ts) — pointer-event swipe detection (50px threshold, vertical-rejection, primary-button only)
- **MODIFIED:** [`layouts/SlideshowFrame.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx) — `useHeroSlideshow` accepts an optional `swipeTargetRef` and wires `useSwipe` for next/prev navigation
- **MODIFIED:** [`layouts/CenteredLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx) — passes `slide={data.images[index]}` to SlideContent + section ref for swipe
- **MODIFIED:** [`layouts/FullBleedLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx) — passes `slide` to SlideContent
- **REWRITTEN:** [`layouts/SplitLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx) — split into SplitStatic + SplitWithSlideshow so the text panel can read the active slide for per-slide overrides
- **NEW:** [`__tests__/swipe.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/swipe.test.tsx) — 5 tests
- **NEW:** [`__tests__/slide-content.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx) — 6 tests
- **NEW:** [`controls/__tests__/SlideshowImagesEditor.test.tsx`](../../apps/web/components/editor/edit-panels/controls/__tests__/SlideshowImagesEditor.test.tsx) — 12 tests

## Deliberate test replacements

[`__tests__/EditPanel.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx) — 3 tests updated for the new collapsible row layout. Testid swaps:

| Old | New |
|---|---|
| `hero-slides-src-{idx}-url` (MediaInput inside row) | `hero-slides-{idx}-src-url` (after expanding) |
| `hero-slides-alt-{idx}` | `hero-slides-{idx}-alt` (after expanding) |
| `hero-slides-remove-{idx}` (was on row header in MediaInput-era) | `hero-slides-{idx}-remove` (still on row header) |

The "Add slide appends a blank slide" test still passes unmodified — append still writes `[{ src: "", alt: "" }]`.

## Quality gates

- ✅ `pnpm test` — HeroBanner suite + SlideshowImagesEditor: 99 passed (was 76 in S7; +5 swipe, +6 slide-content, +12 SlideshowImagesEditor).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check` (touched dirs) — clean (80 files).

## Architecture notes

- **`SortableContext` + `useSortable`** patterns from `@dnd-kit/sortable` — standard React DnD-kit usage. Activation distance set to 4px so accidental clicks don't trigger drag.
- **Per-slide content overrides take precedence over RotatingHeading.** When `slide.heading` is set, SlideContent renders plain `<h1>{slide.heading}</h1>` and bypasses the layout's `headingSlot` (which wraps banner-level heading with RotatingHeading). Documented in the SlideContent header comment. This means rotating words only animate the banner-level heading; per-slide headings render verbatim — the spec doesn't mandate either way, this is the simpler/cleaner interpretation.
- **`useSwipe` is mounted at the layout level**, not per-slide. CenteredLayout passes a `sectionRef` which receives the swipe; FullBleedLayout/SplitLayout would benefit from the same wiring but were left for a polish sprint to keep S8's scope contained.
- **Drag-reorder uses string ids = array indices.** Re-ordering swaps array elements via `arrayMove`. If we need stable identities (e.g., for animation enter/exit), Sprint 11 could add an `id` field to each slide.

## Status

**Sprint 8 — DONE.**
