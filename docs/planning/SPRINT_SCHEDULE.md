# SPRINT_SCHEDULE.md — Orion's Belt build plan

> Read this end-to-end once before starting Sprint 0. Re-read the relevant sections before kicking off any sprint.

---

## 0. The plan in one paragraph

Sixteen sprints, numbered 0 through 15, take an empty repo to a complete, deployable Orion's Belt app capable of running the demo flow in `PROJECT_SPEC.md` §13.2 end-to-end. Sprint 0 stands the project up; Sprints 1–4 deliver Element 1 (the RMX-shell setup form and initial AI generation); Sprints 5–10 deliver the editor (Element 2) and its data-binding capabilities; Sprints 11–13 deliver AI editing, adjustment chat, and deploy + the public site (Element 3); Sprints 14–15 add the demo safety net and final polish. Sprint 16 from `PROJECT_SPEC.md` §14 (pitch materials) is **out of scope** per direct user instruction.

---

## 1. Dependency graph

```
                                                        ┌──► 04 ──┐
   00 ──► 01 ──► 02 ──┐                                 │         │
                      ├──► (02+03 merged) ──► 04 ──► 11 ─┴──► 12 ─┤
   00 ────────► 03 ──┘                                            │
                      │                                            │
                      ├──► 05 ──► 06 ──┬──► 07 ──┬──► 11           │
                      │                ├──► 08 ──┘                 │
                      │                ├──► 10 (parallel)          │
                      │                └──► 13 ──────────────────► │
                      │                                            │
                      └──► 09 (after 05 + 08) ────────────────────►│
                                                                   ▼
                                                          14 ──► 15 ──► DONE
```

Read it as: an arrow `A ──► B` means B cannot start until A is fully merged and quality-gated.

### Parallelism windows

- **Window A (after Sprint 0):** Sprint 1 and Sprint 3 run in parallel. Disjoint owned paths (`apps/web/components/rmx-shell/` + supabase RM tables vs. `apps/web/lib/site-config/` + `apps/web/components/renderer/`).
- **Window B (after Sprint 1+3):** Sprint 2 (Element 1 form, builds on RMX shell) and Sprint 5 (more site components, builds on renderer) can run in parallel. Disjoint paths.
- **Window C (after Sprint 6):** Sprint 7 (drag-and-drop) and Sprint 8 (manual edit panels) can run in parallel. Disjoint paths in `apps/web/components/editor/`.
- **Window D (after Sprint 5):** Sprint 10 (forms + submissions) can run in parallel with Sprints 6, 7, 8 — it touches `apps/web/app/api/form-submissions/` and `apps/web/components/editor/sidebar/data-tab/`, none of which the editor sprints write to. **Caveat:** Sprint 10's Data tab integration into the left sidebar shell shares a parent file with Sprint 6. Do Sprint 6 first or merge it before Sprint 10.
- **Window E (after Sprint 11):** Sprint 12 (Element 1 adjustment chat) and Sprint 13 (deploy + Element 3) can run in parallel.

### Sequential pinch points (no parallelism)

- Sprint 0 → everything.
- Sprint 4 → Sprint 11 (AI infrastructure must exist before AI Edit).
- Sprint 14 (fixtures) requires both AI surfaces (4 and 11) to exist.
- Sprint 15 (polish) is the final convergence — no parallel work after it starts.

---

## 2. Sprint summaries

### Sprint 0 — Foundation
Stands up the empty `WTSZurWay/` repo as a working pnpm monorepo with Next.js 15 / TypeScript strict / Tailwind / shadcn/ui / Biome / Vitest / Playwright / Supabase local. Adds `CLAUDE.md`, `DECISIONS.md`, `.env.example`, `README.md`. Smoke test: `pnpm dev` shows a hello page; `pnpm test` passes one dummy test.

**Owned:** repo root, `apps/web/`, `supabase/` (init only).
**External actions:** install Node 20+, pnpm, Docker Desktop, Supabase CLI; create Anthropic API key; create Vercel account (deferred to Sprint 13).

### Sprint 1 — Mock RM data + RMX shell
Adds the `rm_*` tables from `PROJECT_SPEC.md` §5.1, seeds Aurora Property Group (8–10 properties, 30–60 units), implements `lib/rm-api/` typed helpers, and renders the RMX shell chrome (top bar + sub-bar) at `/setup` with an empty form skeleton.

**Owned:** `supabase/migrations/`, `supabase/seed.sql`, `apps/web/lib/rm-api/`, `apps/web/lib/supabase/`, `apps/web/components/rmx-shell/`, `apps/web/app/(rmx)/`.
**Parallel with:** Sprint 3.

### Sprint 2 — Element 1 form
Implements the full setup form per `PROJECT_SPEC.md` §7.2 with `react-hook-form` + Zod, logo uploads to Supabase Storage, palette radio cards, prompt textarea + image attach, and the Advanced accordion. Submit button stays disabled until required fields are valid; on submit, payload is logged (no API call yet).

**Owned:** `apps/web/app/(rmx)/setup/page.tsx`, `apps/web/components/setup-form/`, `apps/web/lib/storage/`.
**External actions:** create the `logos` and `ai-attachments` Supabase Storage buckets.

