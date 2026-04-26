# CLAUDE.md — Sprint 10: Forms + submissions

> Drop this file at the repo root of `WTSZurWay/` for the duration of
> Sprint 10, replacing the master `CLAUDE.md`. Restore the master
> `CLAUDE.md` after the sprint's quality gates pass and the Sprint
> Completion Report has been emitted. Per the 2026-04-25 entry in
> `DECISIONS.md`, this project uses a single-branch workflow on
> `master` — there is no `sprint/10` branch. Every commit lands on
> `master` after the quality gates pass. Hosted Supabase is in use
> (no Docker, no local Postgres). The Anthropic API key already in
> `.env.local` is unused this sprint — Sprint 10 ships zero AI calls.

## Mission

Wire **form submissions end-to-end**: the public-facing `Form`
component actually POSTs to a real HTTP endpoint, the endpoint persists
to a real `form_submissions` table, and the editor's left-sidebar
**Data tab** lists the submissions per `form_id` with a clickable table
view. This is the entirety of `PROJECT_SPEC.md` §8.10. The sprint also
ships the Form's full **EditPanel** so users can configure `formName`
and `successMessage` from the Element-2 element-edit flow Sprint 8 made
available. After this sprint, a property manager can drop a Form into
the canvas, name it, drop in InputFields and a submit Button, deploy
(future-Sprint-13), receive submissions on the public site, and read
them back in the editor's Data tab.

This sprint **does not** ship: any AI features (Sprint 11), Element 1's
adjustment chat (Sprint 12), the public route or Deploy flow (Sprint 13),
demo fallback fixtures (Sprint 14), or anything in the Repeater data
binding pipeline (Sprint 9). Sprint 9 may run in parallel with this
sprint per the dependency graph in `SPRINT_SCHEDULE.md` §1; their owned
paths are disjoint. Sprint 10's surface is intentionally narrow: forms,
submissions, the data tab.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" below, run these eight checks. If any fails,
STOP and emit a Deviation Report per the protocol embedded in this
file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and emit
   a Deviation Report — do NOT create a `sprint/10` branch and do NOT
   switch branches.

2. **Sprints 5, 5b, 6 merged.** Verify by `git ls-files` that all of
   these exist:
   - `apps/web/components/site-components/Form/index.tsx`
   - `apps/web/components/site-components/Form/SPEC.md`
   - `apps/web/components/site-components/Form/EditPanel.tsx` (the
     Sprint-5 placeholder)
   - `apps/web/components/site-components/InputField/index.tsx`
   - `apps/web/components/editor/sidebar/data-tab/DataTab.tsx` (the
     Sprint-6 placeholder)
   - `apps/web/components/editor/sidebar/LeftSidebar.tsx`
   - `apps/web/lib/editor-state/store.ts`
   - `apps/web/components/ui/dialog.tsx`
   - `apps/web/components/ui/button.tsx`
   - `apps/web/components/ui/input.tsx`
   If any is missing, STOP — Sprint 10's pre-conditions are not met.

3. **Hosted Supabase is linked.** Run `supabase status --linked` (or
   inspect `supabase/.temp/project-ref` if present). The output must
   show a non-empty linked project ref. If not, STOP — the user must
   run `supabase link --project-ref <ref>` first.

4. **Existing migrations succeed against the linked project.** Verify
   the `sites`, `site_versions`, and `rm_*` tables already exist in
   the linked project (the user has run `pnpm db:push` for prior
   sprints). Run `supabase db diff --linked --schema public` and
   confirm there are no unexpected drifts. If the diff shows local
   migrations the linked project doesn't have, STOP and ask the user
   to run `pnpm db:push`.

5. **Sprint-5 Form invariants are still in place.** Open
   `apps/web/components/site-components/Form/index.tsx` and confirm
   the file currently contains `event.preventDefault()` in its
   `handleSubmit` and does NOT contain `/api/form-submissions` or
   `fetch(`. (Sprint 10 is about to break both invariants on purpose
   — the SPEC's "Sprint 5 invariants" block is a hand-off marker, not
   a permanent rule.)

