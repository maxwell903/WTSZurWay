-- Creates rm_property_amenities per PROJECT_SPEC.md §5.1.
--
-- Many-to-many bag of amenity strings keyed by (property_id, amenity). The
-- composite PK already indexes its leading column, so the explicit FK index
-- below is redundant but listed in the sprint DoD ("indexes on all FK
-- columns"); keeping it makes the contract auditable without measurable cost.
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace once real auth lands.

create table rm_property_amenities (
  property_id bigint references rm_properties(id),
  amenity text,
  primary key (property_id, amenity)
);

create index rm_property_amenities_property_id_idx on rm_property_amenities (property_id);

alter table rm_property_amenities enable row level security;

create policy "rm_property_amenities demo full access"
  on rm_property_amenities
  for all
  using (true)
  with check (true);
