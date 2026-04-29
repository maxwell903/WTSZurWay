# HeroBanner v2 — Sprint 5 Completion Report

**Date:** 2026-04-28
**Sprint:** S5 — Overlays (Wave 3, parallel-eligible)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | LinearOverlay renders CSS `linear-gradient` with angle + stops | ✅ |
| 2 | RadialOverlay renders CSS `radial-gradient` with center + stops | ✅ |
| 3 | Backwards-compat: legacy `overlay: true` coerced shape renders identically (default solid) | ✅ (already covered by `backwards-compat.test.tsx` from S2) |
| 4 | OverlayInput control (kind selector + react-colorful + opacity sliders + gradient stops) | ✅ |
| 5 | Every control inside OverlayInput has a tooltip | ✅ |
| 6 | Unit test per overlay (3 components, asserting CSS background) | ✅ (4 in `overlays.test.tsx`) |
| 7 | Unit tests for OverlayInput (kind toggles, add/remove/reorder stops, center swap) | ✅ (9 in `OverlayInput.test.tsx`) |
| 8 | §15.7 quality gates pass | ✅ |

## Files

- **REWRITTEN:** [`overlays/LinearOverlay.tsx`](../../apps/web/components/site-components/HeroBanner/overlays/LinearOverlay.tsx) — real `linear-gradient` composer
- **REWRITTEN:** [`overlays/RadialOverlay.tsx`](../../apps/web/components/site-components/HeroBanner/overlays/RadialOverlay.tsx) — real `radial-gradient` composer + `data-hero-overlay-center` for jsdom-friendly testing
- **NEW:** [`controls/OverlayInput.tsx`](../../apps/web/components/editor/edit-panels/controls/OverlayInput.tsx) — kind selector + swatch preview + Solid editor (color picker via `react-colorful` HexColorPicker in a Popover + opacity slider) + Gradient editor (angle slider for linear; top/center/bottom buttons for radial; per-stop color/position/opacity + add/remove/reorder)
- **REWRITTEN:** [`edit-panel/OverlaySection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/OverlaySection.tsx) — replaces v1 boolean SwitchInput with OverlayInput; maps `undefined` (None) → `false` so the renderer's schema preprocess doesn't fall back to the default solid
- **NEW:** [`__tests__/overlays.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/overlays.test.tsx) — 4 tests (Solid + Linear x2 + Radial)
- **NEW:** [`controls/__tests__/OverlayInput.test.tsx`](../../apps/web/components/editor/edit-panels/controls/__tests__/OverlayInput.test.tsx) — 9 tests

## Deliberate test replacement

- [`__tests__/EditPanel.test.tsx`](../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx) — the v1 test "toggling the Overlay switch writes node.props.overlay" was replaced by "clicking the Overlay 'None' kind writes overlay=false (replaces v1 boolean toggle)". The v1 boolean SwitchInput no longer exists; the new OverlayInput writes either `false` (for None) or a discriminated `{kind:..., ...}` object. The replacement test asserts the equivalent intent (turning the overlay off writes a falsy value). Per the plan: "Existing tests must stay green except where this spec intentionally replaces a behavior — replacements must be documented in the relevant sprint's Completion Report."

## Quality gates

- ✅ `pnpm test` — HeroBanner suite: 64 passed (was 51 in S4; +9 OverlayInput, +4 overlays).
- ✅ `pnpm typecheck` — clean.
- ✅ `pnpm build` — clean.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner apps/web/components/editor/edit-panels/controls` — clean (74 files).

## Architecture notes

- **JSDOM doesn't parse `radial-gradient` into `style.background`.** The runtime browser does fine; only the test environment loses the value. Worked around by exposing `data-hero-overlay-center` on RadialOverlay so tests can assert on it directly. Linear-gradient parses correctly in jsdom.
- **`OverlayValue` type is duplicated** between `OverlayInput.tsx` and `schema.ts`. Intentional — the control can be reused by other site-components later without an import cycle on the HeroBanner schema.
- **`react-colorful` is loaded only inside a Popover.** Popover content is portaled and lazy — the color picker doesn't ship in the initial bundle for users who never open it.
- **OverlaySection's `undefined → false` mapping** is the second half of the back-compat coercion story: schema preprocess turns boolean `true`/undefined into the default solid; OverlayInput "None" must therefore write explicit `false` to opt out.

## Status

**Sprint 5 — DONE.** Ready to merge. Other Wave 3 sprints can proceed without touching `overlays/`, `OverlayInput.tsx`, `OverlaySection.tsx`.
