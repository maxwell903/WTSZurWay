-- Creates rm_units per PROJECT_SPEC.md §5.1.
--
-- Units belong to a property (FK to rm_properties.id). The renderer filters
-- units by availability, bedrooms, max rent, and parent property; the index on
-- property_id keeps the per-property listing query cheap as the seed grows.
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace once real auth lands.

create table rm_units (
  id bigint primary key,
  property_id bigint references rm_properties(id),
  unit_name text not null,
  square_footage int,
  bedrooms int,
  bathrooms numeric(3, 1),
  current_market_rent numeric(10, 2),
  is_available boolean default true,
  available_date date,
  primary_image_url text,
  description text
);

create index rm_units_property_id_idx on rm_units (property_id);

alter table rm_units enable row level security;

create policy "rm_units demo full access"
  on rm_units
  for all
  using (true)
  with check (true);