### Sprint 3 — Site config schema + base renderer
Defines the `SiteConfig` schema in `lib/site-config/schema.ts` with Zod, builds the shared renderer in `components/renderer/`, and ships the first six site components: Section, Heading, Paragraph, Image, Spacer, Divider. Adds a throwaway `/dev/preview` page that renders a hardcoded config.

**Owned:** `apps/web/lib/site-config/`, `apps/web/components/renderer/`, `apps/web/components/site-components/{Section, Heading, Paragraph, Image, Spacer, Divider}/`, `apps/web/types/site-config.ts`, `apps/web/app/dev/preview/`.
**Parallel with:** Sprint 1.

### Sprint 4 — Initial generation endpoint
Adds the `sites` and `site_versions` tables, the `/api/generate-initial-site` Anthropic-backed route with the system prompt described in `PROJECT_SPEC.md` §9.2, the loading narration component, the preview iframe (`/[site]/preview`), and the error UI per §9.6. Wires the Element 1 "Ready to Preview & Edit?" button to the endpoint.

**Owned:** `apps/web/app/api/generate-initial-site/`, `apps/web/lib/ai/`, `apps/web/components/setup-form/PreviewPanel.tsx`, `apps/web/components/setup-form/LoadingNarration.tsx`, `apps/web/app/[site]/preview/`, `supabase/migrations/00X_sites.sql`.
**External actions:** Anthropic API key in `.env.local`.

### Sprint 5 — More site components
Implements the remaining 14 demo components (`PROJECT_SPEC.md` §6.1): Row, Column, Button, Logo, NavBar, Footer, HeroBanner, PropertyCard, UnitCard, Repeater (shell, no data binding yet), InputField, Form (shell), MapEmbed, Gallery. Each gets `index.tsx`, an `EditPanel.tsx` skeleton, and a `SPEC.md`. Registry wired so the renderer can render any component type.

**Owned:** `apps/web/components/site-components/{14 dirs}/`, `apps/web/components/site-components/registry.ts`.

### Sprint 6 — Element 2 layout shell
Builds the editor at `/[site]/edit`: top bar (logo, site name, page selector, preview toggle, deploy), four-tab left sidebar (Site, Pages, Add, Data), right-sidebar shell, canvas that renders the current page using the shared renderer in edit mode. Selection model wired via Zustand. The Add tab shows static (non-draggable) component cards.

**Owned:** `apps/web/app/[site]/edit/`, `apps/web/components/editor/`, `apps/web/lib/editor-state/`.

