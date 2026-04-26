# DECISIONS.md — Append-only deviation and decision log

> This file is **append-only**. Never edit existing entries. Add new entries at the bottom.
>
> Every approved Deviation Report (per the Deviation Protocol in `CLAUDE.md` §6) gets an entry here. Every cross-sprint architectural decision that wasn't pre-specified in `PROJECT_SPEC.md` gets an entry here.
>
> Format for each entry:
>
> ```
> ## YYYY-MM-DD — Sprint N — [Short title]
>
> **Context:** What sprint, what DoD item, what triggered the decision.
>
> **Original plan:** What was specified in PROJECT_SPEC.md or the sprint plan.
>
> **What changed:** The new approach.
>
> **Rationale:** Why the change was necessary.
>
> **User approval (verbatim):** "Approved" / "Approved with changes: …"
>
> **Trade-offs accepted:**
> - Gain: …
> - Lose: …
> - Risk: …
>
> **Affected files / modules:** …
>
> **Cross-sprint impact:** Which later sprints need to be aware of this.
> ```

---

<!-- New entries appended below this line. Do not edit anything above. -->

2026-04-25 — Sprint 0 amendment
Decision: Use hosted Supabase (paid account) instead of local Supabase via Docker.
Rationale: User has paid Supabase account + API key; avoids Docker dependency;
single DB for dev and demo simplifies the deploy story.
Spec section affected: §3.4 (Infra). Treat "Supabase local via Docker" as
superseded by "Hosted Supabase project, accessed via @supabase/supabase-js".
Approval: User direction during Sprint 1 planning.

## 2026-04-25 — Sprint 1b — Wire pnpm db:push / db:types as part of 1b

**Context:** Sprint 1b's "Files you may create or modify" list constrained
package.json edits to "(add `seed` script only)". On entering the sprint,
`pnpm db:push` and `pnpm db:types` were still the Sprint-0 placeholder echoes
(`echo '...' && exit 0`). Sprint 1a's CLAUDE.md said it would wire them, but
the merged tree shows the wiring incomplete. The Sprint 1b smoke test
(step 9) and the User Actions Required (regenerate `database.ts` after
`pnpm seed`) both depend on a real `pnpm db:types`.

**Original plan:** 1b touches only `seed` in package.json; 1a wires `db:push`
and `db:types`.

**What changed:** Sprint 1b also wires `db:push` and `db:types`. Concretely:
  - `db:push`  → `supabase db push`
  - `db:types` → `supabase gen types typescript --linked > apps/web/types/database.ts`

`--linked` (not `--project-id $SUPABASE_PROJECT_REF`) avoids cross-shell env
expansion problems on Windows cmd.exe vs bash; it uses whatever project ref
`supabase link` recorded.

**Rationale:** Without these scripts wired, the User Actions Required for
Sprint 1b cannot be executed by the user as written, and Sprint 1c would
inherit the same broken state. Fixing it inside 1b keeps the Sprint 1
deliverables coherent and unblocks every later sprint. Touching the same
file (package.json) in two sequenced sprints is consistent with §16's merge
ordering rules.

**User approval (verbatim):** "go ahead and fix it"

**Trade-offs accepted:**
- Gain: smoke-test step 9 and the User Actions Required are now actually
  runnable; Sprint 1c is no longer blocked behind a half-finished 1a.
- Lose: a small overlap in package.json ownership between Sprints 1a and 1b.
  If 1a is rebased later it must NOT clobber these two lines.
- Risk: minor merge friction if 1a's branch independently re-introduces the
  placeholder text; the merger needs to keep these wired commands.

**Affected files / modules:** /package.json (db:push, db:types).

**Cross-sprint impact:** Sprints 1a (must not regress these scripts on rebase)
and 1c-onward (rely on `pnpm db:types` regenerating database.ts after
schema changes).

## 2026-04-25 — Sprint 1c — Pre-existing deps and out-of-order Sprint 2 work

