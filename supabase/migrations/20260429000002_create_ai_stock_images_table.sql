-- Catalog table powering the AI's stock-image picker (PROJECT_SPEC.md §9).
-- Rows with `site_id IS NULL` are global defaults visible to every site;
-- rows with non-null `site_id` are per-site uploads visible only to that
-- site. The AI prompts SELECT WHERE site_id IS NULL OR site_id = $1 so
-- one query path serves both layers.
--
-- `category` is only meaningful on globals (folder of origin under the
-- demo seed) and is null for per-site uploads, where ordering is by
-- created_at desc instead.
--
-- `description` is required because it's the field the AI reads to choose
-- an image. An image without a description is invisible to the AI.
--
-- `unique (storage_path)` keeps the seed migration idempotent and prevents
-- a per-site upload from double-inserting if the route is retried.
--
-- RLS demo-permissive policy mirrors `rm_unit_images` and the rest of the
-- demo tables (PROJECT_SPEC.md §17 / §3.1 — replace once real auth lands).

create table ai_stock_images (
  id           bigserial primary key,
  site_id      uuid null references sites(id) on delete cascade,
  storage_path text not null,
  public_url   text not null,
  category     text null,
  description  text not null,
  created_at   timestamptz default now(),
  unique (storage_path)
);

create index ai_stock_images_site_id_idx on ai_stock_images (site_id);

alter table ai_stock_images enable row level security;

create policy "ai_stock_images demo full access"
  on ai_stock_images
  for all
  using (true)
  with check (true);
