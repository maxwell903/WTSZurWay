# HeroBanner v2 — Sprint 3 Completion Report

**Date:** 2026-04-28
**Plan:** [`hero-banner-v2-fuzzy-petal.md`](../../C:\Users\mwayne\.claude\plans\hero-banner-v2-fuzzy-petal.md)
**Sprint:** S3 — EditPanel split + composition roots
**Wave:** 2 (Foundation, sequential — last sprint before Wave 3 unblocks)

## DoD checklist

| # | Item | Status |
|---|---|---|
| 1 | `edit-panel/index.tsx` mounts each section in spec order (Preset → Slides → Layout → Overlay → Effects → Timing → CTA) | ✅ |
| 2 | `EditPanel.tsx` becomes a one-line re-export of `edit-panel/index.tsx` | ✅ |
| 3 | `EffectsSection.tsx` is purely compositional — imports the 3 sub-sections, no controls of its own | ✅ |
| 4 | Sub-section names use `TextEffectsSubsection` (not `OverlayEffectsSubsection`) — naming clarification logged in this report | ✅ |
| 5 | Sections that have current behavior preserve byte-identical control rendering (same testids, same callbacks); stub sections render `null` | ✅ |
| 6 | All 8 existing `__tests__/EditPanel.test.tsx` tests pass unmodified | ✅ |
| 7 | §15.7 quality gates pass | ✅ |
| 8 | This Completion Report | ✅ |

## Files created (all in `apps/web/components/site-components/HeroBanner/edit-panel/`)

**Composition root + utils:**
- [`edit-panel/index.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/index.tsx) — mounts each section in the spec's order
- [`edit-panel/utils.ts`](../../apps/web/components/site-components/HeroBanner/edit-panel/utils.ts) — `SectionProps`, `readString`, `readBool`, `readNumber`, `readImages` (extracted verbatim from v1 `EditPanel.tsx`)

**Real-behavior sections (preserve v1 controls):**
- [`edit-panel/SlidesSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/SlidesSection.tsx) — embeds the existing `SlideshowImagesEditor`
- [`edit-panel/OverlaySection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/OverlaySection.tsx) — overlay switch + height field
- [`edit-panel/TimingSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/TimingSection.tsx) — autoplay, intervalMs, loop, pauseOnHover, showDots, showArrows
- [`edit-panel/CtaSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx) — heading, sub-heading, CTA label/href, background image URL

**Stub sections (Wave 3 / Wave 4 fills these in):**
- [`edit-panel/PresetPicker.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/PresetPicker.tsx) — Sprint 11
- [`edit-panel/LayoutSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/LayoutSection.tsx) — Sprint 4

**EffectsSection composition root + 3 sub-section stubs (the collision-resolution split):**
- [`edit-panel/EffectsSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/EffectsSection.tsx) — composition root, mounts 3 sub-sections
- [`edit-panel/effects/MotionEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/MotionEffectsSubsection.tsx) — Sprint 6
- [`edit-panel/effects/BackgroundEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/BackgroundEffectsSubsection.tsx) — Sprint 9
- [`edit-panel/effects/TextEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/TextEffectsSubsection.tsx) — Sprint 10

## Files modified

- [`apps/web/components/site-components/HeroBanner/EditPanel.tsx`](../../apps/web/components/site-components/HeroBanner/EditPanel.tsx) — shrunk from 162 lines to a 4-line re-export.

## Plan deviations

- **Naming:** sub-section file is `TextEffectsSubsection.tsx` (not the spec's illustrative `OverlayEffectsSubsection`). Reason: the top-level `OverlaySection.tsx` already configures the gradient overlay; reusing the name "Overlay" for an unrelated EffectsSection child (rotating heading + countdown) would have been confusing. Logged in [Sprint 1's plan file](../../../../C:\Users\mwayne\.claude\plans\hero-banner-v2-fuzzy-petal.md) under "Pre-staged collision points" and reaffirmed in [`TextEffectsSubsection.tsx`'s comment](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/TextEffectsSubsection.tsx).
- **No tooltips on extracted controls.** DoD #5's "byte-identical control rendering" took precedence over the spec's binding "every control must have a tooltip" requirement for this sprint. Reason: any control passed `tooltip` gets wrapped in a `WithTooltip` span (see Sprint 1), which changes the rendered DOM and risks regressions in the existing 8 EditPanel tests. The Wave 3 sprints that own each section (S4/S5/S6/S8/S9/S10) will add tooltips to the controls they touch. Sprint 11 (Presets + AI catalog + SPEC.md) should do a final tooltip sweep across `OverlaySection`, `TimingSection`, `CtaSection`, and any controls Wave 3 left bare. **Open item flagged for the final sprint.**
- **Section order changed from v1.** v1 EditPanel rendered heading/CTA controls FIRST and the slideshow group LAST. The new spec-driven order is Preset → Slides → Layout → Overlay → Effects → Timing → CTA. This is a visual reorder; testid lookups still work so the 8 existing tests pass unchanged. If you want a different order, change it in [`edit-panel/index.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/index.tsx).