**Context:** When entering Sprint 1c the working tree on `master` already
contained: (a) `lucide-react@1.11.0` exact-pinned in
`apps/web/package.json`; (b) a shadcn-canonical `apps/web/components/ui/button.tsx`
generated for Sprint 2's setup-form work; (c) a full set of Sprint 2
artifacts (`apps/web/components/setup-form/**`, `apps/web/lib/setup-form/**`,
`apps/web/app/dev/setup-2a/page.tsx`, plus `form.tsx`, `label.tsx`,
`radio-group.tsx`, `textarea.tsx` shadcn primitives) that were created
before Sprint 1c per a planning oversight. Sprint 1c's DoD bullets 1–2
prescribe `pnpm add -E lucide-react` and `pnpm dlx shadcn@latest add button …`,
which would either no-op or re-overwrite work owned by another sprint.

**Original plan:** Run `pnpm add -E lucide-react` and the full
`pnpm dlx shadcn@latest add button command dialog avatar badge input`
command. Sprint 2 was supposed to be unstarted at Sprint 1c kickoff.

**What changed:**
1. Skip re-installing `lucide-react` — already at the required exact pin.
2. Skip `shadcn add button` — file already present and shadcn-canonical.
3. Run only `pnpm add -E cmdk` and `pnpm dlx shadcn@latest add command dialog avatar badge input` for genuinely missing pieces.
4. Continue Sprint 1c on `master` (not an isolated branch/worktree) given
   the user's stated workflow.
5. Leave the out-of-sequence Sprint 2 untracked files untouched; Sprint 1c's
   "MUST NOT modify" file scope is honored.

**Rationale:** The end-state required by DoD 1–2 (deps installed at exact
versions, button.tsx present in `components/ui/`) is already satisfied;
re-running the install commands would either be a no-op or risk
overwriting work owned by Sprint 2. Continuing on master matches the
user's explicit instruction.

**User approval (verbatim):** "CONTINUE ON MASTER. tHE SPRINT 2 FILES WERE
ACCIDENTALLY CREATED FIRST i FORGOT ABOUT 1C.  fIRST OPTION FOR QUESTION C,
ANSWER TO D IS YES"

Follow-on approval (mid-sprint, after the build gate uncovered a pre-existing
TypeScript error in a Sprint 2 WIP file `apps/web/app/dev/setup-2a/page.tsx`):
**"Just go ahead and touch sprint 2 files if needed"** — granted permission
for Sprint 1c to make the minimal edit required to unblock `pnpm build`.

**Trade-offs accepted:**
- Gain: no destructive overwrites of Sprint 2 work; faster execution.
- Lose: the literal install commands in DoD 1–2 are not re-run; the file
  scope of Sprint 1c is technically polluted by pre-existing Sprint 2 files.
- Risk: if Sprint 2 work is ever rolled back, the shadcn primitives
  consumed by Sprint 1c must remain. None of Sprint 1c's deliverables
  depend on the setup-form components themselves.

**Affected files / modules:** `apps/web/package.json` (cmdk added),
`apps/web/components/ui/{command,dialog,avatar,badge,input}.tsx` (new
shadcn primitives). Existing `button.tsx`, `lucide-react` pin, and Sprint 2
artifacts left untouched.

**Cross-sprint impact:** Sprint 2 review/merge order is unaffected — its
files were already on disk before Sprint 1c started.

## 2026-04-25 — Sprint 2a — Apply Sprint 1b migrations + seed to unblock pnpm test gate

**Context:** Sprint 2a's final DoD bullet requires `pnpm test` to pass with
zero failures. On entering 2a, 14 tests in `apps/web/lib/rm-api/__tests__/`
(Sprint 1b integration tests) were failing because the linked hosted
Supabase project at `duxvdehwrblnabkqwzqo.supabase.co` had migrations and
seed data that were never pushed/applied. Sprint 2a's "MUST NOT modify"
list explicitly forbids touching `apps/web/lib/rm-api/**`, so the only
clean fix is to load Sprint 1b's data into the hosted project.

