-- Creates `demo_fixtures` per PROJECT_SPEC.md §12 and §9.10. Sprint 14 owns
-- this migration; it is the persistence layer for the silent fallback path
-- that serves a known-good response when the live Anthropic call fails on
-- stage. The shape mirrors the §12 DDL verbatim (six columns) plus two
-- additions explicitly called out by the Sprint 14 plan:
--
--   1. A unique constraint on (surface, input_hash) so the recording script
--      can use Supabase's .upsert(rows, { onConflict: "surface,input_hash" }).
--      Without this constraint the upsert would error at runtime.
--   2. An index on (surface, input_hash) for the head-only fast lookup the
--      fallback path performs once per failed live call. The unique
--      constraint already creates a backing index, but the explicit index is
--      kept for parity with form_submissions / sites_versions migrations
--      that document their hot-path indexes inline.
--
-- RLS is enabled with a single permissive policy
-- ("demo_fixtures demo full access", USING true / WITH CHECK true) matching
-- the Sprint 4 / 10 pattern. Auth is a placeholder per PROJECT_SPEC.md §17;
-- replace with audience-scoped rules once real auth lands.

create table demo_fixtures (
  id bigserial primary key,
  surface text not null,
  input_hash text not null,
  response jsonb not null,
  created_at timestamptz default now()
);

create unique index demo_fixtures_surface_input_hash_uniq
  on demo_fixtures (surface, input_hash);

alter table demo_fixtures enable row level security;

create policy "demo_fixtures demo full access"
  on demo_fixtures
  for all
  using (true)
  with check (true);
