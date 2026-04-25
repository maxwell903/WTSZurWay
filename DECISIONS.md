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