## Quality Gate Notes (CLAUDE.md §15.7)

- ✅ `pnpm --filter web test` — **1445 passed, 18 skipped** (no count change vs Sprint 2 — split is purely structural).
- ✅ `pnpm --filter web typecheck` — pass.
- ✅ `pnpm --filter web build` — pass; no bundle delta.
- ✅ `pnpm biome check apps/web/components/site-components/HeroBanner` — clean across all 42 files (was 30 in Sprint 2; +12 new edit-panel files).

## Architecture notes

- **EffectsSection composition root pattern works.** Three Wave 3 sprints can now land their EffectsSection contributions in disjoint files with no merge conflicts:
  - S6 owns [`effects/MotionEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/MotionEffectsSubsection.tsx)
  - S9 owns [`effects/BackgroundEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/BackgroundEffectsSubsection.tsx)
  - S10 owns [`effects/TextEffectsSubsection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/effects/TextEffectsSubsection.tsx)
  - None of them touches [`EffectsSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/EffectsSection.tsx) itself.

- **`SectionProps` is the section contract.** Every section receives `{ node, writePartial }`. New sections can rely on this without re-reading the editor store. Wave 3 sprints adding new controls just call `writePartial({ propName: nextValue })` and the schema parse + render in [`index.tsx`](../../apps/web/components/site-components/HeroBanner/index.tsx) handles the rest.

- **`utils.ts` helpers are read-only and shared.** If a Wave 3 sprint needs additional readers (e.g., `readSlideKindArray`), add them to `utils.ts` rather than per-section to keep the section files small.

## Cross-sprint impact

- **Wave 3 unblocked.** S4, S5, S6, S7, S8, S9, S10 can all begin in parallel worktrees. Each owns disjoint files per the plan's "Pre-staged collision points" table.
- **Sprint 4 (Layouts):** owns [`LayoutSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/LayoutSection.tsx) — replace the stub with a SegmentedControl for `layout`.
- **Sprint 5 (Overlays):** rewrites [`OverlaySection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/OverlaySection.tsx) with the new `OverlayInput` control. Note: the v1 boolean overlay switch lives there today; Sprint 5's rewrite must preserve the testid `hero-overlay` if it wants to keep the existing EditPanel test green, or update that test as part of the sprint.
- **Sprint 8 (Per-slide editor):** rewrites [`controls/SlideshowImagesEditor.tsx`](../../apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx). The [`SlidesSection.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/SlidesSection.tsx) shell stays as-is (it just embeds the editor).
- **Sprint 11 (Presets + AI catalog + SPEC.md):** fills [`PresetPicker.tsx`](../../apps/web/components/site-components/HeroBanner/edit-panel/PresetPicker.tsx). Do the final tooltip sweep at the same time (see "Plan deviations" above).

## Status

**Sprint 3 — DONE.** Wave 2 is now complete. Wave 3 (7 parallel feature sprints) is unblocked and ready to start.
