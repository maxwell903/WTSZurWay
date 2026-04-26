# SPRINT_SCHEDULE.md — Orion's Belt build plan

> Read this end-to-end once before starting Sprint 0. Re-read the relevant sections before kicking off any sprint.

---

## 0. The plan in one paragraph

Eighteen sprints — numbered 0, 1, 2, 3, 3b, 4, 5, 6, 7, 8, 9, 9b, 10, 11, 12, 13, 14, 15 — take an empty repo to a complete, deployable Orion's Belt app capable of running the demo flow in `PROJECT_SPEC.md` §13.2 end-to-end **and** supporting per-row detail pages and cross-page filter parameters per `PROJECT_SPEC.md` §8.12. Sprint 0 stands the project up; Sprints 1–4 deliver Element 1 (the RMX-shell setup form and initial AI generation); Sprint 3b amends the locked `SiteConfig` schema to support detail pages without disturbing the rest of Sprint 3's work; Sprints 5–10 deliver the editor (Element 2) and its data-binding capabilities, with Sprint 5 wiring the new `Button`/`InputField` props that Sprint 9b will resolve at render time; Sprints 11–13 deliver AI editing, adjustment chat, and deploy + the public site (Element 3); Sprint 9b builds the row-context provider and detail-page runtime on top of Sprint 9 and Sprint 13; Sprints 14–15 add the demo safety net and final polish. Sprint 16 from `PROJECT_SPEC.md` §14 (pitch materials) is **out of scope** per direct user instruction.

This schedule assumes a single-branch workflow on `master` per the 2026-04-25 entry in `DECISIONS.md`. The parallelism windows in §1 are kept for reference but are not the active workflow. Quality, robustness, and correctness are paramount; calendar pressure is not a factor in any sprint plan.

---

## 1. Dependency graph

```
                                                                ┌──► 04 ──┐
   00 ──► 01 ──► 02 ──┐                                         │         │
                      ├──► (02 + 03 + 3b merged) ──► 04 ──► 11 ─┴──► 12 ──┤
   00 ────────► 03 ──► 3b ──┘                                             │
                            │                                             │
                            ├──► 05 ──► 06 ──┬──► 07 ──┬──► 11            │
                            │                ├──► 08 ──┘                  │
                            │                ├──► 10 (parallel)           │
                            │                └──► 13 ──┬──────────────────┤
                            │                          │                  │
                            └──► 09 ────────► 9b (after 09 + 13) ─────────┤
                                                                          ▼
                                                                 14 ──► 15 ──► DONE
```

Read it as: an arrow `A ──► B` means B cannot start until A is fully merged and quality-gated.

### Parallelism windows (informational only — current workflow is single-branch)

- **Window A (after Sprint 0):** Sprint 1 and Sprint 3 run on disjoint paths.
- **Window A.5 (after Sprint 3):** Sprint 3b runs alone — no other sprint touches `apps/web/lib/site-config/` or `apps/web/types/site-config.ts` while 3b is in flight. Sprint 3b is short and pure schema.
- **Window B (after Sprint 1 + 3 + 3b):** Sprint 2 and Sprint 5 run on disjoint paths.
- **Window C (after Sprint 6):** Sprint 7 and Sprint 8 run on disjoint paths inside `apps/web/components/editor/`.
- **Window D (after Sprint 5):** Sprint 10 runs in parallel with Sprints 6, 7, 8 — it touches `apps/web/app/api/form-submissions/` and `apps/web/components/editor/sidebar/data-tab/`. **Caveat:** Sprint 10's Data tab integration shares a parent file with Sprint 6. Do Sprint 6 first or merge it before Sprint 10.
- **Window E (after Sprint 11):** Sprint 12 and Sprint 13 run on disjoint paths.
- **Window F (after Sprint 9 + 13):** Sprint 9b runs alone — it touches `apps/web/lib/row-context/`, the renderer (extends Sprint 3 patterns), and the public route (which Sprint 13 designs as a catch-all that Sprint 9b extends).

### Sequential pinch points (no parallelism)

