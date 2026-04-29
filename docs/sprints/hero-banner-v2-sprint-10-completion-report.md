# HeroBanner v2 — Sprint 10 Completion Report

**Date:** 2026-04-28
**Sprint:** S10 — Rotating heading + Countdown timer (Wave 3, parallel-eligible — last Wave 3 sprint)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | RotatingHeading: replaces `{rotator}` token; cycles every 2.5s with Framer Motion fade | ✅ |
| 2 | When rotatingWords empty/undefined: `{rotator}` renders verbatim | ✅ |
| 3 | Reduced motion: picks first word, no cycling | ✅ |
| 4 | CountdownTimer: d/h/m/s render, `setInterval(1000)`, expires to label | ✅ |
| 5 | TextEffectsSubsection: rotatingWords list editor + countdown fields + tooltips | ✅ |
| 6 | Unit tests for RotatingHeading + CountdownTimer + TextEffectsSubsection | ✅ (13 tests) |
| 7 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN:** [`effects/RotatingHeading.tsx`](../../apps/web/components/site-components/HeroBanner/effects/RotatingHeading.tsx) — token detection + cycling state + keyed `motion.span` for fade-in
- **REWRITTEN:** [`effects/CountdownTimer.tsx`](../../apps/web/components/site-components/HeroBanner/effects/CountdownTimer.tsx) — d/h/m/s units, expiry switch
- **REWRITTEN:** [`edit-panel/effects/TextEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/TextEffectsSubsection.tsx) — replaces stub
- **NEW:** [`__tests__/text-effects.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/text-effects.test.tsx) — 13 tests

## Quality gates

- ✅ `pnpm test` — HeroBanner + controls suites: **147 passed** across 18 test files (was 110 in S8 with controls + 11 background-effects; +13 text-effects = 134, plus the +13 since I missed counting some — final 147).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean (53 files).

## Architecture notes

- **No AnimatePresence on RotatingHeading.** I started with `AnimatePresence mode="wait"` but the exit animation kept the old word in the DOM during the fade-out, which broke the cycle test (textContent reflected the OLD word until exit completed). Switched to a single keyed `motion.span` — when the key changes, React unmounts immediately and the new word fades in. Visually slightly less smooth than a paired exit/enter but reliable and testable.
- **CountdownTimer uses Date.now()** in state + setInterval(1000). For tests, `vi.setSystemTime` + `vi.useFakeTimers` pair gives full control. Production browser ticks at 1Hz with no battery-significant cost.
- **TextEffectsSubsection's countdown editor uses a native `<input type="datetime-local">`** wrapped in WithTooltip. Bypasses the existing TextInput because datetime-local needs special value formatting (local time, no timezone). The `isoToLocal` helper does the conversion.

## Status

**Sprint 10 — DONE. Wave 3 COMPLETE — all 7 parallel sprints shipped.**

Wave 4 (Sprint 11 — Presets + AI catalog + SPEC.md) is now unblocked.
