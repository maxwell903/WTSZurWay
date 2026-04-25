-- Creates rm_unit_images per PROJECT_SPEC.md §5.1.
--
-- Each unit can have 1-4 gallery images. id is bigserial here (auto-incrementing),
-- distinguishing it from the bigint PKs on the parent tables; the seed lets the
-- DB assign ids for image rows.
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace once real auth lands.

create table rm_unit_images (
  id bigserial primary key,
  unit_id bigint references rm_units(id),
  image_url text not null,
  display_order int default 0
);

create index rm_unit_images_unit_id_idx on rm_unit_images (unit_id);

alter table rm_unit_images enable row level security;

create policy "rm_unit_images demo full access"
  on rm_unit_images
  for all
  using (true)
  with check (true);
