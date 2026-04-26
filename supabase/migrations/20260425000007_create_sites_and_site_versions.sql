-- Creates the `sites` and `site_versions` tables per PROJECT_SPEC.md §12,
-- verbatim. These are the persistence layer for Element 1's initial
-- generation (Sprint 4) and every later editor save / deploy. Each click of
-- "Save" in the editor (Sprint 6+) inserts a new `site_versions` row;
-- "Deploy" (Sprint 13) flips `is_deployed = true` on the current snapshot.
--
-- RLS is enabled on both tables with a single permissive policy
-- (`USING true / WITH CHECK true`) so the demo can read/write without auth.
-- Auth is a placeholder per PROJECT_SPEC.md §17 / §3.1 — replace these
-- policies with audience-scoped rules once real auth lands. The naming
-- mirrors the existing `rm_*` migrations ("<table> demo full access").
--
-- Two partial unique indexes enforce the per-site invariants from §12:
--   * at most one row per site_id has `is_working = true`
--   * at most one row per site_id has `is_deployed = true`
-- These indexes are NOT in the verbatim §12 DDL but are required by the
-- sprint plan and by the application's reliance on a single working /
-- single deployed version per site.

create table sites (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  owner_id uuid,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references sites(id) on delete cascade,
  config jsonb not null,
  created_by text,
  source text,
  created_at timestamptz default now(),
  is_working boolean default true,
  is_deployed boolean default false,
  parent_version_id uuid references site_versions(id)
);

create unique index site_versions_one_working_per_site
  on site_versions (site_id)
  where is_working = true;

create unique index site_versions_one_deployed_per_site
  on site_versions (site_id)
  where is_deployed = true;

alter table sites enable row level security;
alter table site_versions enable row level security;

create policy "sites demo full access"
  on sites
  for all
  using (true)
  with check (true);

create policy "site_versions demo full access"
  on site_versions
  for all
  using (true)
  with check (true);
