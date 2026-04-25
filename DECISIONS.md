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