### Sprint 7 — Drag-and-drop
Wires `dnd-kit`. Drag from Add tab to canvas with valid drop zones (per children policy from each component's SPEC.md). Reorder via drag within parent. Resize column span and height via handles.

**Owned:** `apps/web/components/editor/canvas/dnd/`, resize handle code in renderer wrappers.
**Parallel with:** Sprint 8, Sprint 10 (with the merge-order caveat above).

### Sprint 8 — Element edit mode (manual)
Right-click on a selected component swaps the left sidebar to Element Edit mode with Content / Style / Animation / Visibility / Advanced tabs. Wires shared style controls (`PROJECT_SPEC.md` §6.4) for every component, plus component-specific Content panels for Heading, Paragraph, Button, Image, NavBar, Footer.

**Owned:** `apps/web/components/editor/edit-panels/`, `apps/web/components/site-components/*/EditPanel.tsx` (filled in for the listed components).
**Parallel with:** Sprint 7, Sprint 10.

### Sprint 9 — Repeaters and filters
Implements the full Repeater EditPanel: data source dropdown, `react-querybuilder` filter, Connected Inputs UI, sort, limit, empty state. RM field tokens (`{{ row.unit_name }}`, `{{ row.current_market_rent | money }}`) resolve in renderer. PropertyCard and UnitCard support binding. Uses TanStack Query for server-state caching.

**Owned:** `apps/web/components/site-components/Repeater/EditPanel.tsx` (full), `apps/web/lib/site-config/data-binding/`, integration code in renderer.
**Depends on:** Sprint 5 (Repeater shell) + Sprint 8 (edit panel infra).

### Sprint 10 — Forms + submissions
Adds the `form_submissions` table, the `/api/form-submissions` endpoint, the Form component's full EditPanel (with Form Name + success message), and the Data tab's submission list + table modal in the editor sidebar.

**Owned:** `apps/web/app/api/form-submissions/`, `apps/web/components/site-components/Form/EditPanel.tsx`, `apps/web/components/editor/sidebar/data-tab/`, `supabase/migrations/00X_form_submissions.sql`.
**Parallel with:** Sprint 7, Sprint 8 (after Sprint 6).

### Sprint 11 — AI Edit (right sidebar)
Implements all Tier 1 + Tier 2 operations from `PROJECT_SPEC.md` §9.4 in `lib/site-config/ops.ts`. Adds `/api/ai-edit` with the system prompt described in §9.3. Builds the right-sidebar chat UI with selection chip, suggested prompts, accept/discard flow, clarification flow, error handling per §9.6.

**Owned:** `apps/web/app/api/ai-edit/`, `apps/web/lib/ai/prompts/ai-edit.ts`, `apps/web/lib/site-config/ops.ts`, `apps/web/components/editor/ai-chat/`.

### Sprint 12 — Element 1 adjustment chat
Reuses `/api/ai-edit` from the Element 1 preview's "Request adjustments" chat. Iframe re-loads on accept. Wires image attach.

**Owned:** `apps/web/components/setup-form/AdjustmentChat.tsx`, integration in `PreviewPanel.tsx`.
**Parallel with:** Sprint 13.

### Sprint 13 — Deploy + Element 3
Adds the Deploy button + confirmation modal, the `/api/sites/[id]/deploy` endpoint that snapshots the working version with `is_deployed=true`, the public route `/[site]` that renders the deployed version (RSC where possible), and the "Live at..." toast with copy.

**Owned:** `apps/web/app/api/sites/[id]/deploy/`, `apps/web/app/[site]/page.tsx`, `apps/web/components/editor/top-bar/DeployButton.tsx`.
**External actions:** create Vercel project, deploy app to Vercel, set production env vars (Anthropic key, Supabase keys).

### Sprint 14 — Demo fallback fixtures
Adds the `demo_fixtures` table and the silent fallback path in both AI endpoints. Pre-records 2–3 fixtures for the canonical demo prompts. Adds a `pnpm record-fixtures` script and a dev-mode `[live]` / `[fixture]` indicator.

**Owned:** `supabase/migrations/00X_demo_fixtures.sql`, `apps/web/lib/ai/fixtures.ts`, additions to AI endpoints.

### Sprint 15 — Polish + demo prep
Tunes all loading narration and error copy, verifies all 10 animation presets across components, reverifies seed end-to-end, and writes the Playwright E2E test that runs the full demo flow (`PROJECT_SPEC.md` §13.2). Performance pass: initial page load < 3s, AI response handling < 20s.

**Owned:** copy edits across many files, `e2e/demo-flow.spec.ts`, perf-related changes.

---

## 3. Recommended execution order (sequential, single-developer)

If you are running one Claude Code session at a time (recommended for a single developer):

`0 → 1 → 3 → 2 → 5 → 4 → 6 → 8 → 7 → 10 → 9 → 11 → 13 → 12 → 14 → 15`

Why this order rather than strictly numerical:

- Sprint 3 before Sprint 2: the schema and renderer are the spine; the form needs nothing from them, so getting them done first reduces rework risk if the schema changes.
- Sprint 5 before Sprint 4: more components in the registry → richer initial generations from Claude.
- Sprint 8 before Sprint 7: an editor with manual edit panels but no DnD is more useful for testing than an editor with DnD but no panels. (Sprint 7 then completes the editor.)
- Sprint 13 before Sprint 12: deploy is the harder lift; lock it in early.

If you are running parallel Claude Code sessions across worktrees, follow the dependency graph in §1.

---

## 4. Merge order (binding)

Merge sprint branches in the order they were *planned*, not the order they finish. After each merge, run the full quality-gate suite (`pnpm test && pnpm build && pnpm biome check`) and the most recently completed sprint's smoke test. If a downstream in-flight sprint conflicts after a merge, that sprint **rebases** before continuing. Never merge a sprint that hasn't passed its own quality gates.

---

## 5. Cross-sprint risk register

| Risk | Sprints affected | Mitigation |
|---|---|---|
| `SiteConfig` schema change after Sprint 3 | All later sprints | Lock the schema in Sprint 3. Any change after that requires a `DECISIONS.md` entry and rebases of in-flight sprints. |
| Anthropic API failure during demo | 4, 11, 14 | Sprint 14 ships the silent fallback fixtures. Verified in Sprint 15 E2E. |
| Supabase migration ordering conflicts | 1, 4, 10, 14 | Migrations are timestamp-prefixed. Each sprint owns its own migration file. Never edit an old migration. |
| `dnd-kit` + Framer Motion interaction quirks | 7 | Sprint 7 declares the risk explicitly. Falls back to non-animated drop zones if conflicts arise. |
| RM field token resolution edge cases (nested fields, formatters) | 9 | Sprint 9 includes a handcrafted token-resolver test suite. |
| Repeater re-renders thrashing on every input change | 9 | Sprint 9 uses TanStack Query with debounced query keys. |
| Editor canvas performance with > 40 components | 6, 7, 15 | Renderer is memoized in Sprint 3; Sprint 15 includes a perf pass. |
| Public site SEO (no JS by default) | 13 | Sprint 13 uses RSC where possible for the public renderer. |

---

## 6. What "done" means for the whole project

The project is done when:

1. All 16 sprints are merged and their quality gates pass on `main`.
2. The Playwright E2E test from Sprint 15 runs the full demo flow (`PROJECT_SPEC.md` §13.2) end-to-end without intervention.
3. `pnpm build` succeeds with zero TypeScript errors and zero warnings.
4. The app is deployed on Vercel and the demo URL responds with the deployed Aurora site.
5. `DECISIONS.md` is up to date with every approved deviation logged.

---

*End of SPRINT_SCHEDULE.md.*