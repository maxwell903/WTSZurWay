# Sprint 0: Foundation

## One-line summary
Stand up the empty `WTSZurWay/` repo as a working pnpm monorepo with Next.js 15, TypeScript strict, Tailwind, shadcn/ui, Biome, Vitest, Playwright, and typed Supabase clients pointing at a hosted Supabase project — ending with a hello page that renders, a dummy test that passes, and a green build.

## Spec sections in scope
- PROJECT_SPEC.md §3 — Tech stack (every dependency listed there is installed in this sprint or its sub-sections explain why it is deferred)
- PROJECT_SPEC.md §3.1 — Supabase as DB / auth placeholder / storage (clients only; tables come Sprint 1)
- PROJECT_SPEC.md §3.4 — Infra (NOTE: "Supabase local via Docker" is superseded by the 2026-04-25 entry in DECISIONS.md; use hosted Supabase)
- PROJECT_SPEC.md §4 — Repository layout (this sprint creates the skeleton)
- PROJECT_SPEC.md §14 Sprint 0 — Foundation checklist
- PROJECT_SPEC.md §15 — Coding standards (binding from this sprint forward)

## Dependencies
- Requires completion of: None (this is the first sprint).
- Can run in parallel with: N/A — single-branch workflow.
- Blocks: every other sprint.

## File scope

### Owned (this sprint may create or modify)
- `/package.json` (root, monorepo manifest)
- `/pnpm-workspace.yaml`
- `/pnpm-lock.yaml` (auto-generated)
- `/tsconfig.base.json`
- `/biome.json`
- `/.gitignore`
- `/.editorconfig`
- `/.env.example`
- `/README.md`
- `/CLAUDE.md` (master, repo-root — referenced by every later sprint)
- `/apps/web/package.json`
- `/apps/web/tsconfig.json` (extends base)
- `/apps/web/next.config.mjs`
- `/apps/web/postcss.config.mjs`
- `/apps/web/tailwind.config.ts` (or v4 CSS-first config — see notes)
- `/apps/web/vitest.config.ts`
- `/apps/web/vitest.setup.ts`
- `/apps/web/playwright.config.ts`
- `/apps/web/components.json` (shadcn config)
- `/apps/web/app/layout.tsx`
- `/apps/web/app/page.tsx` (hello)
- `/apps/web/app/globals.css`
- `/apps/web/lib/utils.ts` (`cn()` helper)
- `/apps/web/lib/supabase/browser.ts`
- `/apps/web/lib/supabase/server.ts`
- `/apps/web/lib/supabase/service.ts`
- `/apps/web/lib/supabase/index.ts`
- `/apps/web/types/database.ts` (empty `Database` type stub)
- `/apps/web/components/ui/.gitkeep` (shadcn lands components here in later sprints)
- `/apps/web/__tests__/smoke.test.ts` (one dummy test)
- `/apps/web/e2e/.gitkeep` (Playwright tests land here in Sprint 15)
- `/supabase/config.toml`
- `/supabase/.gitignore`
- `/supabase/migrations/.gitkeep`

### Shared (read-only)
- `/PROJECT_SPEC.md`
- `/DECISIONS.md` (read-only this sprint; do NOT modify — entries are appended only when a deviation is approved)

### Forbidden (do not touch)
- `/PROJECT_SPEC.md` — authoritative; raise concerns via Deviation
- `/DECISIONS.md` — append-only; this sprint adds nothing
- Any file outside the "Owned" list above

## Definition of Done

