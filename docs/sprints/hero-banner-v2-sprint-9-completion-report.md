# HeroBanner v2 — Sprint 9 Completion Report

**Date:** 2026-04-28
**Sprint:** S9 — Cursor spotlight + Particles (Wave 3, parallel-eligible)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | CursorSpotlight: pointermove → CSS custom properties; static at center on touch / reduced-motion | ✅ |
| 2 | Particles: pure CSS (no canvas, no new deps); stars / dots / grid kinds; "none" renders nothing | ✅ |
| 3 | Reduced motion: particles render static (no animation property) | ✅ |
| 4 | BackgroundEffectsSubsection: cursorSpotlight switch + particles segmented, both with tooltips | ✅ |
| 5 | CursorSpotlight unit tests (4 — disabled / follow / reduced-motion-static / touch-static) | ✅ |
| 6 | Particles unit tests (5 — none / stars / dots / grid / reduced-motion-static) | ✅ |
| 7 | BackgroundEffectsSubsection unit tests (2 — write cursorSpotlight + write particles) | ✅ |
| 8 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN:** [`effects/CursorSpotlight.tsx`](../../apps/web/components/site-components/HeroBanner/effects/CursorSpotlight.tsx) — attaches pointermove on parent (the hero section), writes `--spotlight-x` / `--spotlight-y` CSS custom properties; reads them in a positioned overlay's `background: radial-gradient(...)`. Touch-device + reduced-motion fall back to a static center spotlight.
- **REWRITTEN:** [`effects/Particles.tsx`](../../apps/web/components/site-components/HeroBanner/effects/Particles.tsx) — pure CSS via layered radial-gradient backgrounds + animated `background-position`. Three kinds: stars (4-layer drift), dots (2-layer float), grid (1-layer drift).
- **MODIFIED:** [`apps/web/app/globals.css`](../../apps/web/app/globals.css) — added the 3 keyframes (`hero-particles-drift`, `hero-particles-float`, `hero-particles-grid`).
- **REWRITTEN:** [`edit-panel/effects/BackgroundEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/BackgroundEffectsSubsection.tsx) — replaces stub.
- **NEW:** [`__tests__/background-effects.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/background-effects.test.tsx) — 11 tests.

## Quality gates

- ✅ `pnpm test` — HeroBanner suite: 98 passed (was 99 in S8 because S8 included controls dir tests; just HeroBanner-dir is +11 new from background-effects). Total project tests still pass.
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean (52 files).

## Architecture notes

- **CursorSpotlight attaches to its parent**, not to its own element, so the pointermove coordinates are relative to the hero (the parent), not to the full-bleed overlay. The overlay reads `var(--spotlight-x, 50%) var(--spotlight-y, 50%)` so it gracefully degrades to center when the listener hasn't fired yet.
- **Particles ships with NO new dependencies and NO canvas.** Pure CSS via layered radial-gradients animated with background-position keyframes. Production renderer + tests don't need anything beyond what's already in the bundle.
- **Reduced-motion path omits the `animation` property** so the visual stays decorative-static. Test asserts `el.style.animation === ""` after rendering with `prefersReducedMotion={true}`.
- **`globals.css` change is additive.** Three new `@keyframes` blocks; no existing rules touched. Animations only consume CPU on heroes that opt in.

## Status

**Sprint 9 — DONE.**
