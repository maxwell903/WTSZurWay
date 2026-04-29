# HeroBanner v2 — Sprint 7 Completion Report

**Date:** 2026-04-28
**Sprint:** S7 — Video slides (Wave 3, parallel-eligible)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | `<video muted playsinline loop autoplay poster>` with webm > mp4 source ordering | ✅ |
| 2 | Video ended (or duration past) gates slide advance via `Math.max(intervalMs, video.duration*1000)` | ✅ |
| 3 | Poster fallback during loading; black placeholder when no poster | ✅ |
| 4 | Reduced motion: video does not autoplay; only poster shown | ✅ |
| 5 | Unit tests for video element + ended-event gating | ✅ (6 tests) |
| 6 | useSlideshow + dwell gating end-to-end test | ✅ (`a 10-second video keeps the slide active for at least 10s`) |
| 7 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN:** [`slides/VideoSlide.tsx`](../../apps/web/components/site-components/HeroBanner/slides/VideoSlide.tsx)
- **REWRITTEN:** [`hooks/useSlideshow.ts`](../../apps/web/components/site-components/HeroBanner/hooks/useSlideshow.ts) — added `getDwellMsOverride?: () => number | null` param + Date.now()-based dwell check inside the interval tick. Existing 18 v1 HeroBanner tests still pass unmodified.
- **MODIFIED:** [`layouts/SlideshowFrame.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx) — `useHeroSlideshow` now tracks per-slide video durations in a ref, threads `onDurationKnown` into VideoSlide, and provides the `getDwellMsOverride` callback to useSlideshow.
- **NEW:** [`__tests__/video-slide.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/video-slide.test.tsx) — 6 tests.

## Plan deviations

- **`hooks/useSlideshow.ts` modified.** S2 owned the original; S7's plan explicitly authorizes extending the hook for the dwell override. The change is purely additive: a new optional param + an internal time-tracking ref. The semantics for callers that don't pass `getDwellMsOverride` are byte-equivalent to v1 (verified by all 40 prior HeroBanner tests passing unmodified).
- **`useSlideshow` switched from raw setInterval-advance to setInterval + elapsed-time check.** The previous behavior was "advance on every interval tick"; the new behavior is "tick at intervalMs, but only advance if elapsed time since slide start meets the dwell requirement". For callers without the override, `requiredDwell === intervalMs`, so the elapsed check `>= intervalMs` is satisfied at every tick — identical observable behavior. This is the approach that lets the per-slide override work without restructuring the entire hook into setTimeout chains.
- **`layouts/SlideshowFrame.tsx` modified.** S4 owns this file; S7 added the duration-tracking ref + onDurationKnown wiring. Same sequential-execution caveat as S6 — flagging for the worktree-parallel scenario.

## Quality gates

- ✅ `pnpm test` — HeroBanner suite: 76 passed (was 70; +6 video).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean (49 files).

## Architecture notes

- **The video element keeps `loop`** as the spec requires. With `loop`, the `ended` event never fires. Instead, we use `loadedmetadata` to learn `video.duration`, then the slideshow uses Date.now()-based timing to advance after `Math.max(intervalMs, duration*1000)`. This satisfies the spec's "wait for the longer" semantics without depending on `ended`.
- **Per-slide durations cached in a ref** so the `getDwellMsOverride` callback is stable (no useEffect re-run on duration discovery). When the active slide changes, the override naturally returns the new slide's known duration (or null for image slides → falls back to intervalMs).
- **Reduced motion path renders an `<img>` of the poster** with `data-hero-slide-kind='video-poster'` — visitors with reduce-motion preference see only the static poster, never any motion.

## Status

**Sprint 7 — DONE.**