- [ ] `pnpm install` at the repo root succeeds with zero errors and zero warnings (peer-dep warnings count as warnings).
- [ ] Root `package.json` exposes scripts: `dev`, `build`, `test`, `test:e2e`, `lint`, `format`, `typecheck`, `db:push`, `db:types`, `seed` (the last three may be `echo "Sprint 1 will implement"` placeholders that exit 0; document this in the completion report).
- [ ] `apps/web/package.json` declares Next.js `15.x`, React `19.x`, TypeScript `5.x` strict, and exact-pinned versions (no `^` or `~`) for: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, `@biomejs/biome`, `vitest`, `@vitest/ui`, `@playwright/test`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `clsx`, `tailwind-merge`, `lucide-react`, `class-variance-authority`, `tailwindcss-animate`.
- [ ] `apps/web/tsconfig.json` extends `tsconfig.base.json` and enables `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- [ ] `biome.json` configures Biome to lint AND format. Tab/space, line width, and quote style match a single coherent style — record the choices in the file.
- [ ] Tailwind is wired into `apps/web/app/globals.css`. The hello page demonstrates a Tailwind class actually applies (e.g. visible color/spacing).
- [ ] `apps/web/components.json` is initialized for shadcn/ui (style: `default`, base color: `slate`, CSS variables: yes). No components are installed yet.
- [ ] `apps/web/lib/utils.ts` exports `cn(...inputs: ClassValue[]): string` using `clsx` + `tailwind-merge`.
- [ ] `apps/web/lib/supabase/browser.ts` exports `createBrowserSupabaseClient()` returning a `SupabaseClient<Database>` configured from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using `@supabase/ssr`.
- [ ] `apps/web/lib/supabase/server.ts` exports `createServerSupabaseClient()` for use in React Server Components and route handlers, using `@supabase/ssr` cookie handling correct for Next.js 15 App Router (read `cookies()` from `next/headers`).
- [ ] `apps/web/lib/supabase/service.ts` exports `createServiceSupabaseClient()` reading `SUPABASE_SERVICE_ROLE_KEY`. The file MUST begin with a header comment block warning that this client bypasses RLS and must never be imported into client-side code.
- [ ] `apps/web/lib/supabase/index.ts` re-exports the three factories and the `Database` type.
- [ ] `apps/web/types/database.ts` exports `export type Database = { public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }`. This empty stub will be regenerated in Sprint 1.
- [ ] `/.env.example` lists every env var the app will eventually read with a one-line comment per var: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `ANTHROPIC_API_KEY`. No real values committed.
- [ ] `/.gitignore` excludes: `node_modules`, `.next`, `dist`, `coverage`, `playwright-report`, `test-results`, `.env`, `.env.local`, `.env.*.local`, `*.log`, `.DS_Store`, `apps/web/.next`.
- [ ] `/supabase/config.toml` contains a valid `project_id` field (placeholder `"orions-belt"` is fine — the user will run `supabase link --project-ref` separately, documented in the completion report).
- [ ] `/supabase/.gitignore` excludes `.branches`, `.temp`, and any local-stack artifacts.
- [ ] `/CLAUDE.md` at the repo root contains the master coding standards (copied verbatim from PROJECT_SPEC.md §15) and the Deviation Protocol (verbatim from this sprint's CLAUDE.md §Deviation Protocol). Every later sprint references this file.
- [ ] `/README.md` documents: prerequisites (Node 20+, pnpm 9+, Supabase CLI, Anthropic API key), one-time setup steps (clone, `pnpm install`, copy `.env.example` to `apps/web/.env.local`, fill keys, `supabase login`, `supabase link --project-ref <ref>`), and the four core commands (`pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`).
- [ ] `apps/web/app/page.tsx` renders a centered "Orion's Belt" wordmark + a paragraph stating "Foundation OK — Sprint 0 complete." styled with at least three Tailwind utilities.
- [ ] `apps/web/app/layout.tsx` includes `<html lang="en">` and applies a single Google font (Inter) via `next/font`.
- [ ] `apps/web/__tests__/smoke.test.ts` contains a single Vitest test asserting `cn("a", undefined, "b") === "a b"`. Test passes.
- [ ] `pnpm test` exits 0 with one test passing and zero skipped.
- [ ] `pnpm build` exits 0 with zero TypeScript errors and zero warnings.
- [ ] `pnpm lint` (Biome) exits 0 with zero warnings.
- [ ] `pnpm dev` serves `http://localhost:3000` and the hello page renders without console errors.
- [ ] No new dependencies installed beyond those listed above without an approved Deviation.
- [ ] `/DECISIONS.md` is unchanged (no deviations occurred).

## Manual smoke test (numbered, click-by-click)

1. From a fresh clone (or fresh `git pull` on `main`), run `pnpm install` at the repo root. Verify exit code 0.
2. Copy `.env.example` to `apps/web/.env.local`. Fill in the five required env vars from your hosted Supabase project + your Anthropic API key.
3. Run `pnpm typecheck`. Verify zero errors.
4. Run `pnpm lint`. Verify zero warnings.
5. Run `pnpm test`. Verify one test passes.
6. Run `pnpm build`. Verify "Compiled successfully" and zero warnings.
7. Run `pnpm dev`. Wait for "Ready in Xs".
8. Open `http://localhost:3000`. Verify "Orion's Belt" wordmark + "Foundation OK — Sprint 0 complete." paragraph renders.
9. Open browser devtools → Console. Verify zero errors and zero warnings.
10. Open browser devtools → Network. Verify the page is served as expected (no 4xx, no 5xx).
11. Stop the dev server (`Ctrl+C`).
12. Confirm `apps/web/.env.local` is git-ignored: `git status` does NOT list it.

## Known risks & failure modes

- **Tailwind v4 vs v3 wiring.** Tailwind v4 uses a CSS-first config (`@import "tailwindcss"` in `globals.css` + `@theme` block) and does not need `tailwind.config.ts`. Tailwind v3 uses `tailwind.config.ts` + `@tailwind base/components/utilities`. Pick whichever ships current; document the choice in a comment at the top of `globals.css`. **If shadcn/ui's installer assumes v3 and you chose v4 (or vice versa), follow shadcn's official Next.js 15 / Tailwind v4 guide rather than improvising. If it's not clear which combo works, treat it as a Deviation.**
- **`@supabase/ssr` cookie handling for Next.js 15.** The `cookies()` API in Next 15 returns a Promise. The server-client factory must `await cookies()` if you read it inside the factory. Follow the Supabase SSR docs for Next.js 15 verbatim — there is a specific recipe.
- **Biome vs ESLint default in `create-next-app`.** `create-next-app` ships with ESLint by default. You must remove ESLint and any `eslint-config-next` artifacts after scaffolding, and replace with Biome. Confirm `package.json` has no ESLint deps left over.
- **Service-role key leakage.** The `service.ts` file is a foot-gun. The header comment is mandatory. Add a runtime check: if `typeof window !== "undefined"`, throw immediately. Tests confirm.
- **Pinned versions vs latest.** Use exact versions (no `^`). If a published version has a known incompatibility, pick the most recent stable that does work. Record the chosen versions in the Sprint Completion Report.

## Notes & hints (non-binding)

- The `(rmx)` route group folder will be created by Sprint 1; do not create it here.
- shadcn/ui init creates `components.json`; do not run `shadcn add <component>` in this sprint — components come as later sprints need them.
- The hello page is intentionally minimal. Do NOT build site chrome, navigation, or anything beyond a centered wordmark and one paragraph.
- The dummy Vitest test is intentionally trivial — its purpose is to prove the test runner works end-to-end (transform, jsdom, alias resolution).
- `next/font` requires zero network at runtime — fonts are downloaded at build time. Inter is a safe default.