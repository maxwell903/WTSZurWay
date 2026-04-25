-- Creates rm_company per PROJECT_SPEC.md §5.1.
--
-- The mock Rent Manager "company" record holds the property manager's tenant
-- info -- the Orion's Belt user's own company. Exactly one row is seeded for
-- the demo brand (Aurora Property Group, see PROJECT_SPEC.md §13.4).
--
-- RLS is enabled with a single permissive policy (USING true / WITH CHECK true)
-- so the anon key can read for the demo. Auth is a placeholder per
-- PROJECT_SPEC.md §17 / §3.1; replace this policy with audience-scoped rules
-- once real auth lands.

create table rm_company (
  id bigint primary key,
  name text not null,
  legal_name text,
  primary_phone text,
  email text,
  street text,
  city text,
  state text,
  postal_code text,
  logo_url text
);

alter table rm_company enable row level security;

create policy "rm_company demo full access"
  on rm_company
  for all
  using (true)
  with check (true);