6. **The Form-related test suite passes today.** Run
   `pnpm test --filter=apps/web -- Form` (or the project's equivalent)
   and confirm the Sprint-5 Form tests are green BEFORE this sprint
   starts. Sprint 10 will modify two of these tests (the
   no-`/api/form-submissions`-substring test and the
   no-`fetch(`-substring test) — they're the explicit hand-off
   markers and dropping them in this sprint is sanctioned by the
   Sprint 5 SPEC.

7. **The Sprint 6 placeholder copy in DataTab matches what
   `placeholders.test.tsx` asserts.** Open
   `apps/web/components/editor/__tests__/placeholders.test.tsx` and
   confirm the test "Data tab renders the Sprint 10 placeholder copy"
   exists. Sprint 10 will delete that one test (the placeholder it
   targets is being replaced). The other two assertions in that file
   (RightSidebar / DeployButton) MUST remain unchanged.

8. **No competing Sprint-10 work in flight.** `git log -- supabase/`
   should NOT show any unmerged Sprint-10-named migration. Same for
   `apps/web/app/api/form-submissions/`. If a partial Sprint-10
   commit exists, STOP and ask the user.

If all eight checks pass, proceed. If any fails, emit a Deviation
Report and wait.

## Spec sections in scope

- `PROJECT_SPEC.md` §8.10 — Forms and submissions (the canonical
  contract for this sprint).
- `PROJECT_SPEC.md` §8.3 (Data subsection) — what the Data tab shows.
- `PROJECT_SPEC.md` §8.4 — element edit panel structure (the Form's
  EditPanel plugs into the Sprint-8 ContentTabHost).
- `PROJECT_SPEC.md` §8.11 — Preview mode behavior: "Forms are
  functional (they actually submit)." This is what differentiates
  edit vs. preview submission behavior.
- `PROJECT_SPEC.md` §12 — Database schema. The `form_submissions`
  table DDL is verbatim authoritative.
- `PROJECT_SPEC.md` §15 — Coding standards (entire section, copied
  into "Coding standards (binding)" below).
- `PROJECT_SPEC.md` §17 — Out of Scope: "Email-on-form-submission
  notifications." Sprint 10 MUST NOT add email/SMS/webhook
  notifications. Storing the submission row is the entire deliverable.

## File scope

### You may create or modify (the "Owned" list — Sprint 10 territory)

- `supabase/migrations/20260426000010_create_form_submissions.sql`
  (new) — creates the table per §12 verbatim, plus indexes and an
  RLS policy mirroring the existing `*_demo_full_access` pattern.
- `apps/web/types/database.ts` (modify only — add the
  `form_submissions` table to the hand-authored `Database` type;
  do NOT touch any existing table). Sprint-4 set the precedent for
  hand-authoring this file alongside its own migrations.
- `apps/web/app/api/form-submissions/route.ts` (new) — handles POST
  (anonymous submission) and GET (editor-only listing).
- `apps/web/app/api/form-submissions/__tests__/route.test.ts` (new).
- `apps/web/components/site-components/Form/index.tsx` (modify) —
  replace the Sprint-5 `event.preventDefault()`-only handler with a
  real submission flow. The Sprint 5 SPEC.md explicitly authorizes
  this hand-off ("Sprint 10 will replace the handler...").
- `apps/web/components/site-components/Form/SPEC.md` (modify) —
  rewrite to reflect Sprint-10 behavior; remove the "Sprint 5
  invariants" block.
- `apps/web/components/site-components/Form/__tests__/Form.test.tsx`
  (modify) — keep the existing render/cssStyle tests; remove the two
  hand-off assertion tests (`MUST NOT contain "/api/form-submissions"`
  and `MUST NOT call fetch`); add new tests for submission behavior,
  edit-mode no-op, success message, and error handling.
- `apps/web/components/site-components/Form/EditPanel.tsx` (modify) —
  replace the Sprint-5 placeholder with a real EditPanel for
  `formName` and `successMessage`.
- `apps/web/components/site-components/Form/__tests__/EditPanel.test.tsx`
  (new).
- `apps/web/components/editor/sidebar/data-tab/DataTab.tsx` (modify) —
  replace the Sprint-6 placeholder with the real list UI.
- `apps/web/components/editor/sidebar/data-tab/SubmissionsModal.tsx`
  (new) — the table modal.
- `apps/web/components/editor/sidebar/data-tab/useSubmissionsList.ts`
  (new) — the hook that fetches `{ formId, count }[]` for the current
  site.
- `apps/web/components/editor/sidebar/data-tab/useSubmissionsRows.ts`
  (new) — the hook that fetches rows for one formId.
- `apps/web/components/editor/sidebar/data-tab/__tests__/DataTab.test.tsx`
  (new).
- `apps/web/components/editor/sidebar/data-tab/__tests__/SubmissionsModal.test.tsx`
  (new).
- `apps/web/components/editor/__tests__/placeholders.test.tsx` (modify
  — surgical: delete only the "Data tab renders the Sprint 10
  placeholder copy" test; the RightSidebar and DeployButton
  assertions stay).
- `apps/web/components/editor/index.ts` (modify only if needed for
  re-exporting the new SubmissionsModal; keep edits minimal — one
  added export line max).

### You may read but NOT modify

- `PROJECT_SPEC.md`
- `DECISIONS.md` (append-only — see below)
- `apps/web/lib/supabase/{browser,server,service,index}.ts`
- `apps/web/lib/site-config/schema.ts` (the SiteConfig schema is
  locked; this sprint adds NO new fields)
- `apps/web/lib/editor-state/store.ts` and the rest of
  `apps/web/lib/editor-state/` (the Data tab reads `siteId` /
  `siteSlug` / `currentPageSlug` from the store; it does not write
  to it)
- `apps/web/components/renderer/{Renderer,ComponentRenderer,EditModeWrapper}.tsx`
- `apps/web/components/site-components/InputField/index.tsx` (its
  `name` attribute is already what FormData reads; no change needed)
- `apps/web/components/site-components/registry.ts` (no registry
  edits — Form is already registered)
- `apps/web/components/ui/{button,dialog,input,label,sonner,badge}.tsx`
  (existing shadcn primitives — Sprint 10 composes them)
- `apps/web/components/editor/edit-panels/controls/{TextInput,SwitchInput,SelectInput}.tsx`
  (existing Sprint-8 inputs the EditPanel composes)
- All `rm_*` and `sites` / `site_versions` migrations
- `biome.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`

### You MUST NOT modify

- Any file outside the "may create or modify" list above.
- `PROJECT_SPEC.md` (raise concerns via Deviation).
- Existing entries in `DECISIONS.md` (append-only — new entries land at
  the bottom, only if you have an approved deviation).
- Any other migration file. Edit nothing under `supabase/migrations/`
  except the new `20260426000010_create_form_submissions.sql`.
- The SiteConfig schema (`apps/web/lib/site-config/schema.ts`).
- The renderer (`apps/web/components/renderer/`).
- The editor state store (`apps/web/lib/editor-state/`).
- The InputField component (its existing `name` attribute is the
  contract Sprint 10 consumes — touching it is a Deviation).
- Any other site component besides `Form/`.
- Any other API route.
- Any other editor sidebar tab (Site / Pages / Add).
- The setup form / Element 1 (`apps/web/components/setup-form/`).
- `package.json` — Sprint 10 adds NO new dependencies. If you find
  yourself wanting one, file a Deviation.

## Definition of Done

- [ ] **Migration applied and types regenerated.** The new SQL file
  `supabase/migrations/20260426000010_create_form_submissions.sql`
  exists, runs cleanly via `pnpm db:push` against the linked Supabase
  project (User Action), and creates a `form_submissions` table whose
  columns match `PROJECT_SPEC.md` §12 verbatim:
  `id (bigserial pk)`, `site_id (uuid fk → sites.id)`, `form_id (text not null)`,
  `page_slug (text)`, `submitted_data (jsonb not null)`, `submitter_ip (text)`,
  `user_agent (text)`, `created_at (timestamptz default now())`.
  RLS is enabled with a single permissive policy
  `"form_submissions demo full access"` (USING true / WITH CHECK true)
  matching the existing pattern. An index on `(site_id, form_id)`
  exists to keep the Data tab's `count(*) group by form_id` query
  cheap. `apps/web/types/database.ts` is updated with the new table
  (only this addition; no other table edits).

- [ ] **`POST /api/form-submissions` accepts a valid payload and
  inserts a row.** The request body is validated by a Zod schema:
```ts
  z.object({
    siteSlug: z.string().min(1),
    formId: z.string().min(1),
    pageSlug: z.string().min(1).nullable().optional(),
    submittedData: z.record(z.string(), z.string()),
  })
```
  The handler resolves `siteSlug → siteId` via a `sites` lookup, then
  inserts into `form_submissions` with `site_id`, `form_id` (from
  `formId`), `page_slug` (from `pageSlug` or null), `submitted_data`
  (from `submittedData`), `submitter_ip` (from
  `request.headers.get('x-forwarded-for')` first segment, falling back
  to `'x-real-ip'`, then `null`), `user_agent` (from
  `request.headers.get('user-agent')`), and a server-generated
  `created_at`. On success returns `201` with JSON
  `{ id: number, createdAt: string }`. The route declares
  `runtime = "nodejs"` and `dynamic = "force-dynamic"`, mirroring the
  existing `/api/sites/[siteId]/working-version/route.ts` precedent.

- [ ] **`POST /api/form-submissions` rejects invalid payloads with
  precise errors.** Body that is not valid JSON → `400` with
  `{ category: "validation_error", message: "Request body is not valid JSON." }`.
  Body that fails Zod → `400` with
  `{ category: "validation_error", message: "Submission payload failed validation.", details: ZodIssue[] }`.
  `siteSlug` not found in `sites` → `404` with
  `{ category: "not_found", message: "Site not found." }`. Database
  error during insert → `500` with
  `{ category: "server_error", message: "<the postgres message>" }`.
  No stack traces leak; no service-role key leaks.

- [ ] **`GET /api/form-submissions?siteId=<uuid>` returns the
  per-form aggregate list for the editor.** Response: `200` with JSON
  `{ forms: Array<{ formId: string; count: number }> }`, sorted by
  `count` descending then `formId` ascending. Missing or malformed
  `siteId` → `400` validation error. Unknown `siteId` returns `200`
  with `{ forms: [] }` (no error — empty is valid).

- [ ] **`GET /api/form-submissions?siteId=<uuid>&formId=<text>`
  returns the rows table for one form.** Response: `200` with JSON
  `{ submissions: Array<{ id: number; pageSlug: string | null; submittedData: Record<string, string>; createdAt: string }> }`,
  sorted by `created_at` descending, capped at 200 rows. Missing
  either query param → `400`. The endpoint uses the service-role
  client (auth is a placeholder per §17).

- [ ] **`Form/index.tsx` submits to the endpoint when the page is in
  preview or public context, and is a no-op in edit context.** The
  Form's `handleSubmit`:
  1. Always calls `event.preventDefault()` so the browser never
     navigates.
  2. Reads `window.location.pathname` and detects whether the path's
     second segment is exactly `"edit"`. If so, returns immediately.
  3. Otherwise, parses `siteSlug` from the path's first segment,
     `pageSlug` from `URLSearchParams(window.location.search).get("page")`
     (defaulting to `"home"`) for `/preview` paths, or from the path
     segments after the slug for non-preview paths. (For Sprint 10,
     the only non-edit non-preview path that a Form can ride on is
     the `/dev/components` fixture; Sprint 13 introduces the real
     public route and Sprint 9b adds detail pages — both are
     downstream and inherit this same convention.)
  4. Reads `formName` from `node.props.formName`. Empty / missing →
     bail with a console warning; do not POST.
  5. Reads submitted values via `new FormData(event.currentTarget)`
     then `Object.fromEntries(...)`, coerced to a
     `Record<string, string>` (multi-value fields are joined with
     `, ` — `URLSearchParams`-equivalent behavior is overkill for
     the demo; document the simplification in the SPEC).
  6. POSTs to `/api/form-submissions` with the JSON payload. On
     `2xx`, swaps the form's children for a confirmation node
     showing `successMessage` (default `"Thank you."`). On non-2xx,
     shows an inline error message under the form.
  The Form is still a `"use client"` component (it already is). It
  uses `useState` for the post-submission state. It does NOT pull in
  any new dependency.

- [ ] **`Form/SPEC.md` reflects the new behavior.** The "Sprint 5
  invariants" block is removed and replaced with a "Sprint 10
  behavior" block documenting the submission flow, the route check,
  the FormData coercion, and the success/error states.

- [ ] **`Form/EditPanel.tsx` exposes `formName` (required) and
  `successMessage`.** Composes existing Sprint-8 controls
  (`TextInput`) — no new control primitives. Writes via
  `useEditorStore((s) => s.setComponentProps)`. Empty `formName` is
  permitted in the editor (the user is mid-typing) but the inline
  helper text reads `"Required for submissions to be saved."` when
  empty. The `submitLabel` field from the Sprint-5 props schema is
  intentionally NOT exposed in this EditPanel (the user adds a child
  Button with `buttonType: "submit"` instead) — the prop remains in
  the schema for backwards compatibility but is no longer authored
  via the EditPanel. A single line of help copy under the Form
  EditPanel reads `"Drop an InputField for each value you want to
  collect, then a Button with type Submit at the bottom."`.

- [ ] **The Data tab in the left sidebar lists submissions for the
  current site.** When the editor is mounted at `/{slug}/edit` and
  the user clicks the Data tab, the tab fetches
  `GET /api/form-submissions?siteId={siteId}` (siteId from the
  editor store) and renders one row per `{ formId, count }` entry.
  Empty state: `"No form submissions yet. Drop a Form, name it, and
  publish to start collecting."`. Loading state: a single skeleton
  row. Error state: `"Couldn't load submissions. Retry."` with a
  retry button that re-runs the fetch.

- [ ] **Clicking a row opens a modal with the submissions table.**
  Modal title: `Submissions: {formId}`. Body: a `<table>` whose
  columns are the union of keys across all returned `submitted_data`
  rows, in the order they first appear, with a leading `Submitted at`
  column showing `created_at` formatted as
  `Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })`.
  Empty cells render as `—`. The modal is the existing shadcn
  `Dialog` primitive — no `AlertDialog` is needed (per the precedent
  in `DECISIONS.md` 2026-04-25 Sprint 6: AlertDialog is not
  installed; compose Dialog instead).

- [ ] **The Sprint-6 placeholder test in
  `apps/web/components/editor/__tests__/placeholders.test.tsx` is
  surgically removed.** Only the test
  `"Data tab renders the Sprint 10 placeholder copy"` is deleted; the
  other two tests (RightSidebar Sprint-11 placeholder, DeployButton
  toast) remain unchanged. The deletion is the only edit to that
  file.

- [ ] **Test coverage is robust and honest.** ≥ 25 new Vitest tests
  spanning the API route (≥ 12 — happy path, all four POST error
  branches, both GET branches, GET 400s, IP/user-agent header
  fallback, JSON parse failure, multi-value FormData coercion), the
  Form component (≥ 6 — submits in non-edit path, no-ops in edit
  path, success message swap, error inline render, malformed
  formName guard, sends correct JSON shape), the Form EditPanel
  (≥ 3), the DataTab list (≥ 4 — empty / loading / data / error),
  and the SubmissionsModal (≥ 3). Each test asserts exactly one
  observable thing. No `.skip`, no `.only`, no `console.log`. Mocks
  for the supabase service client follow the
  `apps/web/app/api/sites/[siteId]/working-version/__tests__/route.test.ts`
  pattern.

- [ ] **No `any`, no `@ts-ignore`, no `as any`.** When narrowing the
  submitted-data record, branch via `typeof v === "string"` and
  coerce non-strings via `String(v)` (for FormData numeric inputs).
  Use `unknown` for raw JSON bodies, then narrow via Zod.

- [ ] **No new dependencies.** The route uses `zod` (already
  installed). The Form uses `useState` / `useEffect` from React (the
  component is already a client component). The Data tab uses
  `useEffect` for fetching — no TanStack Query in this sprint
  (Sprint 9 introduces it; Sprint 10 sticks with native fetch +
  `useState`). If you find yourself reaching for a new dep, file a
  Deviation.

- [ ] **Quality gates pass.** `pnpm test` — zero failures, zero
  skipped. `pnpm build` — zero TypeScript errors, zero warnings.
  `pnpm biome check` — zero warnings. The manual smoke test (next
  section) passes on a fresh `pnpm dev` after the user runs
  `pnpm db:push` and `pnpm db:types`.

- [ ] **`DECISIONS.md` updated only if a deviation was approved
  during this sprint.** If no deviations were approved, write
  `"None"` in the Sprint Completion Report's Deviations field.

## Manual smoke test (numbered, click-by-click)

> Pre-requisites the user must complete before running this test:
> (a) `pnpm db:push` against the linked Supabase project to apply
>     `20260426000010_create_form_submissions.sql`,
> (b) `pnpm db:types` to refresh `apps/web/types/database.ts` (or
>     trust the hand-authored update Sprint 10 committed),
> (c) An Aurora-like seeded site (`pnpm seed`) and a Sprint-4 initial
>     generation already run, so a working version exists.

1. From the repo root run `pnpm dev` and wait for Next.js to be ready.
2. In a fresh incognito browser, open
   `http://localhost:3000/aurora-cincy/edit`.
3. Wait for the editor to load. Confirm the canvas shows the seeded
   home page, the four-tab left sidebar with the **Pages** tab active
   by default, and the SaveIndicator reading `Saved Xs ago` or
   `Ready`.
4. Click the **Data** tab in the left sidebar. The tab should switch
   without errors and show the empty-state copy
   `"No form submissions yet. Drop a Form, name it, and publish to
   start collecting."`.
5. Click the **Add** tab. Drag a **Form** card onto the canvas (e.g.
   into the page-root Section). Release. The new Form appears as a
   selected node.
6. Right-click the Form. The left sidebar swaps to Element Edit mode
   with the Form's Content tab visible. The panel title reads
   `Form`.
7. In the Content tab, type `contact_us` into the **Form Name**
   field. The SaveIndicator briefly reads `Saving…` and then
   `Saved Xs ago`.
8. Type `Thanks — we'll be in touch.` into the **Success Message**
   field. SaveIndicator confirms the save.
9. Click the back arrow on the Element Edit panel to return to the
   primary sidebar. Click the **Add** tab.
10. Drag an **InputField** onto the Form's drop zone. Right-click it,
    set its `name` to `email` and `inputType` to `email`. Back out.
11. Drag a **Button** into the Form (after the InputField).
    Right-click it, set its `label` to `Send` and its `buttonType`
    to `submit`. Back out.
12. In the top bar, click the **Preview Toggle** to switch to preview
    mode. The selection chrome and drop zones disappear. The canvas
    shows the Form rendered cleanly.
13. Click into the email field, type `someone@example.com`, then
    click **Send**.
14. Confirm the form swaps to the success state showing
    `Thanks — we'll be in touch.`. There is no page navigation; the
    URL stays at `/aurora-cincy/edit` (with whatever query string the
    preview toggle added). Open the browser devtools Network tab and
    confirm a `POST /api/form-submissions` returned `201`.
15. Click the **Preview Toggle** again to return to edit mode. Click
    the **Data** tab. The tab should now show one row:
    `contact_us — 1 submission`. The empty-state copy is gone.
16. Click the `contact_us` row. A modal opens titled
    `Submissions: contact_us`. The table has two columns:
    `Submitted at` (a localized timestamp) and `email` (the value
    `someone@example.com`). Close the modal with the X.
17. Switch the URL to `http://localhost:3000/aurora-cincy/edit` (a
    second tab is fine). Repeat steps 12–14 with two more
    submissions: `a@a.com` and `b@b.com`.
18. Return to the editor's Data tab. The row now reads
    `contact_us — 3 submissions`. Click it. The modal lists three
    rows in reverse chronological order. The most recent row is at
    the top.
19. From a separate terminal, run
    `curl -X POST http://localhost:3000/api/form-submissions
      -H "content-type: application/json"
      -d '{"siteSlug":"aurora-cincy","formId":"contact_us","pageSlug":"home","submittedData":{"email":"curl@example.com"}}'`.
    Confirm the response is a JSON object with `id` and `createdAt`,
    and the response status is `201`.
20. From the same terminal, run
    `curl -X POST http://localhost:3000/api/form-submissions
      -H "content-type: application/json" -d '{}'`.
    Confirm `400` with a `validation_error` body.
21. Run
    `curl -X POST http://localhost:3000/api/form-submissions
      -H "content-type: application/json"
      -d '{"siteSlug":"no-such-site","formId":"x","submittedData":{}}'`.
    Confirm `404` with a `not_found` body.
22. Refresh the Data tab. The row count is now `4`. Click into the
    modal. The `curl@example.com` row is at the top.

If any step fails, treat it as a Deviation per §15.7. Do not commit.

## Coding standards (binding)

### TypeScript (PROJECT_SPEC.md §15.1)

- `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitAny: true`. No `any`. If you reach for it, use
  `unknown` and narrow.
- Prefer types over interfaces unless extending.
- DB rows: define explicit row types at the boundary; translate
  `snake_case` columns to `camelCase` fields once, in the API
  route's mapper. Do not let `snake_case` leak into client code.

### React (§15.2)

- Server components by default. `"use client"` only where needed
  (the EditPanel, DataTab, SubmissionsModal, and Form are all
  client; the API route is server).
- One component per file. File name = export name.
- Use `cn(...)` for class merging.
- No prop drilling deeper than two levels — the Data tab reads
  `siteId` and `siteSlug` directly from `useEditorStore`.

### Naming (§15.3)

- Files: `kebab-case.tsx` for components, `camelCase.ts` for hooks
  matching the existing project pattern (`useAutosave.ts`,
  `useSubmissionsList.ts`).
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- DB tables / columns: `snake_case`.
- TypeScript fields: `camelCase` — translate at the route boundary.

### Commits (§15.4)

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`. One concern per commit. If a commit message has
  "and" in it, split it.

### Testing (§15.5)

- Tests live next to the file under `__tests__/${name}.test.tsx`.
- Vitest + Testing Library. Reset the editor store between cases
  via `__resetEditorStoreForTests()` (already exported).
- For the Form component test, use the existing pattern from
  `Form.test.tsx` and override `window.location` per case via
  `window.history.pushState`.
- Mock the route's supabase client per the
  `working-version/__tests__/route.test.ts` precedent.

### Comments (§15.6)

- Comment *why*, not *what*. Code says what.
- TODO comments must include an owner: `// TODO(max): ...`.
- No commented-out code in committed files.

### Quality gates (§15.7) — all must pass with zero failures and zero warnings

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above

### Retroactive cross-sprint cleanup (§15.9)

If a pre-existing test or config issue (NOT runtime code in another
sprint's domain) blocks Sprint 10's quality gates, you may apply a
minimal, behavior-preserving fix per §15.9. Log every such fix in
the Sprint Completion Report's "Retroactive cross-sprint fixes"
subsection AND in `DECISIONS.md`. If the fix would touch >5 lines
or change runtime behavior, escalate via the Deviation Protocol.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of
the plan cannot be implemented exactly as written, you MUST stop and
emit a Deviation Report in the format below. You MUST NOT proceed
with an alternative until the user has explicitly approved it with
the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries,
impossible function signatures, scope additions, file additions
outside the declared scope, test plans that cannot be executed as
written, and any case where you catch yourself thinking "I'll just
do it slightly differently."

### Deviation Report (emit verbatim)

```
🛑 DEVIATION DETECTED

Sprint: Sprint 10 — Forms + submissions
Failed DoD item: [The exact bullet from Definition of Done that this blocks]

What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]

Why it's not working (1–2 sentences, technical):
[Brief technical reason.]

Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]

Trade-offs:
- Gain: [What we get]
- Lose: [What we give up]
- Risk:  [What might break]

Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]

Awaiting approval to proceed. Reply "Approved" to continue, or
describe a different direction.
```

After emitting the report, STOP. Do not write code. Do not edit
files. Wait.

### Approval handling

- "Approved" → implement the proposed alternative as written.
- "Approved with changes: [...]" → implement with the user's
  modifications.
- "Rejected — [direction]" → discard the proposal; follow the new
  direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not
  assume.

After any approved deviation, append an entry to `/DECISIONS.md`
with date, sprint, what was changed, and the user's approval message
verbatim.

## Useful local commands

- `pnpm dev` — local dev server at http://localhost:3000
- `pnpm test` — Vitest (one shot)
- `pnpm test --watch` — Vitest watch mode while developing
- `pnpm test -- form-submissions` — run only this sprint's tests
- `pnpm build` — Next.js production build (zero TS errors expected)
- `pnpm biome check` — lint + format (zero warnings expected)
- `pnpm db:push` — apply local migrations to the linked hosted
  Supabase project (User Action after Sprint 10 commits the new SQL)
- `pnpm db:types` — regenerate `apps/web/types/database.ts` from the
  linked project (User Action; Sprint 10 also hand-authors the
  addition to keep `pnpm build` green before the user runs db:types)
- `pnpm seed` — re-seed Supabase mock data
- `pnpm db:reset` — reset local Supabase (irrelevant — we use hosted)

## Notes & hints (non-binding)

- **Migration timestamp.** The next available timestamp is
  `20260426000010` (the prior batch ends at `20260425000007` for the
  sites tables). Don't pick anything earlier — Supabase rejects
  out-of-order migrations once `pnpm db:push` runs.
- **`apps/web/types/database.ts` is hand-authored.** The file's
  header comment says "Hand-written equivalent of `supabase gen types
  typescript --linked`." Sprint 4 set this precedent. Add the
  `form_submissions` table at the bottom of the `Tables` block,
  matching the existing `rm_company` / `sites` style. Do not run
  `supabase gen types` and overwrite the file — that would clobber
  Sprint 4's hand-authored shape.
- **Edit-mode submission detection.** The cleanest way for the Form
  to detect edit mode is `window.location.pathname.split("/")[2] ===
  "edit"`. Don't reach for context — we don't have a Renderer-level
  mode context, and adding one is Sprint 3 / Sprint 6 territory.
  Document the choice in a one-line comment.
- **FormData coercion.** `Object.fromEntries(new FormData(form))`
  works but `FormData.get` returns `string | File`. Cast to string
  via `String(v)` and skip File values explicitly with a
  `if (v instanceof File) continue;` — files aren't part of the
  spec for the demo (per §17 there's no file upload requirement).
- **Submissions modal column derivation.** `Object.keys` over the
  array of `submittedData` records, preserving first-seen order via
  a `Set`. Cap at 12 visible columns; if the user has more keys,
  collapse the trailing ones into a single `Other` cell rendering
  the JSON. (Demo data won't hit this cap; the cap is paranoid
  formatting protection.)
- **Performance.** The DataTab fetches once on mount and again only
  on the user clicking the retry button or re-mounting the tab.
  Don't add polling; it's not required and would mask bugs.
- **No TanStack Query.** Sprint 9 introduces it. Sprint 10 uses
  vanilla `fetch` + `useState` + `useEffect`. Adding TanStack Query
  here is a Deviation.
- **Site_versions does not change.** This sprint does NOT save
  anything to `site_versions` directly — the Sprint-6 autosave loop
  takes care of any Form prop changes via the existing PATCH
  pipeline. Don't touch that pipeline.
- **The Aurora demo data.** The seed produces an Aurora site at
  slug `aurora-cincy`. Use that for smoke-testing. Don't seed new
  sites for this sprint.
- **External Actions Required (your output to the user).** When
  emitting the Sprint Completion Report, the External Actions block
  for Sprint 10 is exactly:
  1. `pnpm db:push` to apply the new migration.
  2. `pnpm db:types` to refresh the generated types (optional —
     Sprint 10 hand-authors the addition, so the build passes
     either way; running this just keeps the file in sync with the
     authoritative source).
  3. No Vercel actions, no API key changes.