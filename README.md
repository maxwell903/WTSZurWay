# Orion's Belt

Generative AI website builder embedded in Rent Manager X. Property managers
fill out a short form, click generate, and get a fully-styled marketing site
populated with their live Rent Manager data. They can keep editing by chatting
with the AI or by drag-and-drop, then click **Deploy** to go live.

The full product spec lives in [`PROJECT_SPEC.md`](./PROJECT_SPEC.md). The
sprint plan and per-sprint contracts live in [`docs/planning/`](./docs/planning/).
Approved deviations from the spec are recorded in [`DECISIONS.md`](./DECISIONS.md).

## Prerequisites

- **Node.js 20 or newer** -- check with `node -v`. Tested with Node 22.
- **pnpm 9 or newer** -- check with `pnpm -v`. Install with `npm install -g pnpm`
  or `scoop install pnpm`.
- **Supabase CLI** -- check with `supabase --version`. Install with
  `scoop install supabase` (Windows) or `brew install supabase/tap/supabase` (macOS).
- **Anthropic API key** -- from <https://console.anthropic.com>. Not used until
  Sprint 4 but required in `apps/web/.env.local` to keep `pnpm build` quiet.
- **A hosted Supabase project** -- created at <https://supabase.com>. The local
  Docker stack is **not** used (per the 2026-04-25 entry in `DECISIONS.md`).

Vercel and Docker are intentionally not in this list. Vercel is wired up in
Sprint 13. Docker is replaced by the hosted-Supabase decision above.

## One-time setup

```bash
# 1. Clone and install
git clone <this-repo> WTSZurWay
cd WTSZurWay
pnpm install

# 2. Configure env
cp .env.example apps/web/.env.local
# Then fill in the five values in apps/web/.env.local:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY      (KEEP SECRET)
#   SUPABASE_PROJECT_REF
#   ANTHROPIC_API_KEY
#
# All five come from your hosted Supabase project at
# Project Settings -> API and Project Settings -> General, plus your
# Anthropic console key.

# 3. Link the Supabase CLI to your hosted project
supabase login
supabase link --project-ref <your-project-ref>
```

## Core commands

Run from the repo root:

| Command       | What it does                                                     |
|---------------|------------------------------------------------------------------|
| `pnpm dev`    | Start the Next.js dev server at <http://localhost:3000>          |
| `pnpm test`   | Run the Vitest unit-test suite once                              |
| `pnpm build`  | Production build (zero TypeScript errors expected)               |
| `pnpm lint`   | Biome lint + format check (zero warnings expected)               |

## Repo layout

```
WTSZurWay/
├── apps/
│   └── web/                     # Next.js 15 App Router app
│       ├── app/                 # Routes (Element 1, 2, 3 land here)
│       ├── components/          # UI components (rmx-shell, editor, renderer, ui)
│       ├── lib/
│       │   └── supabase/        # Browser, server, and service-role clients
│       ├── types/database.ts    # Generated Supabase types (empty until Sprint 1)
│       ├── __tests__/           # Vitest unit tests
│       └── e2e/                 # Playwright tests (added Sprint 15)
├── supabase/
│   ├── config.toml              # Linked-project config (Sprint 1+ adds migrations)
│   └── migrations/              # SQL migrations (Sprint 1+)
├── docs/planning/               # Sprint plans, schedule, bundle README
├── PROJECT_SPEC.md              # Authoritative product spec
├── DECISIONS.md                 # Append-only deviation log
└── CLAUDE.md                    # Master Claude Code instructions
```

## What ships in each sprint

See [`docs/planning/SPRINT_SCHEDULE.md`](./docs/planning/SPRINT_SCHEDULE.md)
for the full sprint-by-sprint plan, dependency graph, and parallel execution
windows.
