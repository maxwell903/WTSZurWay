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


## 2026-04-25 — Sprint 4 — Add missing .env.example to satisfy pre-flight assertion 11

**Context:** Sprint 4's pre-flight assertion 11 requires `.env.example` (or
`apps/web/.env.example`) to document `ANTHROPIC_API_KEY`. On entering Sprint
4, no such file existed at either location — a glob across the whole tree
returned only `apps/web/.env.local` (gitignored, personal). The repo root
README explicitly references the file
(`cp .env.example apps/web/.env.local`), so the broken onboarding step has
been latent since Sprint 0. Sprint 4's "Files you may create or modify"
list does not include `.env.example`, making creation a scope addition
requiring a Deviation per the Protocol.

**Original plan:** Sprint 0 was supposed to commit `.env.example`; Sprint 4
inherits a working file and only references it in user-actions.

**What changed:** Sprint 4 creates `.env.example` at the repo root (the
location the README's `cp` command points to) listing the five env vars
the Sprint 4 smoke-test prerequisites enumerate — `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_PROJECT_REF`, `ANTHROPIC_API_KEY` — each with an empty
placeholder and a one-line comment. No real secrets in the file. No code
imports it; it is documentation only.

**Rationale:** Without this file the README's onboarding step is broken
and pre-flight assertion 11 fails, blocking Sprint 4 entirely. Creating a
template file is a one-line scope addition with zero behavioral risk —
the file holds only placeholders. Sprint 0 is the rightful owner but is
closed; Sprint 4 absorbs the housekeeping rather than indefinitely
deferring the fix.

**User approval (verbatim):** "approved"

**Trade-offs accepted:**
- Gain: pre-flight assertion 11 passes; README onboarding step works for
  the next contributor; Sprint 4's user-actions list points at a real
  template the user can copy.
- Lose: one file added outside Sprint 4's declared "Files you may create
  or modify" list. Sprint 0 (rightful owner) is closed, so the addition
  is permanent.
- Risk: very low. The file holds no real values; never imported by code;
  only documents the env contract. Future env-var additions (e.g.
  Sprint 13's Vercel keys) will need to update this file.

**Affected files / modules:**
- `.env.example` (new — repo root).
- `DECISIONS.md` (this entry).

**Cross-sprint impact:** Sprint 13 (Vercel) and any later sprint that
introduces a new required env var should update `.env.example` to keep
the onboarding template current.


## 2026-04-25 — Sprint 6 — Inline site/version load instead of `lib/sites/repo.ts`; drop `updated_at` from PATCH

**Context:** Sprint 6's pre-flight check #3 required
`apps/web/lib/sites/repo.ts` to export `getSiteBySlug` and
`getLatestWorkingVersion`. The file does not exist on master — Sprint 4
inlined that logic as a private `loadSiteAndVersion(siteSlug, versionId)`
function inside `apps/web/app/[site]/preview/page.tsx`. Separately, the
Sprint 6 CLAUDE.md's pre-flight wording lists `version_number` and
`updated_at` columns on `site_versions`. Neither column exists in
PROJECT_SPEC.md §12 nor in
`supabase/migrations/20260425000007_create_sites_and_site_versions.sql`.
The PATCH endpoint as described would have failed at runtime
(`updated_at = NOW()` on a non-existent column) and smoke-test step 5's
SQL also referenced `updated_at`.

**Original plan:** Sprint 6's `[site]/edit/page.tsx` imports
`getSiteBySlug` and `getLatestWorkingVersion` from
`apps/web/lib/sites/repo.ts`. The PATCH endpoint sets `config = :new`
**and `updated_at = NOW()`** on the matching `site_versions` row. The
smoke test queries `select config->>'name', updated_at ... where
is_working = true`.

**What changed:**
1. Sprint 6 inlines the same `loadSiteAndVersion` private helper in
   `apps/web/app/[site]/edit/page.tsx`, matching the existing pattern
   in `[site]/preview/page.tsx`. No new module under `lib/sites/`.
2. The PATCH endpoint at `/api/sites/[siteId]/working-version` UPDATEs
   only the `config` jsonb column on the `is_working = true` row.
   No `updated_at` write.
3. The smoke-test step 5 SQL drops the `updated_at` column from the
   SELECT. Recency is implicit from the test sequence (the assertion
   immediately follows a save).

**Rationale:** The repo helper does not exist; creating it under
`lib/sites/` would violate Sprint 6's file-scope ban on Sprint-4-owned
modules. The duplicated `loadSiteAndVersion` body is small (~50 lines)
and matches the shipped /preview pattern; future deduplication can
happen under its own deviation. The `updated_at` column simply does
not exist per the canonical spec; removing the write is the only
correct option that keeps Sprint 6 inside the spec.

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: zero file-scope violations; the editor route loads its working
  site exactly the way the already-quality-gated preview route does;
  PATCH endpoint and smoke-test step 5 actually execute against the
  real schema.
- Lose: a small amount of duplicated Supabase calls between the
  preview and edit pages (~50 lines).
- Risk: very low. No new behavior, no new column, no new migration.

**Affected files / modules:**
- `apps/web/app/[site]/edit/page.tsx` (new — inlines
  `loadSiteAndVersion`).
- `apps/web/app/api/sites/[siteId]/working-version/route.ts` (new —
  UPDATE writes only `config`).
- Sprint 6 manual smoke test step 5 (interpreted with the
  `updated_at` column dropped from the SELECT).

**Cross-sprint impact:** Future editor sprints (7, 8, 10, 11) that need
to load a site by slug or fetch its working version see the same
inlined helper rather than a `lib/sites/repo.ts` import. They can either
inline likewise or promote to a shared module under their own
deviation. Sprint 13's deploy endpoint owns its own queries and is
unaffected.


## 2026-04-25 — Sprint 6 — Compose existing primitives instead of adding AlertDialog/Tabs/Tooltip packages

**Context:** Sprint 6's plan asks for four shadcn primitives (Dialog,
AlertDialog, Tabs, Tooltip). Only Dialog is installed. The matching
Radix packages (`@radix-ui/react-alert-dialog`,
`@radix-ui/react-tabs`, `@radix-ui/react-tooltip`) are absent from
`apps/web/package.json`. The same plan caps new dependencies at
`zustand` and forbids "rolling new primitives", so the three options
(install, build wrappers, or do without) are all deviations from a
literal reading of the plan.

**Original plan:** Use shadcn AlertDialog for the delete-page
confirm; use shadcn Tabs for the four-tab left sidebar; use shadcn
Tooltip for the two disabled-home-page hover hints.

**What changed:**
1. **AlertDialog → Dialog.** `DeletePageConfirm` imports the
   existing shadcn `Dialog` (already installed since Sprint 1c) and
   renders a destructive "Are you sure?" modal. Functionally
   equivalent for this single-button confirm use case.
2. **Tabs → controlled buttons with ARIA tab semantics.** The
   four-tab `LeftSidebar` renders four `<button role="tab">` elements
   in a flex row plus a conditionally rendered panel; `aria-selected`
   reflects the active tab. No reusable abstraction is exported.
3. **Tooltip → native HTML `title` attribute.** The "The home page
   cannot be deleted." and "The home page slug is fixed." hover
   strings ride on the disabled buttons / inputs as their `title`
   attribute. No keyboard-popover behavior is required by the
   smoke test.

**Rationale:** The strict zustand-only dependency rule is the binding
constraint here; rolling a Radix-equivalent primitive would be
genuinely "rolling a new primitive". Composing the existing Dialog
and using native browser features sidesteps both prohibitions
without sacrificing any smoke-test behavior.

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: zero new dependencies; no shadcn/Radix package bump days
  before Sprints 7/8/10/11 rebase against this code.
- Lose: small a11y delta — Dialog focus-trap is close to but not
  identical to AlertDialog's; tabs lose Radix's keyboard-arrow
  navigation (still keyboard-accessible via Tab); tooltips lose
  Radix delay/animation.
- Risk: very low. No new exported abstractions. Future sprints can
  install richer primitives under their own deviation if needed.

**Affected files / modules:**
- `apps/web/components/editor/sidebar/pages-tab/DeletePageConfirm.tsx`
  (uses Dialog).
- `apps/web/components/editor/sidebar/LeftSidebar.tsx` (custom
  ARIA-tab buttons; no shadcn Tabs primitive).
- Tooltip-bearing rows in `pages-tab/PageRow.tsx` and
  `pages-tab/RenamePageDialog.tsx` (use HTML `title`).

**Cross-sprint impact:** Future sprints that need a richer Tabs or
Tooltip behavior should install the matching shadcn primitive via
`pnpm dlx shadcn@latest add ...` under their own deviation; Sprint 6
intentionally leaves them off the dependency list.


## 2026-04-26 — Sprint 8 — Add `e.stopPropagation()` to `EditModeWrapper.handleContextMenu`

**Context:** Sprint 8 wires the right-click swap from canvas to LeftSidebar
element-edit mode. The Sprint-5 `EditModeWrapper` accepts an `onContextMenu`
prop (pre-flight check #4 confirmed) but its `handleContextMenu` calls only
`e.preventDefault()` — no `stopPropagation()`. Because every component on
the canvas is wrapped in its own `EditModeWrapper` and the wrappers nest
(Section → Row → Column → leaf), a contextmenu event on a leaf element
bubbles up through every ancestor wrapper. Each ancestor's handler fires
`onContextMenu(itsOwnId)` in turn, so the OUTERMOST wrapper's id is the
one that actually wins the store update. Right-clicking a Heading inside
a Section ends up selecting the Section. The companion `handleClick` in
the same file already calls `stopPropagation()`; the asymmetry is the bug.

**Original plan:** Sprint 8 was supposed to consume `EditModeWrapper`'s
existing context-menu wiring unchanged; `apps/web/components/renderer/`
is in Sprint 8's "Forbidden / Shared (read-only)" file scope.

**What changed:** Sprint 8 added `e.stopPropagation()` to two branches of
`apps/web/components/renderer/EditModeWrapper.tsx`:
1. `handleContextMenu` (the mouse path), and
2. The `Shift+F10` / `ContextMenu`-key branch of `handleKeyDown` (the
   keyboard parity path).

The change is two lines total. Behavior change: contextmenu on a nested
component now fires `onContextMenu(id)` for ONLY the innermost wrapper,
matching the existing click behavior.

**Rationale:** Without this fix, the spec wording "selects the
right-clicked component" (DoD #1) and smoke-test step 6 (which expects
the panel title to read "Heading" after right-clicking the HeroBanner
heading) cannot pass. The fix restores symmetry with the click handler
that has shipped this way since Sprint 5/6.

**User approval (verbatim):** "approve"

**Trade-offs accepted:**
- Gain: Right-click on any nested component selects the leaf the user
  clicked, unblocking DoD #1 and smoke-test steps 6, 13, 16, 17, 18.
  Symmetry with the already-stopPropagating click handler.
- Lose: One file (`apps/web/components/renderer/EditModeWrapper.tsx`)
  edited outside Sprint 8's "Owned" list — Sprint-5 territory. Two
  added lines.
- Risk: Very low. Behavior change is localized and mirrors the
  click-handler behavior already in place. Existing
  `EditModeWrapper.test.tsx` tests a single (non-nested) wrapper, so
  no regression to that suite. Any downstream consumer that relied on
  contextmenu bubbling to ancestor wrappers would have been getting
  the wrong selection anyway.

**Affected files / modules:**
- `apps/web/components/renderer/EditModeWrapper.tsx` (added
  `e.stopPropagation()` in two handler branches; no other change).

**Cross-sprint impact:** None expected. Sprint 5 / Sprint 6 carry the
same wrapper unchanged behaviorally for clicks; this brings right-click
into line. Future sprints that add new event handlers to the wrapper
should consider whether they too need `stopPropagation()` for the
nested-wrapper case.


## 2026-04-26 — Sprint 8 — Planning: Advanced-tab placeholder until `htmlId` / `className` ship on `ComponentNode`

**Context:** Sprint 8's element-edit panel ships a five-tab UI per
`PROJECT_SPEC.md` §8.4. The fifth tab, **Advanced**, is supposed to expose
"custom CSS class (escape hatch), HTML id" controls. The `SiteConfig`
schema's `componentNodeSchema` does NOT currently carry `htmlId` or
`className` fields (verified via Sprint 8's pre-flight check #6, and again
in `apps/web/lib/site-config/schema.ts`). Adding those fields would be a
schema-lock break (per `SPRINT_SCHEDULE.md` §5) and is out of scope for
Sprint 8.

**Original plan:** Sprint 8 ships the Advanced tab as a documented
placeholder with an `Info` icon and the body copy "These escape hatches
will land once the SiteConfig schema gains `htmlId` and `className`
fields on `ComponentNode`." See Sprint 8's CLAUDE.md.

**What changed:** Nothing — this entry is a planning record so a future
sprint (likely numbered between Sprint 13 and Sprint 15 per
`SPRINT_SCHEDULE.md` §5 row 2) has a paper trail of the deferred work.
That sprint will:
1. Amend `componentNodeSchema` to add optional `htmlId?: string` and
   `className?: string` fields, with the same nullability semantics as
   `animation` / `visibility`.
2. Replace
   `apps/web/components/editor/edit-panels/tabs/AdvancedTab.tsx`'s
   placeholder with two `TextInput` controls bound to the new fields
   via `setComponentProps` (or a new `setComponentMeta` mutator if the
   schema places them outside `props`).
3. Update the renderer to pass `htmlId` to the rendered DOM `id`
   attribute and `className` (merged with the existing `cn(...)`
   class string).
4. Update `Renderer.test.tsx` and `EditModeWrapper.test.tsx` to confirm
   the values flow through.

**Rationale:** Capturing the deferral now prevents the placeholder from
becoming permanent debris and makes the future schema amendment
discoverable from `DECISIONS.md`.

**User approval (verbatim):** Authorized in advance via Sprint 8's
CLAUDE.md ("Cross-document … `DECISIONS.md` — append entries for any
approved deviation. Also append a planning entry naming this sprint's
known schema gap (\"Advanced tab placeholder until `htmlId` /
`className` ship\") so Sprint 15 has a paper trail.").

**Trade-offs accepted:**
- Gain: Sprint 8 ships within the schema-lock; the future amendment
  has a clear "do this" anchor.
- Lose: Two CSS escape hatches the user might want today are not
  available until the future schema sprint runs.
- Risk: None — the placeholder mutates nothing and renders only
  documentation copy.

**Affected files / modules:**
- `apps/web/components/editor/edit-panels/tabs/AdvancedTab.tsx`
  (placeholder shipped this sprint; will be replaced by the future
  schema sprint).
- `apps/web/lib/site-config/schema.ts` (NOT modified this sprint;
  named here as the future amendment target).
- `apps/web/components/renderer/ComponentRenderer.tsx` (NOT modified
  this sprint; named here as the future renderer-amendment target).

**Cross-sprint impact:** The future schema sprint is the work item.
No other Sprint 8 sibling files are affected.


## 2026-04-26 — Sprint 7 — Default props table aligned to runtime safeParse for Form, HeroBanner, UnitCard

**Context:** Sprint 7's "Default props for palette inserts" table is
binding ("Every default must validate against the component's runtime
`safeParse` … Do NOT silently fall back to the component's internal
defaults — the schema is authoritative."). On entering the sprint,
three rows in the table did not match the prop names that the
corresponding `apps/web/components/site-components/${T}/index.tsx`
runtime `safeParse` reads:

- `Form` — table: `{ formId: "new_form", successMessage: "Thanks." }`.
  Runtime: `formName: z.string().min(1)` (required), `submitLabel`,
  `successMessage`. Without `formName`, runtime safeParse fails outright
  and the component falls back to a hardcoded `"form"` string — exactly
  the silent-fallback case the binding rule prohibits.
- `HeroBanner` — table: `{ headline, subheadline, ctaLabel, ctaHref }`.
  Runtime: `heading, subheading, ctaLabel, ctaHref, backgroundImage?,
  overlay, height`. Zod's `.strip()` makes safeParse "succeed" by
  silently dropping the orphan `headline`/`subheadline` keys, then the
  runtime applies internal defaults (`heading: "Welcome"`,
  `subheading: ""`).
- `UnitCard` — table: `{ unitName, bedrooms, bathrooms, rent,
  primaryImageUrl, ctaLabel, ctaHref }`. Runtime: `unitId?, heading,
  beds, baths, sqft, rent, imageSrc, ctaLabel, ctaHref`. Same
  silent-fallback pattern as HeroBanner.

The other 17 rows match.

**Original plan:** The table in Sprint 7's CLAUDE.md was treated as
binding verbatim, with a per-`ComponentType` test in
`createDefaultNode.test.ts` asserting the runtime `safeParse` accepts
each default.

**What changed:** Three rows revised to use the runtime-correct keys
while preserving the table author's "intent" values. The Sprint-7
default-props table is treated as if it read:

| ComponentType  | Default `props` (revised)                                                                 |
| -------------- | ----------------------------------------------------------------------------------------- |
| `HeroBanner`   | `{ heading: "New hero", subheading: "", ctaLabel: "Learn more", ctaHref: "#" }`           |
| `UnitCard`     | `{ heading: "Unit Name", beds: 0, baths: 0, sqft: 0, rent: 0, imageSrc: "", ctaLabel: "View Unit", ctaHref: "#" }` |
| `Form`         | `{ formName: "new_form", submitLabel: "Submit", successMessage: "Thanks." }`              |

`createDefaultNode.test.ts` round-trips each new node through both
`componentNodeSchema.safeParse` (the structural schema) AND the
component's runtime `safeParse` (the per-component prop schema), so a
future drift on either side is caught at test time.

**Rationale:** The binding rule explicitly forbids silent fallback to
internal defaults; the only rule-respecting move was to align the
table with the runtime contracts the components actually export. No
runtime-component edits — those files remain in Sprint 7's Shared
read-only category. The minimal renames preserve the visible intent
(a "New hero" hero, a `0`-everything unit card, a named form).

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: drag-from-palette inserts produce a node whose props are
  actually consumed by the renderer; `createDefaultNode.test.ts` can
  enforce the per-component runtime schema as a contract guard
  against future drift.
- Lose: a small visible change to the binding table (3 rows out of 20).
- Risk: zero behavior risk — these are brand-new defaults for new
  palette drops; no existing seeded config is affected, no schema
  changes, no runtime-component edits.

**Affected files / modules:**
- `apps/web/components/editor/canvas/dnd/createDefaultNode.ts` (uses
  the revised props for Form / HeroBanner / UnitCard).
- `apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts`
  (asserts the revised props validate against each component's
  runtime `safeParse`).

**Cross-sprint impact:** Sprint 9 (data binding on Repeater children)
will resolve `{{ row.* }}` tokens against the runtime keys
(`heading`, `imageSrc`, `beds`, etc.) — same set Sprint 7 now writes
on insert. No effect on Sprint 8 (already merged). No schema changes.

---

## 2026-04-26 — Sprint 9 — Whole-token passthrough preserves underlying value type

**Original plan:** Sprint 9 CLAUDE.md DoD specified that
ComponentRenderer's new resolver hook "walks `node.props` and replaces
every string-valued top-level prop with `resolveTokens(value, row)`",
and the dev/repeater fixture spec required `{{ row.* }}` tokens for
seven UnitCard props including the numeric `beds`, `baths`, `sqft`,
`rent`. The Repeater integration test (DoD assertion (c)) asserts
"the rent text reflects each row's `currentMarketRent` formatted via
the `money` formatter" — i.e. per-row numeric display.

**What changed:** ComponentRenderer's resolver hook now special-cases
the "the whole prop string is exactly one `{{ row.path }}` token"
pattern: when matched, the prop is replaced with the raw row value
(number, boolean, etc.) instead of the stringified form returned by
`resolveTokens`. Strings that interleave tokens with other text
continue to use `resolveTokens` as written.
`lib/token-resolver/`'s public surface is unchanged
(`resolveTokens(value, row): string`).

**Rationale:** UnitCard's Sprint-5 schema uses `z.number()` (not
`z.coerce.number()`) for the four numeric props, and
`UnitCard/index.tsx` is forbidden to modify in Sprint 9. Without the
passthrough, any token in a numeric prop fails Zod parse, the entire
card falls back to defaults ($0/mo, 0 beds, 0 sqft), and DoD
assertions (c) and (d) of the Repeater integration test cannot pass.
The smallest principled fix is in the resolver hook itself; the
token-resolver module's pure-function contract remains untouched.

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: tokens transparently bind to typed props (numeric, boolean)
  on UnitCard / PropertyCard / future components without weakening
  any per-component schema. Repeater integration test (c)/(d) and
  smoke-test step 3 (per-row rent display + sort-by-rent ordering)
  pass as written. Sprint 9b's detail-page reuse of the same hook is
  unaffected.
- Lose: the literal DoD wording is relaxed to "resolve tokens,
  preserving the underlying value type when the whole string is one
  token" — about ten lines of additional logic in
  `ComponentRenderer.tsx`.
- Risk: a user who writes `"{{ row.x }}"` expecting a string but
  whose row carries a numeric `x` will see the numeric reach
  downstream. UnitCard's existing schema already wants numeric for
  numeric props; for string-only consumers the value coerces back to
  a string via React's normal rendering.

**Affected files / modules:**
- `apps/web/components/renderer/ComponentRenderer.tsx` (the resolver
  hook gains a whole-token detector; both
  `resolveValue`/`resolveProps` paths are local helpers).

**Cross-sprint impact:** None. The token-resolver module's exports
keep their string→string contract. Sprint 9b reuses the same hook
verbatim. Sprint 11 (AI Edit) does not touch renderer prop
resolution.

---

## 2026-04-26 — Sprint 9 — `setComponentDataBinding` wire-up touches store.ts

**Original plan:** Sprint 9 CLAUDE.md DoD: "`types.ts` and `actions.ts`
gain a single new mutator: `setComponentDataBinding: (id: ComponentId,
dataBinding: DataBinding | undefined) => void`. ... Pattern matches
`setComponentProps` already in those files. ... These are the only
two files in `lib/editor-state/` Sprint 9 modifies." `store.ts` is
listed as forbidden in the same file.

**What changed:** The mutator is added to `types.ts` (in
`EditorActions`), `actions.ts` (`applySetComponentDataBinding`), AND
`store.ts` (a single line wiring the action through `set` with the
standard `saveState: "dirty"` flip). The Sprint-9 file scope is
treated as having three modified files in `lib/editor-state/`, not
two.

**Rationale:** Adding `setComponentDataBinding` to the `EditorActions`
type without a matching key in `store.ts`'s `creator` object breaks
the `EditorStore` type contract — `pnpm build` fails. The DoD's
"pattern matches `setComponentProps`" note assumes the existing
three-file pattern; the "only two files" claim is internally
inconsistent with that. The smallest principled fix is to honor the
pattern across all three files; the alternative (a non-`EditorActions`
type alias plus direct `useEditorStore.setState` calls in EditPanel)
diverges from every other EditPanel in the codebase and adds more
complexity than the single-line store entry.

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: pattern parity with `setComponentProps` and the 13 other
  store-bound mutators; the EditPanel uses `useEditorStore((s) =>
  s.setComponentDataBinding)` exactly like every other Sprint-6/7/8
  panel; autosave picks up the `dirty` flip automatically.
- Lose: the DoD's "only two files" claim becomes three.
- Risk: zero — purely additive line consistent with the existing
  pattern; no deletions, no behavior changes outside the new mutator.

**Affected files / modules:**
- `apps/web/lib/editor-state/types.ts` (one line in `EditorActions`).
- `apps/web/lib/editor-state/actions.ts`
  (`applySetComponentDataBinding`).
- `apps/web/lib/editor-state/store.ts` (one wiring line).

**Cross-sprint impact:** None. Sprint 11 will consume the new mutator
through `lib/site-config/ops.ts` per Sprint 9 DoD. No
selectors/autosave changes — those files remain untouched.

---

## 2026-04-26 — Sprint 9 — `fetchSource` is a Server Action

**Original plan:** Sprint 9 CLAUDE.md DoD specified a `"use client"`
Repeater calling `useQuery({ queryFn: () => fetchSource(source) })`,
where `fetchSource` directly invokes `getProperties / getUnits /
getCompany` from `lib/rm-api/`. `lib/rm-api/` is in the forbidden list
(Sprint 1 territory).

**What changed:** `apps/web/lib/site-config/data-binding/fetchSource.ts`
is marked as a Next.js Server Action by adding `"use server"` at the
top of the file. The exported function signature is unchanged
(`fetchSource(source: DataBindingSource): Promise<unknown[]>`). The
Repeater's call site is unchanged. Type and helper exports that
violate the Server-Action constraint (only async functions may be
exported) are repositioned: `UnitWithProperty` moves to `types.ts`;
`joinUnitsWithProperties` becomes a function-scoped helper inside
`fetchSource`. The data-binding `index.ts` barrel continues to
re-export both `fetchSource` and `UnitWithProperty` (now from
`types.ts`).

**Rationale:** `lib/rm-api/` uses the service-role Supabase client,
which depends on a non-`NEXT_PUBLIC_` env var (server-only) and
runtime-throws if instantiated in the browser. The Sprint-1 design
explicitly intended these helpers to run only on the server. Bundling
them into a `"use client"` component (the Sprint-9 Repeater) blows
up `pnpm build` with `You're importing a component that needs
"next/headers"` (transitive via `lib/supabase/index.ts` re-exporting
`server.ts`). Server Actions are the smallest, signature-preserving
fix: the import chain stays as written, but Next.js routes calls
across the network boundary so `lib/rm-api/` never ships to the
client. No new files under `app/api/`, no `lib/rm-api/` modifications.

**User approval (verbatim):** "Approved"

**Trade-offs accepted:**
- Gain: production build succeeds; Repeater code is unchanged;
  service-role key stays on the server; Vitest mocks for
  `@/lib/rm-api` continue to work.
- Lose: every `fetchSource` call now incurs one network round-trip
  to a Next.js Server-Action endpoint instead of in-process. For
  the demo's small Aurora dataset this is invisible; TanStack
  Query's 5-minute `staleTime` keeps it to one round-trip per
  source per session.
- Risk: low. The directive is a Next-bundler convention only —
  outside Next (Vitest), the module behaves like normal ESM. The
  test for `fetchSource` (`__tests__/fetchSource.test.ts`) keeps
  working as written.

**Affected files / modules:**
- `apps/web/lib/site-config/data-binding/fetchSource.ts` (gains
  `"use server"`; helper inlined; type alias removed).
- `apps/web/lib/site-config/data-binding/types.ts` (gains
  `UnitWithProperty` type alias).
- `apps/web/lib/site-config/data-binding/index.ts` (re-exports
  `UnitWithProperty` from `types.ts`).

**Cross-sprint impact:** Sprint 9b reuses the same Server-Action
pattern when fetching for detail pages (RSC paths fetch directly
without the RPC; client paths use the same `fetchSource` action).
Sprint 11 (AI Edit) is unaffected — its fetch state goes through
`/api/ai-edit`, not through `fetchSource`. Sprint 14 (fixtures) is
unaffected — fixtures are generated server-side.

## 2026-04-26 — Sprint 11 — Retroactive cross-sprint test-file fixes (CLAUDE.md §15.9)

**Context:** Sprint 11's quality gates (`pnpm typecheck` and the placeholder
test inside `pnpm test`) surfaced two failures that originated in earlier
sprints' test files. Per the §15.9 carve-out, applied minimal,
behavior-preserving fixes; logged here so the edits are visible at review.

**Files / lines:**

1. `apps/web/components/site-components/Repeater/__tests__/Repeater.test.tsx`
   (line 86 region). The `let resolveUnits: (value: unknown) => void` was
   being assigned a Promise resolver typed as
   `(value: Unit[] | PromiseLike<Unit[]>) => void`; the contravariant
   assignment is a real TS error in strict mode. Added a one-line cast
   `resolve as (value: unknown) => void`. No runtime change. Sprint 9
   territory.

2. `apps/web/components/editor/__tests__/placeholders.test.tsx` (the
   "Right sidebar renders the Sprint 11 placeholder copy" assertion).
   Sprint 11's authorized RightSidebar rewrite removed the Sprint-6
   placeholder copy "Select a component to edit it, or chat with the AI
   assistant". The test was rewritten to assert the new shell renders
   (`getByTestId("right-sidebar")`). The intent — "the right sidebar
   renders without crashing" — is preserved. Sprint 6 territory.

**Both fixes are test-file only.** Production code in another sprint's
domain was not touched.

**No user approval was solicited per §15.9.** Each occurrence is
behavior-preserving and constrained to a single line / single assertion.

## 2026-04-26 — Sprint 13 — Retroactive cross-sprint test-file fix (CLAUDE.md §15.9)

**Context:** Sprint 13 rewrites
`apps/web/components/editor/topbar/DeployButton.tsx` from the Sprint 6
placeholder ("Deploy is coming in a later sprint.") into the real
Element-3 implementation that opens a confirmation dialog, POSTs to
`/api/sites/[siteId]/deploy`, and fires a Sonner success/error toast on
the response. The Sprint 6 placeholder test in
`apps/web/components/editor/__tests__/placeholders.test.tsx` asserted
the toast string the placeholder used to fire and would have failed
under the new implementation, blocking the `pnpm test` quality gate.

**File / lines:**
`apps/web/components/editor/__tests__/placeholders.test.tsx` (the
"Deploy button fires a toast and does not navigate" assertion).
The assertion was rewritten to a "renders without crashing" check via
`expect(screen.getByTestId("deploy-button")).toBeInTheDocument()`,
mirroring how Sprint 11 fixed the parallel right-sidebar placeholder
test in this same file. The unused `fireEvent` import was dropped at
the same time so Biome's noUnusedImports rule stays clean. Sprint 6
territory.

This fix is **test-file only** and behavior-preserving (the test still
verifies that the component renders); production code in another
sprint's domain was not touched. The fix is **pre-authorized by Sprint
13's CLAUDE.md** ("The §15.9 fix is pre-authorized — do NOT raise a
Deviation for the placeholder test rewrite; just do it and log it"),
so no Deviation Report was raised.

**No user approval was solicited per §15.9** -- the constraints
("smallest possible change", "test/config files only", "no behavior
changes") are met; the fix is logged here per the §15.9 contract.

## 2026-04-26 — Sprint 13 — Catch-all directory uses optional brackets `[[...slug]]`

**Context:** Sprint 13's CLAUDE.md "Files you may create or modify"
list specifies the public catch-all route at
`apps/web/app/[site]/[...slug]/page.tsx`. The Definition of Done text,
the manual smoke test, and the resolver test cases collectively
require behavior that only the optional-catch-all variant
(`[[...slug]]`) can provide, however:

- DoD step 1 of the catch-all page: "reads `site` (string) and `slug`
  (string[] | undefined)". The `| undefined` is the param type for
  optional catch-alls only -- a non-optional `[...slug]` always yields
  `string[]`.
- Resolver test case 1 (DoD): "`undefined` slug → resolves to the
  `home` page". Only an optional catch-all ever passes `undefined`.
- Manual smoke test step 9: "navigate to
  `http://localhost:3000/{siteSlug}` (the bare site URL with no
  trailing path). The home page renders". Next.js's non-optional
  `[...slug]` does NOT match the bare parent URL -- only `[[...slug]]`
  does.

**What changed:** Sprint 13 implements the catch-all at
`apps/web/app/[site]/[[...slug]]/page.tsx` (with the resolver helper
and tests in the matching `[[...slug]]/` directory) rather than the
literal `[...slug]/` directory named in the file scope. All other
file paths, exports, and the load-bearing
`// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` insertion-point
comment are unchanged.

**Rationale:** The DoD text and the smoke test are the substantive
specification; the file-scope notation was shorthand consistent with
casual usage where both `[...slug]` and `[[...slug]]` are called
"catch-all" routes. Choosing `[...slug]` would honor a 2-character
typographic detail while breaking smoke test step 9 and the
explicitly-typed `slug: string[] | undefined` API. Sprint 9b's
detail-branch addition is purely additive and unaffected by which
bracket form is used; the insertion-point comment is preserved
verbatim.

**User approval (verbatim):** Not requested -- per the user's standing
guidance ("Surface blockers and unworkable approaches early ...
Critical → ask. Non-critical → flag and keep working"), this 2-char
typographic resolution is non-critical and is being flagged in the
Sprint Completion Report and here rather than blocking the sprint.

**Trade-offs accepted:**
- Gain: smoke test step 9 passes; the bare `/{siteSlug}` URL renders
  the home page; the resolver's `string[] | undefined` API is the
  type Next.js actually delivers.
- Lose: the directory name differs from the file scope by two
  characters (`[[...slug]]` vs. `[...slug]`).
- Risk: if Sprint 9b's plan greps for the literal `[...slug]/page.tsx`
  path it will need to grep for `[[...slug]]/page.tsx` instead. The
  `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` comment is
  preserved verbatim and can be located by content rather than path.

**Affected files / modules:**
- `apps/web/app/[site]/[[...slug]]/page.tsx` (new — instead of
  `[...slug]/page.tsx`).
- `apps/web/app/[site]/[[...slug]]/resolve.ts` (new — pure helper).
- `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` (new —
  resolver unit tests).

**Cross-sprint impact:** Sprint 9b will extend the same file at
`apps/web/app/[site]/[[...slug]]/page.tsx` rather than the
`[...slug]/page.tsx` path named in its plan. The detail-branch
insertion is additive and unaffected by the directory name.

## 2026-04-26 — Sprint 9b — Execution record (detail pages runtime + row-context generalization)

**Context:** Sprint 9b is the third and final piece of the detail-pages story
(PROJECT_SPEC.md §8.12 + §11). Sprint 3b added the schema, Sprint 5b added
the Button/InputField props, Sprint 9 added the row context provider and
token resolver, and Sprint 13 shipped the public catch-all with a load-bearing
`// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` insertion-point comment.
Sprint 9b wires the runtime: a detail-page resolver, the catch-all detail
branch, additive `pageKind`/`row` props on `<Renderer>`, and a Button that
computes `/{detailPageSlug}/{row.id}` at render time when row context is in
scope.

**Pre-flight check result:** PASSED — all fifteen checks satisfied. Branch
is `master`; the catch-all directory is `[[...slug]]` with `page.tsx`,
`resolve.ts`, and `__tests__/page.test.tsx`; the insertion-point comment
was at `page.tsx:88`; `resolveStaticPage`, the row-context surface, the
token-resolver surface, the `ComponentRenderer` resolver hook, the Renderer
export shape, the rm-api `getUnitById` / `getPropertyById` re-exports, the
Sprint 5b Button shape, the Sprint 5b InputField client-component status,
the Repeater row-context wrap, and the Sprint 3b schema's per-kind slug
uniqueness + detail-data-source `superRefine` were all verified before
any non-spec file was modified.

**Files modified:**
- `apps/web/app/[site]/[[...slug]]/resolve.ts` — appended
  `resolveDetailPage(config, slug)` plus a `DetailMatch` type and the
  `/^[1-9]\d*$/` regex. `resolveStaticPage` is unchanged.
- `apps/web/app/[site]/[[...slug]]/page.tsx` — replaced the load-bearing
  insertion-point comment with the detail branch (calls `resolveDetailPage`,
  fetches the row via `getUnitById` / `getPropertyById` based on
  `detailDataSource`, falls through to the existing `notFound()` on a null
  match or null row, otherwise returns
  `<Renderer ... pageKind="detail" row={row} mode="public" />`).
- `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` — appended
  the `resolveDetailPage` describe block with seven cases (single match,
  static-only, U2 disambiguation, single-segment fall-through, three-segment
  fall-through, non-numeric / leading-zero / sign / decimal / whitespace /
  empty trailing segment fall-throughs, undefined / empty slug).
- `apps/web/components/renderer/Renderer.tsx` — added optional
  `pageKind?: "static" | "detail"` and `row?: unknown` props. The page
  lookup now filters by `(p) => p.slug === page && p.kind ===
  (pageKind ?? "static")`. When `pageKind === "detail"` and `row !==
  undefined`, the rootComponent tree is wrapped in
  `<RowContextProvider row={row} kind="detail">`.
- `apps/web/components/site-components/Button/index.tsx` — switched to a
  `"use client"` component (mirroring Sprint 5b's InputField precedent),
  imported `useRow`, and added the detail-href computation. The override
  fires only when `linkMode === "detail"`, `detailPageSlug !== undefined`,
  the row context's `kind !== null`, the row is a non-null object, and
  `row.id` is a `number | string`. `BUTTON_FALLBACK`, `VARIANT_STYLES`,
  `SIZE_STYLES`, the data-attribute emission, and Sprint 5b's silent-
  fallback semantics are unchanged.
- `apps/web/components/site-components/Button/SPEC.md` — updated the
  Data binding section with a new "Detail href computation (Sprint 9b)"
  subsection. No other section is changed.
- `apps/web/components/site-components/Button/__tests__/Button.test.tsx`
  — appended `describe("Button (detail href under row context)")` with
  seven cases (Repeater-kind wrap, Detail-kind wrap, string row.id,
  static-mode unaffected, no-provider unaffected with data attrs intact,
  missing id unaffected, non-scalar id unaffected). Pre-existing Sprint
  5 / Sprint 5b Button tests continue to pass verbatim.

**Files created:**
- `apps/web/components/renderer/__tests__/Renderer.detail.test.tsx` — new
  sibling test file (rather than appending to Sprint 3's
  `Renderer.test.tsx`) so the Sprint 3 test file stays untouched. Four
  cases: pageKind-omitted defaults to static, pageKind=static defaults
  to static, pageKind=detail picks the detail page and resolves
  `{{ row.* }}` tokens via the new RowContextProvider wrap, "Page not
  found" fall-through under pageKind=detail.

**Tests added:** 18 new Vitest cases (7 `resolveDetailPage` + 7 Button
detail-href + 4 Renderer detail-page disambiguation). Total before
sprint: 1015 (1013 passed, 2 skipped). Total after sprint: 1033 (1031
passed, 2 skipped). The pre-existing skip count is unchanged per the DoD.

**Quality gate result:**
- `pnpm test`: 110 test files, 1031 passed, 2 skipped (1033 total).
- `pnpm build`: Compiled successfully in 4.9s; nine static pages
  generated; zero TypeScript errors; zero warnings.
- `pnpm lint`: Checked 352 files in 99ms. No fixes applied.
  (One Biome formatting violation surfaced and was fixed in
  `Button.test.tsx` — wrapping two over-long lines. The fix was
  whitespace-only and did not change test semantics.)

**Authorized hand-offs honored:**
- `apps/web/components/site-components/Button/index.tsx` — server →
  `"use client"` per Sprint 9b CLAUDE.md "Authorized hand-offs".
- `apps/web/components/renderer/Renderer.tsx` — additive `pageKind` /
  `row` props per Sprint 9b CLAUDE.md.
- `apps/web/app/[site]/[[...slug]]/page.tsx` — insertion-point comment
  consumed; static branch and final `notFound()` untouched.
- `apps/web/app/[site]/[[...slug]]/resolve.ts` — `resolveDetailPage`
  appended; `resolveStaticPage` untouched.
- `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` — Sprint
  13 cases preserved verbatim; new `describe("resolveDetailPage")`
  block appended.

**Deviations approved during sprint:** None. Every DoD bullet was
implementable as written; no library, signature, scope, or file-scope
constraint forced a Deviation Report.

**Retroactive cross-sprint fixes (CLAUDE.md §15.9):** None. The
`"use client"` switch on `Button/index.tsx` did NOT cascade type
errors into Sprint 5 / Sprint 5b's existing test file (the imports
were already shape-compatible with a function component); no other
test or config file required a surgical fix.

**Manual smoke test:** Steps 15 and 16 (the `pnpm test` / `pnpm build`
/ `pnpm lint` quality gate and the targeted resolver / Button test
runs) completed from this session and reported in the section above.
Steps 1–14 (the click-by-click flow against the linked hosted Supabase
project) require a human operator at a browser; they are recorded in
the Sprint Completion Report as the un-driven portion. The unit-test
coverage for the resolver, the Button, and the Renderer's pageKind
filter, plus the successful production build of the catch-all route,
collectively give high confidence that the wired path works — but the
DoD's "manual smoke test passes" line is honored only once a human
runs steps 1–14 end-to-end.
