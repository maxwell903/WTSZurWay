-- Creates the `ai-stock-images` storage bucket. This bucket holds the
-- global stock images (under default/<category>/...) and per-site uploads
-- (under <site_id>/...) that the AI prompts read when populating Image
-- components — distinct from `site-media` (editor inspector uploads),
-- `logos` (setup-form brand uploads), and `ai-attachments` (inspiration
-- screenshots) so storage governance can diverge per surface later.
--
-- Public read matches the existing demo posture (other buckets are PUBLIC
-- per Sprint 2c). When real auth lands the bucket can be flipped to private
-- and replaced with a signed-URL flow.
--
-- Idempotent on bucket id so re-running the migration against an
-- environment where the bucket was created via dashboard is a no-op.

insert into storage.buckets (id, name, public)
values ('ai-stock-images', 'ai-stock-images', true)
on conflict (id) do nothing;
