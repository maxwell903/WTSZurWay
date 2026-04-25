-- Creates rm_unit_amenities per PROJECT_SPEC.md §5.1.
--
-- Many-to-many bag of unit-level amenity strings keyed by (unit_id, amenity).
-- See rm_property_amenities for the rationale behind the explicit FK index.
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace once real auth lands.

create table rm_unit_amenities (
  unit_id bigint references rm_units(id),
  amenity text,
  primary key (unit_id, amenity)
);

create index rm_unit_amenities_unit_id_idx on rm_unit_amenities (unit_id);

alter table rm_unit_amenities enable row level security;

create policy "rm_unit_amenities demo full access"
  on rm_unit_amenities
  for all
  using (true)
  with check (true);
