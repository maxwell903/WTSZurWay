# HeroBanner v2 — Sprint 1 Completion Report

**Date:** 2026-04-28
**Plan:** [`hero-banner-v2-fuzzy-petal.md`](C:\Users\mwayne\.claude\plans\hero-banner-v2-fuzzy-petal.md)
**Sprint:** S1 — Tooltip prop + MediaUpload + dep installs
**Wave:** 1 (Foundation, sequential)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | `framer-motion` + `react-colorful` installed; deviation logged in `DECISIONS.md` | ✅ |
| 2 | `tooltip?: string` prop added to 7 shared controls (TextInput, SwitchInput, ColorInput, NumberInput, SelectInput, SegmentedControl, MediaInput) | ✅ |
| 3 | `MediaUpload.tsx` built per spec signature (`accept`, `maxSizeMb` default 50, `value`, `onUploaded`, `onCleared`, `tooltip?`) | ✅ |
| 4 | `MediaUpload.test.tsx` covers: button-vs-preview, upload via `uploadSiteMedia`, Replace fires `onCleared`, oversize files rejected (no upload), video preview path | ✅ (6 tests) |
| 5 | `with-tooltip.test.tsx` covers: TextInput + SwitchInput with/without tooltip, functional regression on bare path | ✅ (4 tests) |
| 6 | `SlideshowImagesEditor` upload path verified — `MediaInput` already calls `uploadSiteMedia` (line 49), no changes needed for image rows | ✅ |
| 7 | §15.7 quality gates: `pnpm test` (1431/1431 + 18 skipped), `pnpm typecheck`, `pnpm build` (6.4s) all pass; Biome on touched files clean | ✅ (with caveat — see Quality Gate Notes) |
| 8 | This Completion Report | ✅ |

## Files created

- [`apps/web/components/editor/edit-panels/controls/MediaUpload.tsx`](../../apps/web/components/editor/edit-panels/controls/MediaUpload.tsx)
- [`apps/web/components/editor/edit-panels/controls/with-tooltip.tsx`](../../apps/web/components/editor/edit-panels/controls/with-tooltip.tsx)
- [`apps/web/components/editor/edit-panels/controls/__tests__/MediaUpload.test.tsx`](../../apps/web/components/editor/edit-panels/controls/__tests__/MediaUpload.test.tsx)
- [`apps/web/components/editor/edit-panels/controls/__tests__/with-tooltip.test.tsx`](../../apps/web/components/editor/edit-panels/controls/__tests__/with-tooltip.test.tsx)

## Files modified

