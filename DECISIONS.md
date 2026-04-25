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