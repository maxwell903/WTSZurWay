-- Creates rm_properties per PROJECT_SPEC.md §5.1.
--
-- Properties are the top-level RM entity -- apartment buildings, commercial
-- centers, manufactured-housing communities. property_type is constrained to
-- the three values used by the renderer's filters.
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace once real auth lands.

create table rm_properties (
  id bigint primary key,
  name text not null,
  short_name text,
  property_type text check (property_type in ('Residential', 'Commercial', 'ManufacturedHousing')),
  email text,
  primary_phone text,
  street text,
  city text,
  state text,
  postal_code text,
  hero_image_url text
);

alter table rm_properties enable row level security;

create policy "rm_properties demo full access"
  on rm_properties
  for all
  using (true)
  with check (true);
