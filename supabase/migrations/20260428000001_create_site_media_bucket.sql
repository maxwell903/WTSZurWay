-- Creates the `site-media` storage bucket. This bucket holds media uploaded
-- from inside the editor's component inspector (Image src, Logo customUrl,
-- Gallery slides) — distinct from `logos` (initial setup-form brand uploads)
-- and `ai-attachments` (AI inspiration screenshots) so storage governance,
-- quotas, and lifecycle can diverge per surface later without retrofitting.
--
-- Public read matches the existing demo posture (see lib/storage/index.ts —
-- both prior buckets are PUBLIC for the demo). When real auth lands the
-- bucket can be flipped to private and replaced with a signed-URL flow.
--
-- Idempotent on bucket id so re-running the migration against an environment
-- where the bucket was already created via dashboard is a no-op rather than
-- a failure.

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;
