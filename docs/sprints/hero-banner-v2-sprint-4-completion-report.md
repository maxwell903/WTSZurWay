# HeroBanner v2 — Sprint 4 Completion Report

**Date:** 2026-04-28
**Sprint:** S4 — Layouts (Wave 3, parallel-eligible)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | `SplitLayout` renders text + media side-by-side ≥640px, stacks below | ✅ (CSS flex-wrap, no media query) |
| 2 | `FullBleedLayout` edge-to-edge media + corner-anchored text + stronger overlay | ✅ (bottom-left, gradient backdrop) |
| 3 | `CenteredLayout` identical to today (regression check) | ✅ (40/40 v2 tests pass) |
| 4 | `LayoutSection` SegmentedControl with 4 options + tooltips | ✅ |
| 5 | Unit test per layout (DOM structure + `data-hero-layout`) | ✅ (7 tests in `layouts.test.tsx`) |
| 6 | Unit test for `LayoutSection` (each click writes to store) | ✅ (4 tests in `LayoutSection.test.tsx`) |
| 7 | §15.7 quality gates pass | ✅ |

## Files

- **NEW:** [`layouts/SlideshowFrame.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx) — extracted shared `useHeroSlideshow` hook + `<SlideshowSlides>` + `<SlideshowControls>` so all 3 layouts compose the slideshow without duplicating the plumbing.
- **NEW:** [`layouts/SplitLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx) — replaces stub.
- **NEW:** [`layouts/FullBleedLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx) — replaces stub.
- **REWRITTEN:** [`layouts/CenteredLayout.tsx`](../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx) — uses `useHeroSlideshow`.
- **NEW:** [`edit-panel/LayoutSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/LayoutSection.tsx) — replaces stub. SegmentedControl with per-option tooltips.
- **NEW:** [`__tests__/layouts.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/layouts.test.tsx) — 7 tests.
- **NEW:** [`__tests__/LayoutSection.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/LayoutSection.test.tsx) — 4 tests.

## Quality gates

- ✅ `pnpm test` — HeroBanner suite: 51 passed (was 40 in S3).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean (45 files).

## Architecture notes

- **Split layouts route slideshow into the media pane.** `data-slideshow-index` lives on the inner `[data-hero-split-pane='media']` div (not the outer section) so the section's data attrs stay stable while the slideshow advances. Tests assert this contract.
- **Full-bleed text panel position is hardcoded to bottom-left.** Future sprints can expose a `cornerAnchor` prop if needed; not in spec.
- **No new dependencies added.** All visual layout via inline CSS / flexbox.

## Status

**Sprint 4 — DONE.** Ready to merge. Other Wave 3 sprints can proceed without touching `LayoutSection.tsx` or the layout files.
