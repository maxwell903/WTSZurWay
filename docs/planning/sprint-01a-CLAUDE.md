# CLAUDE.md — Sprint 1a: Hosted Supabase Wiring + supabase-js Client

## Mission

Wire the Next.js app at `apps/web/` to a hosted Supabase project. Install `@supabase/supabase-js` and `@supabase/ssr`. Create typed Supabase client factories for browser, server-component, route-handler, and service-role contexts. Link the local Supabase CLI directory to the hosted project so future migrations push to the real DB. Generate the initial TypeScript types file (empty until Sprint 1b adds tables — that's expected). References PROJECT_SPEC.md §3.1 (Supabase) and §3.4 (Infra; superseded by hosted-Supabase decision in DECISIONS.md).

## Spec sections in scope

- PROJECT_SPEC.md §3.1 — Supabase is the database, auth (placeholder), and storage layer
- PROJECT_SPEC.md §3.4 — Infra (NOTE: this section says "Supabase local via Docker"; that has been superseded — see /DECISIONS.md entry from 2026-04-25 about hosted Supabase. Use the hosted approach.)
- PROJECT_SPEC.md §15 — Coding Standards

## Definition of Done

- [ ] `@supabase/supabase-js` and `@supabase/ssr` are installed in `apps/web/`. Versions pinned (not using `^` ranges — exact versions, recorded in `package.json`).
- [ ] `/apps/web/lib/supabase/browser.ts` exports `createBrowserClient()` returning a typed Supabase client for use in client components. Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `/apps/web/lib/supabase/server.ts` exports `createServerClient()` returning a typed Supabase client for use in React Server Components and route handlers. Uses `@supabase/ssr` cookie handling correctly for Next.js 15 App Router.
- [ ] `/apps/web/lib/supabase/service.ts` exports `createServiceClient()` returning a typed Supabase client using `SUPABASE_SERVICE_ROLE_KEY`. This client bypasses RLS — used only in trusted server-side contexts (API routes that need admin access). The file MUST contain a header comment warning that this client must never be imported into client code.
- [ ] `/apps/web/types/database.ts` exists and exports a `Database` type (initially the empty shape Supabase generates when no tables exist — this is expected; Sprint 1b adds tables and a follow-on `pnpm db:types` regeneration will populate it).
- [ ] A `pnpm db:types` script is added to root `package.json` that runs `supabase gen types typescript --project-id <PROJECT_REF> > apps/web/types/database.ts`. The `<PROJECT_REF>` value is read from a config file (see Notes), NOT hardcoded; if reading from a config is impractical, document the trade-off in the Sprint Completion Report's "User Actions Required" so the user can run the command manually after exporting the project ref.
- [ ] `/supabase/config.toml` is updated (or created if 0b left it minimal) with the linked project reference set up for `supabase link` to work. The config includes the `[remotes.production]` block (or equivalent) per the current Supabase CLI conventions.
- [ ] `/supabase/.gitignore` (created if it doesn't exist) excludes `.branches`, `.temp`, and any local-stack artifacts the CLI might create even though we're not running the local stack.
- [ ] All three quality gates pass: `pnpm test && pnpm build && pnpm biome check` with zero failures and zero warnings.
- [ ] Manual smoke test below passes.
- [ ] No new files exist outside the "may create or modify" list.
- [ ] No new dependencies added beyond `@supabase/supabase-js` and `@supabase/ssr` (without an approved Deviation).
- [ ] `/DECISIONS.md` updated if any deviation was approved.
- [ ] Sprint Completion Report emitted with a populated "User Actions Required" section that walks the user through: creating the Supabase project (or identifying their existing one), getting the project ref / URL / keys, putting them in `.env.local`, and running `supabase link`.

## Files you may create or modify

- `/apps/web/package.json` (add `@supabase/supabase-js` and `@supabase/ssr`)
- `/apps/web/lib/supabase/browser.ts`
- `/apps/web/lib/supabase/server.ts`
- `/apps/web/lib/supabase/service.ts`
- `/apps/web/lib/supabase/index.ts` (re-exports)
- `/apps/web/types/database.ts`
- `/package.json` (add `db:types` script)
- `/supabase/config.toml`
- `/supabase/.gitignore`
- `/pnpm-lock.yaml` (auto-updated)

## Files you MUST NOT modify or create

- `/PROJECT_SPEC.md` — read-only; spec is authoritative (with the superseding entry in DECISIONS.md).
- `/supabase/migrations/**` — owned by parallel Sprint 1b.
- `/supabase/seed.sql` — owned by parallel Sprint 1b.
- `/apps/web/lib/rm-api/**` — owned by parallel Sprint 1b.
- `/apps/web/types/rm.ts` — owned by parallel Sprint 1b.
- `/apps/web/app/**` — owned by Sprint 1c (no Supabase consumers added yet).
- `/CLAUDE.md`, `/.env.example`, `/README.md` at the repo root — owned by Sprint 0a; do not modify.
- `/DECISIONS.md` — append-only; add an entry only if a deviation is approved.
- Any file outside the "may create or modify" list above.

## Coding standards (binding — copied from PROJECT_SPEC.md §15)

- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. No `any`. Prefer `unknown` and narrow.
- React: Server components by default. The `service.ts` file MUST NOT have `"use client"`. The `browser.ts` file SHOULD use `"use client"` only if it exports a hook that requires it; the factory itself can be a plain function.
- Naming: files `kebab-case.ts(x)`, exports `camelCase` for functions and `PascalCase` for types.
- No `any`. The Supabase clients are typed via the `Database` generic from `types/database.ts` even when that type is initially empty.
- Comments: `service.ts` MUST have a header comment warning that it bypasses RLS and must never be imported into client code.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of the plan
cannot be implemented exactly as written, you MUST stop and emit a Deviation
Report in the format below. You MUST NOT proceed with an alternative until
the user has explicitly approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries, impossible
function signatures, scope additions, file additions outside the declared
scope, test plans that cannot be executed as written, and any case where you
catch yourself thinking "I'll just do it slightly differently."

### Deviation Report (emit verbatim)

```
DEVIATION DETECTEDSprint: [Sprint number and name]
Failed DoD item: [The exact bullet from Definition of Done that this blocks]What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]Why it's not working (1–2 sentences, technical):
[Brief technical reason.]Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]Trade-offs:

Gain: [What we get]
Lose: [What we give up]
Risk:  [What might break]
Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.