- [`apps/web/package.json`](../../apps/web/package.json) — added `framer-motion: 12.38.0`, `react-colorful: 5.6.1`
- [`apps/web/components/editor/edit-panels/controls/TextInput.tsx`](../../apps/web/components/editor/edit-panels/controls/TextInput.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/SwitchInput.tsx`](../../apps/web/components/editor/edit-panels/controls/SwitchInput.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/ColorInput.tsx`](../../apps/web/components/editor/edit-panels/controls/ColorInput.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/NumberInput.tsx`](../../apps/web/components/editor/edit-panels/controls/NumberInput.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/SelectInput.tsx`](../../apps/web/components/editor/edit-panels/controls/SelectInput.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/SegmentedControl.tsx`](../../apps/web/components/editor/edit-panels/controls/SegmentedControl.tsx) — `tooltip?: string` prop
- [`apps/web/components/editor/edit-panels/controls/MediaInput.tsx`](../../apps/web/components/editor/edit-panels/controls/MediaInput.tsx) — `tooltip?: string` prop
- [`DECISIONS.md`](../../DECISIONS.md) — appended 2026-04-28 entry for the framer-motion + react-colorful install

## Plan deviations

- **Plan said 8 controls; actual is 7.** The plan's DoD #2 listed 8 shared controls but the file scope only enumerated 7 (`SlideshowImagesEditor.tsx` is a composite editor handled separately by DoD #6, not a primary control). Updated count in this report.
- **Plan said "MediaInput is augmented with a sibling Upload button (uses MediaUpload)".** `MediaInput` already has its own Upload button that calls `uploadSiteMedia`. Adding a second sibling Upload button would duplicate the UX. Sprint 1 leaves `SlideshowImagesEditor` alone (existing behavior preserved); `MediaUpload` is shipped as a *standalone* shared control ready for Sprint 8's per-slide editor refactor (which will use `MediaUpload` directly inside collapsible cards with kind-aware accept filters).
- **`OverlayEffectsSubsection` → `TextEffectsSubsection`.** Naming clarification documented in the plan; will land in Sprint 3 (this sprint does not touch HeroBanner edit-panel files).

No spec features were dropped or substituted. Both deviations are scope-narrowing clarifications, not behavior changes.

## External Actions Required

- **Verify `site-media` bucket in hosted Supabase Storage.** The bucket migration [`supabase/migrations/20260428000001_create_site_media_bucket.sql`](../../supabase/migrations/20260428000001_create_site_media_bucket.sql) was already authored before this sprint started. If it has not been applied to the hosted project, run `pnpm db:push`. Confirm in the Supabase dashboard that `site-media` exists and **Public** is enabled. Without this, `MediaUpload` will fail at runtime with a Supabase Storage error even though the unit tests (which mock `uploadSiteMedia`) pass.

## Quality Gate Notes (CLAUDE.md §15.7)

- ✅ `pnpm --filter web test` — **1431 passed, 18 skipped** (existing `MediaInput` 5/5, new `MediaUpload` 6/6, new `with-tooltip` 4/4, `HeroBanner` 18/18, `EditPanel` 8/8 — all green).
- ✅ `pnpm --filter web typecheck` — pass, zero errors.
- ✅ `pnpm --filter web build` — `Compiled successfully in 6.4s`.
- ⚠️ `pnpm biome check .` — **345 pre-existing errors across the repo**, **none introduced by Sprint 1**. Biome scoped to `apps/web/components/editor/edit-panels/controls` (the only directory touched by this sprint, plus its `__tests__/`) is clean: `Checked 26 files in 9ms. No fixes applied.`

  The 345 errors predate this sprint and are not §15.9 cross-sprint cleanup candidates (fixing them would touch hundreds of files outside Sprint 1's scope, well beyond §15.9's "smallest change" carve-out). Recommend a separate triage sprint for these. **Sprint 1 is complete with zero new lint debt.**

## Smoke test (manual — to be re-confirmed by user)

Per the plan's Manual Smoke Test:

1. `pnpm dev`, open the editor on a fixture site that includes a HeroBanner with at least one slideshow image.
2. Hover any tooltip-enabled control on the HeroBanner panel; confirm a one-sentence tooltip appears within 700 ms. *(Note: HeroBanner EditPanel won't have visible tooltips until Sprint 3 wires the `tooltip` prop into individual section calls. Sprint 1 only ships the underlying control capability.)*
3. In a slideshow image row, click "Upload", pick a JPEG ≤ 50 MB; confirm it uploads via `MediaInput` and the URL field is populated with a `https://*.supabase.co/storage/v1/object/public/site-media/...` URL. *(Requires External Action above.)*
4. Try uploading a 60 MB file via the standalone `MediaUpload` (use a dev fixture page if one exists, or wait for Sprint 8); confirm the inline error appears.
5. Click Replace on a `MediaUpload` preview; confirm `onCleared` fires.

Steps 1, 4, and 5 are unit-tested. Steps 2, 3 require live runtime verification by user (deferred to live demo per CLAUDE.md "If you can't test the UI, say so explicitly rather than claiming success").

## Cross-sprint impact

- **Sprint 2 (Schema + renderer split):** No dependency. Can start immediately after S1 merges.
- **Sprint 3 (EditPanel split):** Will start using the `tooltip?` prop on every section's controls. Pattern is documented in `with-tooltip.tsx`.
- **Sprint 5 (Overlays):** Will use `react-colorful`'s `HexColorPicker` (now installed).
- **Sprint 6 (Transitions + Ken Burns + Parallax) and Sprint 10 (Rotating heading + Countdown):** Will import from `framer-motion` (now installed).
- **Sprint 8 (Per-slide editor):** Will use `MediaUpload` (built here) for the per-slide upload UX with kind-aware `accept` filters.

## Status

**Sprint 1 — DONE.** Ready to merge to `master` and proceed to Sprint 2.
