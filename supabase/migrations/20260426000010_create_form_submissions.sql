-- Creates `form_submissions` per PROJECT_SPEC.md §8.10 and §12, verbatim.
-- Sprint 10 wires the public-facing `Form` component to POST submissions
-- here; the editor's Data tab reads them back via aggregate + per-form
-- table queries.
--
-- RLS is enabled with a single permissive policy ("form_submissions demo
-- full access", USING true / WITH CHECK true) matching the pattern set by
-- the rm_* and sites/site_versions migrations. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1 -- replace this policy with audience-scoped
-- rules once real auth lands.
--
-- The `form_submissions_site_form_idx` index is NOT in the verbatim §12
-- DDL; it exists to keep the Data tab's per-form aggregate query
-- (count(*) GROUP BY form_id) cheap as submission volume grows.

create table form_submissions (
  id bigserial primary key,
  site_id uuid references sites(id) on delete cascade,
  form_id text not null,
  page_slug text,
  submitted_data jsonb not null,
  submitter_ip text,
  user_agent text,
  created_at timestamptz default now()
);

create index form_submissions_site_form_idx
  on form_submissions (site_id, form_id);

alter table form_submissions enable row level security;

create policy "form_submissions demo full access"
  on form_submissions
  for all
  using (true)
  with check (true);
