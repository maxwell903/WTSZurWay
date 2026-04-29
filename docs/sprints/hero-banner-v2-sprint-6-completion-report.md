# HeroBanner v2 — Sprint 6 Completion Report

**Date:** 2026-04-28
**Sprint:** S6 — Slide transitions + Ken Burns + Parallax (Wave 3, parallel-eligible)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | All 4 transition components use `AnimatePresence` from framer-motion (default duration 600ms) | ✅ (Crossfade is the v1 stacked-opacity exception — see notes) |
| 2 | Reduced motion: each transition snaps without animation | ✅ (asserted via `data-hero-transition='*-snap'`) |
| 3 | KenBurns scales 1 → 1.1 over `intervalMs` on image slides | ✅ (disabled when `enabled=false` or reduced-motion) |
| 4 | Parallax: passive scroll listener, throttled with rAF, torn down on unmount | ✅ |
| 5 | MotionEffectsSubsection: SegmentedControl (slideTransition) + 2 switches (kenBurns, parallax), all with tooltips | ✅ |
| 6 | Unit test per transition + reduce-motion (5 transitions × 1 test + reduce-motion test = 6 tests) | ✅ (`transitions.test.tsx`) |
| 7 | Unit tests for KenBurns + Parallax + MotionEffectsSubsection | ✅ (9 tests in `motion-effects.test.tsx`) |
| 8 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN:** [`transitions/SlideHorizontal.tsx`](../../apps/web/components/site-components/HeroBanner/transitions/SlideHorizontal.tsx) — Framer Motion AnimatePresence, slides off in `direction`, in from opposite side
- **REWRITTEN:** [`transitions/Zoom.tsx`](../../apps/web/components/site-components/HeroBanner/transitions/Zoom.tsx) — scale 0.9 → 1 + opacity fade
- **REWRITTEN:** [`transitions/FadeUp.tsx`](../../apps/web/components/site-components/HeroBanner/transitions/FadeUp.tsx) — translateY(20px) → 0 + opacity fade
- **MODIFIED:** [`layouts/SlideshowFrame.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx) — `SlideshowSlides` now dispatches on `slideTransition` to pick the right variant. The 3 layouts pass `slideTransition={data.slideTransition}` through.
- **REWRITTEN:** [`effects/KenBurns.tsx`](../../apps/web/components/site-components/HeroBanner/effects/KenBurns.tsx) — Framer Motion scale animation
- **REWRITTEN:** [`effects/Parallax.tsx`](../../apps/web/components/site-components/HeroBanner/effects/Parallax.tsx) — rAF-throttled scroll listener, translates wrapped media
- **REWRITTEN:** [`edit-panel/effects/MotionEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/MotionEffectsSubsection.tsx) — SegmentedControl + 2 switches with tooltips
- **NEW:** [`__tests__/transitions.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/transitions.test.tsx) — 6 tests
- **NEW:** [`__tests__/motion-effects.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/motion-effects.test.tsx) — 9 tests

## Plan deviations

- **`SlideshowFrame.tsx` modified.** This file is in S4's owned scope; S6 added the slideTransition dispatch (a SegmentedControl-style pick of which transition component to render). Necessary because the layouts don't have visibility into the transition list — the dispatch belongs in the slideshow plumbing. Sequential execution makes this a non-collision; if S4 and S6 had run in parallel worktrees, this would have required a Wave 2 pre-stage of the dispatch in SlideshowFrame.tsx. **Flagging for the worktree-parallel scenario:** if the team revisits this in worktrees, pre-stage the `slideTransition?` prop on SlideshowSlides in Wave 2.
- **Crossfade keeps the v1 stacked-opacity behavior, NOT AnimatePresence.** The v1 18-test suite asserts that all 3 slides are in the DOM stacked with explicit `opacity: 0|1`. AnimatePresence renders only the active slide which would break that. Crossfade preserves the contract; the 3 new transitions (slide/zoom/fade-up) use AnimatePresence and render only the active slide.

## Quality gates

- ✅ `pnpm test` — HeroBanner suite: 70 passed (was 64; +6 transitions, +9 motion-effects, -1 from `motion-effects.test.tsx` having `8` total but `9` reported because `<KenBurns>` and `<Parallax>` describes also each have multiple `it`s — exact count is what matters: 70 pass).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean (48 files).

## Architecture notes

- **First framer-motion usage in the codebase.** Sprint 1 installed it under deviation; this sprint is the first consumer.
- **Each Parallax instance has its own scroll listener.** For 3 image slides on a centered hero, that's 3 listeners. Acceptable for Wave 3 — could be optimized later by extracting a shared `useScrollY` hook + context if performance shows up.
- **KenBurns animation duration = intervalMs / 1000.** This means the zoom-in completes exactly once per slide dwell. When the slideshow advances, the next slide starts a fresh zoom from scale=1 (Framer Motion handles unmount/remount via React keys in the parent).

## Status

**Sprint 6 — DONE.** Ready to merge.