- Sprint 0 → everything.
- Sprint 3 → Sprint 3b → every sprint that consumes the schema (4, 5, 6, 9, 9b, 11, 13).
- Sprint 4 → Sprint 11 (AI infrastructure must exist before AI Edit).
- Sprint 14 (fixtures) requires both AI surfaces (4 and 11) to exist.
- Sprint 15 (polish + E2E) is the final convergence — no parallel work after it starts.

---

## 2. Sprint summaries

### Sprint 0 — Foundation
Stands up the empty `WTSZurWay/` repo as a working pnpm monorepo with Next.js 15 / TypeScript strict / Tailwind / shadcn/ui / Biome / Vitest / Playwright / typed Supabase clients pointing at a hosted Supabase project. Adds `CLAUDE.md`, `DECISIONS.md`, `.env.example`, `README.md`. Smoke test: `pnpm dev` shows a hello page; `pnpm test` passes one dummy test.

**Owned:** repo root, `apps/web/`, `supabase/` (init only).
**External actions:** install Node 20+, pnpm, Supabase CLI (used in linked-project mode against the hosted project — no Docker); create Anthropic API key; create Vercel account (deferred to Sprint 13).

### Sprint 1 — Mock RM data + RMX shell
Adds the `rm_*` tables from `PROJECT_SPEC.md` §5.1, seeds Aurora Property Group (8–10 properties, 30–60 units), implements `lib/rm-api/` typed helpers, and renders the RMX shell chrome (top bar + sub-bar) at `/setup` with an empty form skeleton.

**Owned:** `supabase/migrations/`, `supabase/seed.sql`, `apps/web/lib/rm-api/`, `apps/web/lib/supabase/`, `apps/web/components/rmx-shell/`, `apps/web/app/(rmx)/`.

### Sprint 2 — Element 1 form
Implements the full setup form per `PROJECT_SPEC.md` §7.2 with `react-hook-form` + Zod, logo uploads to Supabase Storage, palette radio cards, prompt textarea + image attach, and the Advanced accordion. Submit button stays disabled until required fields are valid; on submit, payload is logged (no API call yet).

**Owned:** `apps/web/app/(rmx)/setup/page.tsx`, `apps/web/components/setup-form/`, `apps/web/lib/storage/`.
**External actions:** create the `logos` and `ai-attachments` Supabase Storage buckets.

### Sprint 3 — Site config schema + base renderer
Defines the `SiteConfig` schema in `lib/site-config/schema.ts` with Zod, builds the shared renderer in `components/renderer/`, and ships the first six site components: Section, Heading, Paragraph, Image, Spacer, Divider. Adds a throwaway `/dev/preview` page that renders a hardcoded config.

**Owned:** `apps/web/lib/site-config/`, `apps/web/components/renderer/`, `apps/web/components/site-components/{Section, Heading, Paragraph, Image, Spacer, Divider}/`, `apps/web/types/site-config.ts`, `apps/web/app/dev/preview/`.

### Sprint 3b — Schema amendment for detail pages (NEW)
Amends the `SiteConfig` schema to support the detail-page model added in `PROJECT_SPEC.md` §8.12 + §11. Adds `Page.kind` (`"static" | "detail"`, default `"static"`) and `Page.detailDataSource` (`"properties" | "units"`, required iff `kind="detail"`). Enforces the U2 slug uniqueness rule (per-kind, not global) at the `siteConfigSchema` level via `superRefine`. Updates `parse.ts` round-trip behavior (no source change expected — Zod refinements flow through automatically) and adds round-trip tests for detail-page configs. Pure schema work — touches no component, no renderer, no route.

**Owned:** `apps/web/lib/site-config/schema.ts`, `apps/web/lib/site-config/index.ts`, `apps/web/types/site-config.ts`, `apps/web/lib/site-config/__tests__/schema.test.ts`, `apps/web/lib/site-config/__tests__/parse.test.ts`, plus an append-only entry in `DECISIONS.md` recording the planned schema-lock break.
**Pre-flight requirement:** PROJECT_SPEC.md §11 must contain the amended `Page` shape and §8.12 must exist before this sprint can begin. The Sprint 3b CLAUDE.md emits a pre-flight check that Deviation-fails if either is missing.

