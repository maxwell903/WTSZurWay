-- Fixes the seed migration's hardcoded storage paths to match the actual
-- bucket layout (`NebulaDemoPhotos/Property Images/<Category>/...`) rather
-- than the originally-designed `default/<Category>/...`.
--
-- The seed migration in 20260429000003 wrote URLs assuming the
-- `scripts/seed-ai-stock-images.ts` would upload files under
-- `default/<category>/<file>`. In practice the user uploaded the source
-- folder directly via Supabase Studio, preserving the on-disk layout
-- (`NebulaDemoPhotos/Property Images/...`). Rather than re-shuffle 25
-- files in Studio, this migration rewrites the table to point at where
-- the files actually live.
--
-- Idempotent: scoped to rows where `storage_path LIKE 'default/%'`. Once
-- this migration has run once the WHERE clause matches nothing on
-- subsequent runs, so it's safe to re-apply.
--
-- The space in 'Property Images' is URL-encoded as %20 in `public_url`
-- to match the URL Supabase serves for that storage path.

update ai_stock_images
set
  storage_path = replace(storage_path, 'default/', 'NebulaDemoPhotos/Property Images/'),
  public_url = replace(
    public_url,
    '/ai-stock-images/default/',
    '/ai-stock-images/NebulaDemoPhotos/Property%20Images/'
  )
where site_id is null
  and storage_path like 'default/%';
