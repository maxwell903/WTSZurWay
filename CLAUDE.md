# CLAUDE.md -- Master coding standards & Deviation Protocol

This is the **root** CLAUDE.md for the Orion's Belt monorepo. Every Claude
Code session in this repo loads this file. Every per-sprint `CLAUDE.md`
inherits the rules below.

The authoritative spec is [`PROJECT_SPEC.md`](./PROJECT_SPEC.md). When this
file and the spec disagree, the spec wins -- raise the conflict via the
Deviation Protocol below.

The append-only deviation log is [`DECISIONS.md`](./DECISIONS.md). Every
approved deviation is recorded there. Notable existing entry: the
2026-04-25 decision that supersedes `PROJECT_SPEC.md` §3.4 -- this project
uses **hosted** Supabase, not local Supabase via Docker.

---

## Coding standards (copied verbatim from PROJECT_SPEC.md §15)

### 15.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs: `type SiteId = string & { __brand: "SiteId" }`.

### 15.2 React

- Server components by default. `"use client"` only where needed.
- One component per file. File name = export name.
- Use `cn(...)` helper from shadcn for class merging.
- No prop drilling deeper than 2 levels -- lift to Zustand.

### 15.3 Naming

- Files: `kebab-case.ts(x)`.
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- Database tables: `snake_case`.
- DB columns: `snake_case`.
- TypeScript fields: `camelCase` (translate at the boundary).

### 15.4 Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- One concern per commit. If a commit message has "and" in it, split it.

### 15.5 Testing

- Unit-test every operation in `lib/site-config/ops.ts`.
- Unit-test the renderer with handcrafted configs.
- One Playwright test that runs the full demo script end to end.
- Tests run in CI on push.

### 15.6 Comments

- Comment *why*, not *what*. Code says what.
- TODO comments must include a person/owner: `// TODO(max): handle palette overrides`.
- No commented-out code in committed files.

### 15.7 Quality gates (binding for every sprint)

A sprint is not "done" until ALL of the following pass with zero failures
and zero warnings:

- `pnpm test` (Vitest, all tests including new ones).
- `pnpm build` (Next.js production build, zero TypeScript errors).
- `pnpm biome check` (lint + format, zero warnings).
- The sprint's manual smoke test (numbered click-by-click) on a fresh `pnpm dev`.

If any check fails, treat it as a Deviation per §15.8. Do not commit. Do
not declare the sprint complete.

### 15.8 Deviation discipline

Claude Code MUST NOT silently substitute, downgrade, or skip work. The
full Deviation Protocol is below. Every sprint inherits it. Summary:

- A deviation is anything that prevents implementing the sprint exactly as planned.
- On detecting a deviation: stop, emit a Deviation Report, wait for explicit user approval.
- Approved alternatives are logged in `/DECISIONS.md` (append-only).
- "I can do it slightly differently" counts as a deviation.

---

## Deviation Protocol (mandatory -- do not modify)

If you (Claude Code) discover during any sprint that ANY part of the plan
cannot be implemented exactly as written, you MUST stop and emit a Deviation
Report in the format below. You MUST NOT proceed with an alternative until
the user has explicitly approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries, impossible
function signatures, scope additions, file additions outside the declared
scope, test plans that cannot be executed as written, and any case where you
catch yourself thinking "I'll just do it slightly differently."

### Deviation Report (emit verbatim)

```
🛑 DEVIATION DETECTED

Sprint: [Sprint number and name]
Failed DoD item: [The exact bullet from Definition of Done that this blocks]

What's not working (1-2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]

Why it's not working (1-2 sentences, technical):
[Brief technical reason.]

Proposed alternative (1-2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]

Trade-offs:
- Gain: [What we get]
- Lose: [What we give up]
- Risk:  [What might break]

Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]

Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.
```

After emitting the report, STOP. Do not write code. Do not edit files. Wait.

### Approval handling

- "Approved" -> implement the proposed alternative as written.
- "Approved with changes: [...]" -> implement with the user's modifications.
- "Rejected -- [direction]" -> discard the proposal; follow the new direction.
- A clarifying question -> answer it; do not start work yet.
- Anything else -> ask "Is that an approval to proceed?" Do not assume.

After any approved deviation, append an entry to `/DECISIONS.md` with date,
sprint, what was changed, and the user's approval message verbatim.

---

## Useful local commands

- `pnpm dev` -- Next.js dev server at http://localhost:3000
- `pnpm test` -- Vitest (unit tests)
- `pnpm test:e2e` -- Playwright (the demo flow E2E, once written)
- `pnpm build` -- production build
- `pnpm lint` -- Biome check (lint + format check)
- `pnpm format` -- Biome format --write
- `pnpm typecheck` -- TypeScript no-emit check
- `pnpm db:push` -- Sprint 1 wires this to `supabase db push` against the linked hosted project
- `pnpm db:types` -- Sprint 1 wires this to `supabase gen types typescript --project-id $SUPABASE_PROJECT_REF`
- `pnpm seed` -- Sprint 1 wires this to the seed script