### Sprint 4 — Initial generation endpoint
Adds the `sites` and `site_versions` tables, the `/api/generate-initial-site` Anthropic-backed route with the system prompt described in `PROJECT_SPEC.md` §9.2, the loading narration component, the preview iframe (`/[site]/preview`), and the error UI per §9.6. Wires the Element 1 "Ready to Preview & Edit?" button to the endpoint.

**Owned:** `apps/web/app/api/generate-initial-site/`, `apps/web/lib/ai/`, `apps/web/components/setup-form/PreviewPanel.tsx`, `apps/web/components/setup-form/LoadingNarration.tsx`, `apps/web/app/[site]/preview/`, `supabase/migrations/00X_sites.sql`.
**External actions:** Anthropic API key in `.env.local`.
**Detail-pages amendment:** the Sprint 4 system prompt MUST teach Claude about `Page.kind` and `Page.detailDataSource` per the amended §11, and MUST include at least one detail page (typically a unit-detail template) in any initial generation that contains a Repeater of units. The full system-prompt update will be specified when Sprint 4 is planned.

### Sprint 5 — More site components
Implements the remaining 14 demo components (`PROJECT_SPEC.md` §6.1): Row, Column, Button, Logo, NavBar, Footer, HeroBanner, PropertyCard, UnitCard, Repeater (shell, no data binding yet), InputField, Form (shell), MapEmbed, Gallery. Each gets `index.tsx`, an `EditPanel.tsx` skeleton, and a `SPEC.md`. Registry wired so the renderer can render any component type.

**Owned:** `apps/web/components/site-components/{14 dirs}/`, `apps/web/components/site-components/registry.ts`, `apps/web/components/site-components/__tests__/registry.test.ts` (ownership transfers from Sprint 3), `apps/web/app/dev/components/`.
**Detail-pages amendment:** `Button` props gain `linkMode: "static" | "detail"` (default `"static"`) and `detailPageSlug?: string` (required iff `linkMode="detail"`). `Button.href` strings may contain `{{ row.* }}` tokens; Sprint 5 stores them verbatim and Sprint 9b resolves them. `InputField` props gain `defaultValueFromQueryParam?: string`; Sprint 5 wires the prop and the input reads `window.location.search` on mount in client-side use (the read is shell-safe — it just sets `defaultValue`). The dev fixture at `/dev/components` exercises a Button with `linkMode="detail"` and an InputField with `defaultValueFromQueryParam`. Sprint 5's CLAUDE.md and prompt are re-emitted with these additions before the sprint runs.

### Sprint 6 — Element 2 layout shell
Builds the editor at `/[site]/edit`: top bar (logo, site name, page selector, preview toggle, deploy), four-tab left sidebar (Site, Pages, Add, Data), right-sidebar shell, canvas that renders the current page using the shared renderer in edit mode. Selection model wired via Zustand. The Add tab shows static (non-draggable) component cards.

**Owned:** `apps/web/app/[site]/edit/`, `apps/web/components/editor/`, `apps/web/lib/editor-state/`.
**Detail-pages amendment:** the Pages tab "Add page" modal exposes a `Page kind` dropdown (Static / Detail) and, when Detail is selected, a `Detail data source` dropdown (properties / units). The slug input validates against the per-kind uniqueness rule from §11. The page selector in the top bar visually distinguishes detail pages (e.g. small "DETAIL" badge). Re-emitted when Sprint 6 is planned.

