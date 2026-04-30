-- Allows the anon (and authenticated) role to INSERT into the
-- `ai-stock-images` storage bucket. Without this policy, browser-side
-- uploads via `uploadStockImage` (which uses the anon-key client) fail
-- with "new row violates row-level security policy" because Supabase
-- Storage gates `storage.objects` writes behind RLS.
--
-- Mirrors the existing "anon insert site-media" policy. Read is already
-- public on the bucket itself (created in 20260429000001), and deletes
-- go through the server route's service-role client, so we don't need
-- SELECT / UPDATE / DELETE policies for the anon role.
--
-- Idempotent: dropped first so re-running the migration is safe.

drop policy if exists "anon insert ai-stock-images" on storage.objects;

create policy "anon insert ai-stock-images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'ai-stock-images');