**Original plan:** Sprint 2a finishes its own work; the broader repo gate
is assumed green when 2a starts.

**What changed:** Within Sprint 2a, run `pnpm db:push` (apply Sprint 1b
migrations) and `pnpm seed` (`supabase db reset --linked` — drops and
re-loads hosted data with `supabase/seed.sql`) so that the rm-api
integration tests can find the Aurora Property Group seed data and pass.
Sprint 2a code itself is unchanged.

**Rationale:** Without this, the `pnpm test` quality gate in DoD cannot
pass. Touching only `lib/rm-api/**` test code (option B in the deviation
report) would either weaken the integration suite or violate file scope.
Declaring 2a done with a red repo-wide gate (option C) softens the meaning
of "all quality gates pass". Loading the seed (option A) is the only path
that respects every constraint.

**User approval (verbatim):** "Yes A and you run everything"

**Trade-offs accepted:**
- Gain: full repo-wide `pnpm test` gate goes green; demonstrates Sprint 1b
  is genuinely complete; no scope drift inside Sprint 2a code.
- Lose: hosted Supabase data is reset (acceptable — pre-demo, only seed
  data exists).
- Risk: a misfiring `supabase db reset --linked` could wipe data on the
  hosted project. The project currently has only seed data, so the blast
  radius is limited.

**Affected files / modules:** None modified inside the repo for this
deviation. State change is on the hosted Supabase project
`duxvdehwrblnabkqwzqo` (migrations applied, seed.sql loaded).

**Cross-sprint impact:** Sprint 2c and beyond will assume Sprint 1b's
seed is loaded. If a future contributor clones the repo, they must run
`pnpm db:push && pnpm seed` (or equivalent) before `pnpm test` will
report green.

## 2026-04-25 — Sprint 2c — Brand-section ownership hand-off

**Context:** Sprint 2c's DoD requires `<BrandSection>`'s placeholder body
(shipped by Sprint 2a) to host the new `<LogoUpload>` component.
`apps/web/components/setup-form/brand-section.tsx` was on Sprint 2a's
roster, so this is a single-file ownership hand-off across two sprints.
Sprint 2c's CLAUDE.md anticipated the conflict and authorized Sprint 2c
to overwrite the body.

**Original plan:** Sprint 2a ships a placeholder `<BrandSection>`; Sprint
2c stands up `<LogoUpload>` as a sibling and never touches `brand-section.tsx`.