### Sprint 7 — Drag-and-drop
Wires `dnd-kit`. Drag from Add tab to canvas with valid drop zones (per children policy from each component's SPEC.md). Reorder via drag within parent. Resize column span and height via handles.

**Owned:** `apps/web/components/editor/canvas/dnd/`, resize handle code in renderer wrappers.

### Sprint 8 — Element edit mode (manual)
Right-click on a selected component swaps the left sidebar to Element Edit mode with Content / Style / Animation / Visibility / Advanced tabs. Wires shared style controls (`PROJECT_SPEC.md` §6.4) for every component, plus component-specific Content panels for Heading, Paragraph, Button, Image, NavBar, Footer.

**Owned:** `apps/web/components/editor/edit-panels/`, `apps/web/components/site-components/*/EditPanel.tsx` (filled in for the listed components).
**Detail-pages amendment:** Button's Content panel gains a `Link mode` segmented control (Static URL / Detail page); when "Detail page" is selected, a `Detail page` dropdown lists the user's existing detail pages by name. InputField's Content panel gains a `Default from query parameter` field. Re-emitted when Sprint 8 is planned.

### Sprint 9 — Repeaters and filters
Implements the full Repeater EditPanel: data source dropdown, `react-querybuilder` filter, Connected Inputs UI, sort, limit, empty state. RM field tokens (`{{ row.unit_name }}`, `{{ row.current_market_rent | money }}`) resolve in renderer. PropertyCard and UnitCard support binding. Uses TanStack Query for server-state caching.

**Owned:** `apps/web/components/site-components/Repeater/EditPanel.tsx` (full), `apps/web/lib/site-config/data-binding/`, integration code in renderer.
**Depends on:** Sprint 5 (Repeater shell) + Sprint 8 (edit panel infra).
**Detail-pages amendment:** Sprint 9 introduces the row context provider as a Repeater-internal concern. Sprint 9b generalizes it to also wrap detail pages. Sprint 9 is planned to expose its row context provider as a reusable export from `apps/web/lib/row-context/` so Sprint 9b can wrap detail pages with the same context. The token resolver is similarly factored out.

### Sprint 9b — Detail pages runtime + row context generalization (NEW)
Generalizes the row context provider Sprint 9 introduced inside Repeater into shared infrastructure under `apps/web/lib/row-context/`. Builds the public route's detail-page handling: when the URL is `/{site}/{slug}/{id}`, the route handler looks up the page with `(slug, kind="detail")`, fetches the row from the appropriate `lib/rm-api/` helper based on `detailDataSource`, and renders the page with the row in context. Extends the shared token resolver so any string prop on any component resolves `{{ row.* }}` tokens against the in-scope row (Repeater iteration or detail page). Wires the Button `linkMode="detail"` href computation: at render time, if a button has `linkMode="detail"` and is inside a row context, its href is `/{detailPageSlug}/{row.id}`. Wires the InputField `defaultValueFromQueryParam` read on mount.

**Owned:** `apps/web/lib/row-context/`, `apps/web/lib/token-resolver/`, additions to the public route file (jointly designed with Sprint 13 — the route is a catch-all from the start; Sprint 9b adds the detail branch), additions to the renderer's prop-resolution path (extends Sprint 3 patterns; the renderer's main module file is shared with Sprint 3 — Sprint 9b adds an opt-in resolver hook), additions to `Button/index.tsx` and `InputField/index.tsx` (resolution wiring; ownership of these files transfers from Sprint 5 to Sprint 9b for this sprint, same hand-off pattern as Sprint 2c BrandSection).
**Depends on:** Sprint 9 (row context infrastructure to generalize) + Sprint 13 (the catch-all public route exists and the detail branch can be added without conflict).

### Sprint 10 — Forms + submissions
Adds the `form_submissions` table, the `/api/form-submissions` endpoint, the Form component's full EditPanel (with Form Name + success message), and the Data tab's submission list + table modal in the editor sidebar.

**Owned:** `apps/web/app/api/form-submissions/`, `apps/web/components/site-components/Form/EditPanel.tsx`, `apps/web/components/editor/sidebar/data-tab/`, `supabase/migrations/00X_form_submissions.sql`.

### Sprint 11 — AI Edit (right sidebar)
Implements all Tier 1 + Tier 2 operations from `PROJECT_SPEC.md` §9.4 in `lib/site-config/ops.ts`. Adds `/api/ai-edit` with the system prompt described in §9.3. Builds the right-sidebar chat UI with selection chip, suggested prompts, accept/discard flow, clarification flow, error handling per §9.6.

**Owned:** `apps/web/app/api/ai-edit/`, `apps/web/lib/ai/prompts/ai-edit.ts`, `apps/web/lib/site-config/ops.ts`, `apps/web/components/editor/ai-chat/`.
**Detail-pages amendment:** Sprint 11 implements three additional Tier 1 ops per §8.12: `setLinkMode`, `setDetailPageSlug`, `setQueryParamDefault`. The system prompt teaches Claude these ops. Re-emitted when Sprint 11 is planned.

### Sprint 12 — Element 1 adjustment chat
Reuses `/api/ai-edit` from the Element 1 preview's "Request adjustments" chat. Iframe re-loads on accept. Wires image attach.

**Owned:** `apps/web/components/setup-form/AdjustmentChat.tsx`, integration in `PreviewPanel.tsx`.

### Sprint 13 — Deploy + Element 3
Adds the Deploy button + confirmation modal, the `/api/sites/[id]/deploy` endpoint that snapshots the working version with `is_deployed=true`, the public route `/[site]/[...slug]` (catch-all from the start to accommodate Sprint 9b's detail branch — the static handling is fully owned by Sprint 13; the detail branch is added by Sprint 9b), and the "Live at..." toast with copy.

**Owned:** `apps/web/app/api/sites/[id]/deploy/`, `apps/web/app/[site]/[...slug]/page.tsx` (catch-all; static handling), `apps/web/components/editor/top-bar/DeployButton.tsx`.
**External actions:** create Vercel project, deploy app to Vercel, set production env vars (Anthropic key, Supabase keys).
**Detail-pages amendment:** the public route is `/[site]/[...slug]/page.tsx` (catch-all) from the start. Sprint 13 implements the static branch: split the trailing path into segments, find a static page where `pages.find((p) => p.kind === "static" && p.slug === segments.join("/"))`, render it. If no match, render 404. Sprint 9b adds the detail branch on top of this same file. The catch-all decision is taken in Sprint 13 to avoid a Sprint 9b file rewrite.

### Sprint 14 — Demo fallback fixtures
Adds the `demo_fixtures` table and the silent fallback path in both AI endpoints. Pre-records 2–3 fixtures for the canonical demo prompts. Adds a `pnpm record-fixtures` script and a dev-mode `[live]` / `[fixture]` indicator.

**Owned:** `supabase/migrations/00X_demo_fixtures.sql`, `apps/web/lib/ai/fixtures.ts`, additions to AI endpoints.
**Detail-pages amendment:** the canonical fixtures include at least one detail page in the initial-generation fixture and at least one ai-edit fixture exercising `setLinkMode` / `setDetailPageSlug`.

### Sprint 15 — Polish + demo prep
Tunes all loading narration and error copy, verifies all 10 animation presets across components, reverifies seed end-to-end, and writes the Playwright E2E test that runs the full demo flow (`PROJECT_SPEC.md` §13.2) end-to-end. Performance pass: initial page load < 3s, AI response handling < 20s.

**Owned:** copy edits across many files, `e2e/demo-flow.spec.ts`, perf-related changes.
**Detail-pages amendment:** the E2E test additionally verifies that (a) clicking a UnitCard's CTA navigates to the unit detail page rendered with that unit's data, (b) navigating from a PropertyCard's "View units" button lands on the units page with the property pre-selected via the query parameter.

---

## 3. Recommended execution order (sequential, single-developer)

If you are running one Claude Code session at a time (recommended for a single developer):

`0 → 1 → 3 → 3b → 2 → 5 → 4 → 6 → 8 → 7 → 10 → 9 → 11 → 13 → 9b → 12 → 14 → 15`

Why this order rather than strictly numerical:

- **Sprint 3b directly after Sprint 3** because every later sprint reads the schema. Doing 3b before any other consumer eliminates rebase pain for Sprints 4, 5, 6, 9, 9b, 11, 13.
- Sprint 3 before Sprint 2: the schema and renderer are the spine; the form needs nothing from them, so getting them done first reduces rework risk if the schema changes.
- Sprint 5 before Sprint 4: more components in the registry → richer initial generations from Claude.
- Sprint 8 before Sprint 7: an editor with manual edit panels but no DnD is more useful for testing than an editor with DnD but no panels. (Sprint 7 then completes the editor.)
- Sprint 13 before Sprint 12: deploy is the harder lift; lock it in early.
- **Sprint 9b after Sprint 13** because 9b extends the public route file 13 owns. Doing 13 first means 9b just adds the detail branch instead of designing a route from scratch.

If you are running parallel Claude Code sessions across worktrees, follow the dependency graph in §1. The current project workflow is single-branch on `master` per the 2026-04-25 entry in `DECISIONS.md`.

---

## 4. Merge order (binding)

Merge sprint branches in the order they were *planned*, not the order they finish. After each merge, run the full quality-gate suite (`pnpm test && pnpm build && pnpm biome check`) and the most recently completed sprint's smoke test. If a downstream in-flight sprint conflicts after a merge, that sprint **rebases** before continuing. Never merge a sprint that hasn't passed its own quality gates.

The single-branch workflow makes this trivial — every sprint commits directly to `master` after its own quality gates pass — but the rule survives the workflow change. A failing gate is a Deviation, not a "fix it in the next sprint" situation.

---

## 5. Cross-sprint risk register

| Risk | Sprints affected | Mitigation |
|---|---|---|
| `SiteConfig` schema change after Sprint 3 | All later sprints | The protocol is: a schema-lock break requires a `DECISIONS.md` entry and rebases of in-flight sprints. **Sprint 3b is the first planned schema-lock break under this protocol.** Future schema breaks follow the same pattern: plan a focused schema-only sprint, append a `DECISIONS.md` entry, rebase any in-flight work. Component-level prop schemas (Sprint 5 territory) are not subject to this rule. |
| Anthropic API failure during demo | 4, 11, 14 | Sprint 14 ships the silent fallback fixtures. Verified in Sprint 15 E2E. |
| Supabase migration ordering conflicts | 1, 4, 10, 14 | Migrations are timestamp-prefixed. Each sprint owns its own migration file. Never edit an old migration. |
| `dnd-kit` + Framer Motion interaction quirks | 7 | Sprint 7 declares the risk explicitly. Falls back to non-animated drop zones if conflicts arise. |
| RM field token resolution edge cases (nested fields, formatters) | 9, 9b | Sprint 9 includes a handcrafted token-resolver test suite. Sprint 9b extends the suite to cover detail-page contexts (token outside Repeater, token resolving against the page's row). |
| Repeater re-renders thrashing on every input change | 9 | Sprint 9 uses TanStack Query with debounced query keys. |
| Editor canvas performance with > 40 components | 6, 7, 15 | Renderer is memoized in Sprint 3; Sprint 15 includes a perf pass. |
| Public site SEO (no JS by default) | 13, 9b | Sprint 13 uses RSC where possible for the static public renderer. Sprint 9b ensures detail pages are also RSC-renderable: the row fetch happens server-side, the row context provider is a server component when the page has no client-only descendants. |
| Detail page slug collisions accidentally validated as valid | 3b, 6 | Sprint 3b's schema test suite covers the four valid/invalid slug-collision cases exhaustively (two static same slug → invalid; two detail same slug → invalid; one static + one detail same slug → valid; one static + one detail different slugs → valid). Sprint 6's Pages tab modal validates against the same schema in real time. |
| `{{ row.* }}` token leaks into static contexts | 9b | Sprint 9b's resolver passes through unresolved tokens verbatim and tests cover this case. The renderer never renders raw braces unless they were intentionally authored. |
| Detail page authored without `detailDataSource` slips into a deployed config | 3b | Sprint 3b's schema rejects this at validation time. The deploy endpoint (Sprint 13) re-validates the working config before snapshotting; a config that fails validation cannot deploy. |

---

## 6. What "done" means for the whole project

The project is done when:

1. All 18 sprints (0, 1, 2, 3, 3b, 4, 5, 6, 7, 8, 9, 9b, 10, 11, 12, 13, 14, 15) are merged on `master` and their quality gates pass.
2. The Playwright E2E test from Sprint 15 runs the full demo flow (`PROJECT_SPEC.md` §13.2) end-to-end without intervention, plus the two detail-page assertions added to Sprint 15.
3. `pnpm build` succeeds with zero TypeScript errors and zero warnings.
4. The app is deployed on Vercel and the demo URL responds with the deployed Aurora site, including a working unit detail page (`/aurora-cincy/units/{id}` for some seeded id).
5. `DECISIONS.md` is up to date with every approved deviation and every schema-lock break logged.

---

*End of SPRINT_SCHEDULE.md.*