**What changed:** Sprint 2c overwrites the body of
`apps/web/components/setup-form/brand-section.tsx` so it imports and
renders `<LogoUpload>` inside the existing section heading + container.
The Sprint-2a placeholder text ("Drop your logo here", "PNG, SVG, JPG")
moves into `<LogoUpload>` itself, which preserves the strings and
therefore keeps the Sprint-2a-owned `brand-section.test.tsx` green
without modification. `<LogoUpload>` tolerates a missing
`<FormProvider>` ancestor (only touches form context inside event
handlers via a nullable cast on `useFormContext`'s return) so the
existing test — which renders `<BrandSection />` bare — keeps working.

**Rationale:** Splitting `<LogoUpload>` and the brand-section heading
across two files would have left a vestigial placeholder forever; the
clean end-state is a section that owns its own upload UI. Pre-clearing
this hand-off in 2c's CLAUDE.md was the planned escape hatch.

**User approval (verbatim):** Authorized in advance via Sprint 2c's
CLAUDE.md ("this sprint OVERWRITES `brand-section.tsx`'s body. This is a
known scope hand-off; document it in DECISIONS.md as part of Sprint 2c's
work.").

**Trade-offs accepted:**
- Gain: clean component boundaries; Sprint-2a's brand-section test still
  passes unchanged.
- Lose: `brand-section.tsx`'s ownership now spans two sprints. If 2a is
  ever rebased the merger must keep 2c's body.
- Risk: minor merge friction if 2a re-introduces the placeholder text.

**Affected files / modules:**
- `apps/web/components/setup-form/brand-section.tsx` (body replaced).
- `apps/web/components/setup-form/logo-upload.tsx` (new).

**Cross-sprint impact:** Sprint 4 (initial generation endpoint) will
read the uploaded logo URL from `values.logoPrimary.url` (the Sprint-2a
schema's `fileRef = { name, url }` shape). The Sprint 2c CLAUDE.md
phrasing of "primaryLogoUrl field" is a SiteConfig-naming reference
(PROJECT_SPEC.md §11) — the form-state field is `logoPrimary` per the
schema Sprint 2c is forbidden from modifying.


## 2026-04-25 — Project-wide — Remove calendar dates from spec; Sprint Architect must not weigh schedule pressure

Calendar dates in PROJECT_SPEC.md §6.1 ("April 30") and §13 heading
("Demo Plan (April 30)") have been removed. The Sprint Architect must
not factor calendar pressure into recommendations or sprint scopes.
Quality, robustness, and correctness are paramount; perceived time
pressure is irrelevant. Any future Sprint Architect or Claude Code
output that recommends scope cuts on the basis of "we have N days left"
is in violation of this rule and must be rejected.

User approval (verbatim): "C. Where are you getting the information
about the due date that should be none of your concern. I need to take
that out of files it encourages you to cut corners"


## 2026-04-25 — Sprint 5 — Allow retroactive cross-sprint test-file cleanup; surgical TS fixes to Sprint 2/3 tests

Sprint 5's quality gates (§15.7) require `pnpm build` to pass with zero
TypeScript errors. On the master branch at the start of Sprint 5, six
pre-existing test files owned by earlier sprints already produced TS
errors that blocked `pnpm build` regardless of any Sprint 5 work:

- `apps/web/components/setup-form/__tests__/general-section.test.tsx`
- `apps/web/components/setup-form/__tests__/template-start-section.test.tsx`
- `apps/web/components/setup-form/__tests__/custom-instructions-section.test.tsx`
- `apps/web/components/setup-form/__tests__/color-scheme-section.test.tsx`
- `apps/web/components/setup-form/__tests__/advanced-section.test.tsx`
- `apps/web/components/renderer/__tests__/Renderer.test.tsx`

The first five had a `useForm<SetupFormValues>` annotation that doesn't
match `zodResolver(setupFormSchema)` because Zod fields with
`.default(...)` (notably `additionalLogos` and `templateStart`) make the
schema's input shape differ from its output shape. The fix mirrors the
working triple-generic pattern already used in
`apps/web/components/setup-form/setup-form.tsx`:
`useForm<SetupFormInput, undefined, SetupFormValues>` with
`type SetupFormInput = z.input<typeof setupFormSchema>`.

The renderer test failed because `vi.fn(componentRegistry.X.Component)`
passes a `ComponentType<P>` (= `ComponentClass | FunctionComponent`) where
`vi.fn` expects a callable; cast to a function-component shape.

Sprint 5's file-scope rules forbid modifying any of these files. Per the
Deviation Protocol, the deviation was raised, approved, and recorded
here. The user also approved a permanent rule change: see CLAUDE.md
§15.9 (added in this same edit), which permits future sprints to make
minimal, surgical, behavior-preserving fixes to inherited test-file
breakage without re-raising a Deviation per occurrence — provided each
fix is logged in DECISIONS.md and the Sprint Completion Report.

**Affected files / modules:**
- `apps/web/components/setup-form/__tests__/general-section.test.tsx` (type-only fix).
- `apps/web/components/setup-form/__tests__/template-start-section.test.tsx` (type-only fix).
- `apps/web/components/setup-form/__tests__/custom-instructions-section.test.tsx` (type-only fix).
- `apps/web/components/setup-form/__tests__/color-scheme-section.test.tsx` (type-only fix).
- `apps/web/components/setup-form/__tests__/advanced-section.test.tsx` (type-only fix).
- `apps/web/components/renderer/__tests__/Renderer.test.tsx` (type-only cast on `vi.fn`).
- `CLAUDE.md` (added §15.9 "Retroactive cross-sprint cleanup").

**Cross-sprint impact:** Future sprints may now apply minimal,
behavior-preserving fixes to inherited test-file or config-file
breakage that blocks their quality gates. Production code in
another sprint's domain still requires a Deviation.

User approval (verbatim): "Approved. Make a change to instruction
files to allow claude code to work on sprints retroactively"


## 2026-04-25 — Sprint 3b — Schema amendment for detail pages (planned schema-lock break)

**Context:** Sprint 3 locked the SiteConfig schema. Sprint 3b is the
planned schema-lock break referenced in `SPRINT_SCHEDULE.md` §5 row 1
and in the Detail-pages amendment block previously appended to
`PROJECT_SPEC.md`. The amendment introduces detail pages: Pages with
`kind: "detail"` that render a per-row template for `properties` or
`units`, sharing slugs with sibling static pages under the U2 routing
pattern (`/{site}/units` static, `/{site}/units/{id}` detail).

**Original plan (pre-amendment):** `Page` was `{ id, slug, name, meta?,
rootComponent }`. Slug uniqueness was implicitly global. No `kind`
field. `parseSiteConfig` and the existing schema tests assumed this
shape and a lossless JSON round-trip.

**What changed:**

1. `pageSchema` gained `kind: pageKindSchema.default("static")` and
   `detailDataSource: detailDataSourceSchema.optional()`, plus a
   per-page `superRefine` enforcing `detailDataSource` is required iff
   `kind === "detail"`. Issue paths point at `["detailDataSource"]`.
2. `siteConfigSchema` gained a cross-page `superRefine` enforcing the
   U2 per-`kind` slug uniqueness rule (per `PROJECT_SPEC.md` §11 "Page
   validation rules"). Issue paths point at the second offending page
   `["pages", index, "slug"]`.
3. New value exports: `pageKindSchema`, `detailDataSourceSchema`. New
   type exports: `PageKind`, `DetailDataSource`. Re-exported through
   `apps/web/lib/site-config/index.ts` and
   `apps/web/types/site-config.ts`.
4. 12 new tests in `schema.test.ts` (enums + per-page validity +
   per-page invalidity + cross-page uniqueness + ordering canary
   confirming `default("static")` runs before the cross-page refinement
   reads `page.kind`). 3 new tests in `parse.test.ts` (mixed-kind
   round-trip, detail with `detailDataSource: "properties"` round-trip,
   pre-amendment backwards-compat canary).

**Rationale:** Detail pages were a gap in the prior spec; the user
pulled them into scope and chose option U2 (shared slugs, route
disambiguated by URL shape). Doing 3b directly after Sprint 3 — before
later sprints rebase against the new schema — minimizes downstream
churn.

**User approval (verbatim — original schema-lock approval that
authorized the existence of Sprint 3b):** "C. Where are you getting
the information about the due date that should be none of your concern.
I need to take that out of files it encourages you to cut corners" and
"Lets do U2, Make me the 3b sprint and then generate a new
Sprint_Schedule.md file with the modifications."

**Trade-offs accepted:**
- Gain: detail pages are now expressible in `SiteConfig`; the U2
  routing pattern is enforced at validation time, not at request time.
  `default("static")` keeps every pre-amendment config valid without
  migration.
- Lose: every later sprint that constructs `SiteConfig` literals must
  include `kind` (the inferred output type makes it required); the
  existing JSON round-trip test in `parse.test.ts` and three downstream
  literal sites required minor updates (see in-sprint deviations
  below). All updates are spelled out and behavior-preserving.
- Risk: a hand-written invalid config (e.g. two detail pages sharing a
  slug, or a detail page omitting `detailDataSource`) is rejected by
  `siteConfigSchema.parse`; the deploy endpoint will re-validate at
  the boundary.

**Affected files / modules (in scope per Sprint 3b's Owned list):**
- `apps/web/lib/site-config/schema.ts` (enums, `pageSchema`
  refinement, `siteConfigSchema` refinement).
- `apps/web/lib/site-config/index.ts` (new value + type re-exports).
- `apps/web/types/site-config.ts` (new type re-exports).
- `apps/web/lib/site-config/__tests__/schema.test.ts` (+12 tests).
- `apps/web/lib/site-config/__tests__/parse.test.ts` (+3 tests; one
  pre-existing fixture also touched per in-sprint deviation 2 below).
- `DECISIONS.md` (this entry).

**Cross-sprint impact:** Sprints 4, 5, 6, 8, 9, 9b, 11, 13 each carry
an amendment to be planned when those sprints are next on the
schedule. Per `SPRINT_SCHEDULE.md` §2, the recommended next sprints in
order are Sprint 2 (continuation), then a re-emitted Sprint 5 (which
gains `Button.linkMode`/`detailPageSlug` and
`InputField.defaultValueFromQueryParam`), then Sprint 4 (AI generation
prompt teaches detail pages).

### In-sprint deviations approved during Sprint 3b

**Deviation 1 — Pre-flight unblock by applying the spec amendment in-sprint.**

Sprint 3b's pre-flight check requires `PROJECT_SPEC.md` §11 to contain
the new `Page` shape and §8.12 to be "Detail pages". On entering the
sprint, the amendment lived only as a trailing meta-block ("Apply this
amendment to PROJECT_SPEC.md BEFORE running Sprint 3b") at the bottom
of the file; §11 still showed the pre-amendment `Page` type and §8.12
was still "Deploy". Per the Deviation Protocol, raised the issue. User
approved (option B): Sprint 3b applies the three diffs verbatim from
the trailing amendment block. The application required renumbering the
existing `### 8.12 Deploy` to `### 8.13 Deploy` to make room for the
new `### 8.12 Detail pages` (the only consistent way to honor the
amendment's verbatim heading). The trailing meta-block was left intact
as historical context; the spec now contains the post-amendment content
canonically in §11 + §8.12.

User approval (verbatim): "B."

**Deviation 2 — One-line fixture update to keep the pre-existing JSON
round-trip test green.**

`parse.test.ts`'s `JSON round-trip > round-trips a JSON-stringified
valid config without loss` test asserts strict
`JSON.stringify(reparsed) === json` equality. Sprint 3b's
`pageSchema.kind = z.enum([...]).default("static")` causes Zod to
inject `"kind":"static"` into the parsed output for any page that
omitted the field, breaking the strict-equality assertion. Confirmed
empirically with a throwaway probe (`{"slug":"home"}` parsed to
`{"slug":"home","kind":"static"}`). The DoD says any pre-existing
test break is a Deviation. Per the Deviation Protocol, raised the
issue. User approved: spell `kind: "static"` into the existing
`makeMinimalConfig()` helper in `parse.test.ts` so the input JSON
includes the field; round-trip equality holds. Test bodies and
assertions are unchanged; only the fixture was touched, preserving
every test's intent.

User approval (verbatim): "approve"

**Deviation 3 — Cross-sprint surgical fixes (kind: "static") to three
downstream literal sites broken by the schema amendment.**

After the schema change, three files outside Sprint 3b's Owned list
broke `pnpm build` because the inferred `Page` type now makes `kind`
required-on-output (Zod 4 distinguishes `_input` from `_output` for
`.default`):

- `apps/web/app/dev/preview/fixtures.ts` (Sprint 3 dev fixture, /404 in production).
- `apps/web/app/dev/components/fixtures.ts` (Sprint 5 dev fixture, /404 in production, untracked).
- `apps/web/components/renderer/__tests__/Renderer.test.tsx` (Sprint 3 test; two literal sites).

These breakages are NOT pre-existing — they were caused by the Sprint
3b schema change — so CLAUDE.md §15.9's retroactive-test-fix
carve-out does not apply. Per the Deviation Protocol, raised the
issue. User approved: add `kind: "static"` to each affected page
literal. The fix is mechanical, behavior-preserving, and matches the
runtime behavior of the new `default("static")` exactly. The Sprint
3b plan's "Backwards compatibility break" hint anticipated the
runtime case but did not contemplate the TypeScript output-type
inference case; this deviation closes that gap.

User approval (verbatim): "approve"

**Affected files / modules (in-sprint deviations):**
- `apps/web/lib/site-config/__tests__/parse.test.ts` (Deviation 2: one
  field added to `makeMinimalConfig()`).
- `apps/web/app/dev/preview/fixtures.ts` (Deviation 3: one line).
- `apps/web/app/dev/components/fixtures.ts` (Deviation 3: one line).
- `apps/web/components/renderer/__tests__/Renderer.test.tsx`
  (Deviation 3: two lines).
- `PROJECT_SPEC.md` (Deviation 1: §11 Page block replaced, §11
  trailer appended, §8.12 inserted, §8.12 Deploy renumbered to §8.13).


## 2026-04-25 — Sprint 5b — Detail-pages backfill for Button, InputField, and the dev fixture

**Context:** Sprint 5 was completed before Sprint 3b due to the order in
which the Sprint Architect generated the new sprints. The actual execution
order was 0 → 1 → 2 → 3 → 5 → 3b instead of the planned
0 → 1 → 3 → 3b → 2 → 5. Sprint 3b succeeded against this codebase because
the schema additions were purely additive with `default("static")` for
`Page.kind`, so all Sprint 5 fixtures continued to validate. What remained
was a focused backfill of three areas of Sprint 5 to align them with
PROJECT_SPEC.md §8.12.

**What changed:**
- Button gains `linkMode: "static" | "detail"` (default `"static"`) and
  `detailPageSlug?: string` (required when linkMode === "detail").
  Renders `data-link-mode` and `data-detail-page-slug` data attributes
  when in detail mode. Sprint 9b will compute the actual href.
- InputField gains `defaultValueFromQueryParam?: string` and switches to
  a client component to read `window.location.search` on mount.
- The /dev/components fixture gains a detail Button, a query-param
  InputField, and a second `kind="detail"` page sharing the slug "units"
  with the static units page (the U2 coexistence case).

**User approval (verbatim):** "C. Where are you getting the information
about the due date that should be none of your concern. I need to take
that out of files it encourages you to cut corners" (option C — pull
detail pages into scope; the Sprint 3b + 5b backfill chain is the
implementation of that decision)

Plus the explicit Sprint 5b request: "Since this was supposed to be
before Sprint 2 but Sprint 2 was done before we made this 3b sprint.
[...] I have alos done Sprint 5 before Sprint 3b let me know if there is
something Extra I need to do before sprint 4. Basically I have done
sprint 0, 1. 2. 3. 5. 3b in this order. LEte me know what Is missing
before starting sprint 4, Make a prompt of all the things needed done
before moving on to sprint 4"

**Trade-offs accepted:**
- Gain: Button and InputField now expressible per §8.12; Sprint 4's
  system prompt can teach Claude about the new props meaningfully;
  Sprint 9b can resolve them at render time.
- Lose: one extra sprint of work that would have been folded into Sprint
  5 had the order been different — small cost.
- Risk: the InputField switch to client component is the standard
  exception for components with client-only side effects; contained to
  this one component.

**Affected files:** apps/web/components/site-components/Button/index.tsx,
SPEC.md, __tests__/Button.test.tsx; apps/web/components/site-components/
InputField/index.tsx, SPEC.md, __tests__/InputField.test.tsx;
apps/web/app/dev/components/fixtures.ts.

**Cross-sprint impact:** Sprint 4 is unblocked. Sprint 9b will consume
the data attributes Button emits and the controlled value InputField
manages.


## 2026-04-25 — Sprint 5b — Execution record

**Context:** Sprint 5b plan above was executed against `master` per the
2026-04-25 single-branch decision. This entry captures the post-execution
facts that the planning entry could not record in advance.

**Pre-flight check result:** PASSED.
- `PROJECT_SPEC.md` §8.12 confirmed present at line 577 with the
  `linkMode` / `detailPageSlug` / `defaultValueFromQueryParam` prop
  descriptions.
- `apps/web/lib/site-config/schema.ts` confirmed to contain
  `pageSchema.kind`, `pageSchema.detailDataSource`, the per-page
  `superRefine` enforcing detailDataSource-iff-detail, and the
  `siteConfigSchema` cross-page `superRefine` enforcing per-`kind`
  slug uniqueness.
- `Button/index.tsx` and `InputField/index.tsx` both confirmed to
  exist (Sprint 5 ships).

**Implementation summary:**
1. Button — schema gained `linkMode` (default `"static"`) and
   `detailPageSlug` (optional) joined by a `superRefine` enforcing the
   cross-field rule; the inline-literal fallback was replaced with a
   module-level `BUTTON_FALLBACK = buttonPropsSchema.parse({})` so the
   fallback stays in sync with future schema changes; render emits
   `data-link-mode="detail"` and `data-detail-page-slug` data attrs
   only when `linkMode === "detail"` and `detailPageSlug` is defined.
2. InputField — `"use client"` directive added on line 1; `useState`
   + `useEffect` introduced for controlled-state value (and a separate
   `checked` state for checkbox); URL hydration in a SSR-safe
   `useEffect` (no-op on server, no-op when prop unset). All input
   branches (text/email/tel/number/textarea/select/checkbox) wired
   consistently as controlled.
3. SPEC.md updates — Button props table grew by 2 rows; InputField
   props table grew by 1 row; AI ops vocabulary entries documented as
   Sprint 11 work; Button data-binding note explains `{{ row.* }}` is
   stored verbatim and resolved by Sprint 9b; InputField gets a
   header note explaining the client-component switch.
4. Tests — pre-existing tests preserved verbatim. 4 new Button tests
   + 4 new InputField tests, totaling 8 new tests across the two
   files (DoD called for ≥ 6).
5. Dev fixture — added `cmp_btn_detail` Button (`linkMode: "detail"`,
   `detailPageSlug: "units"`) after the Repeater; added
   `cmp_input_query` InputField (`defaultValueFromQueryParam:
   "test_input"`) inside the existing Form between the email input
   and the submit button; appended `p_units_static` (kind: static,
   slug: units) and `p_units_detail` (kind: detail, slug: units,
   detailDataSource: units) to exercise the U2 same-slug
   coexistence.

**Deviations encountered:** None. Every DoD item, file scope rule, and
quality gate was satisfiable as written. No retroactive cross-sprint
fixes (CLAUDE.md §15.9) were required — the inherited test/config
files compiled and passed without modification.

**Quality gate results:**
- `pnpm test`: 51 test files, 253 passed, 2 skipped, 0 failed.
  Button file 8 tests (4 pre-existing + 4 new). InputField file 8
  tests (4 pre-existing + 4 new). Dev fixture parse test still passes.
- `pnpm build`: `✓ Compiled successfully in 3.0s`. Zero TypeScript
  errors. Zero warnings. The `/dev/components` route compiled to
  147 kB First Load JS (up from 105 kB on the home route, reflecting
  the added client-component runtime for the InputField hydration).
- `pnpm lint` (Biome check): one auto-fixable formatting nit on
  `InputField.test.tsx` was applied via `pnpm format` (single-line
  JSX collapse). Re-run reported "Checked 168 files. No fixes
  applied." — zero warnings.

**Files modified (matches the Owned list exactly):**
- `apps/web/components/site-components/Button/index.tsx`
- `apps/web/components/site-components/Button/SPEC.md`
- `apps/web/components/site-components/Button/__tests__/Button.test.tsx`
- `apps/web/components/site-components/InputField/index.tsx`
  (now begins with `"use client"`)
- `apps/web/components/site-components/InputField/SPEC.md`
- `apps/web/components/site-components/InputField/__tests__/InputField.test.tsx`
- `apps/web/app/dev/components/fixtures.ts`
- `DECISIONS.md` (this entry, appended below the planning entry).