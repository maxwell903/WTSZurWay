-- Second-pass fix for the seed paths. Migration 20260429000004 rewrote the
-- 25 default rows from `default/<Category>/...` to `NebulaDemoPhotos/Property
-- Images/<Category>/...`, but the actual bucket layout (after the user's
-- Studio drag-and-drop) is different on three counts:
--
--   1. The `Property Images` folder is now `PropertyImages` (no space).
--   2. `CustomerPhotos` was moved up one level — it lives under
--      `NebulaDemoPhotos/` directly, NOT under `PropertyImages/`.
--   3. `ProfessionalPeoplePics` was renamed to `PropertyManagerTeamPics`
--      and also moved up one level (under `NebulaDemoPhotos/` directly).
--
-- This migration idempotently shifts the seed rows to those actual paths.
-- WHERE clauses are scoped narrowly so a re-run is a no-op.
--
-- (Migrations 003 and 004 are kept as-is rather than edited per the
-- append-only history convention. End state after running 003 → 004 → 005:
-- `storage_path` matches what's actually in the bucket.)

-- 1. CustomerPhotos: drop the "Property Images/" segment
update ai_stock_images
set
  storage_path = replace(
    storage_path,
    'NebulaDemoPhotos/Property Images/CustomerPhotos/',
    'NebulaDemoPhotos/CustomerPhotos/'
  ),
  public_url = replace(
    public_url,
    '/ai-stock-images/NebulaDemoPhotos/Property%20Images/CustomerPhotos/',
    '/ai-stock-images/NebulaDemoPhotos/CustomerPhotos/'
  )
where site_id is null
  and storage_path like 'NebulaDemoPhotos/Property Images/CustomerPhotos/%';

-- 2. ProfessionalPeoplePics → PropertyManagerTeamPics + flatten
update ai_stock_images
set
  storage_path = replace(
    storage_path,
    'NebulaDemoPhotos/Property Images/ProfessionalPeoplePics/',
    'NebulaDemoPhotos/PropertyManagerTeamPics/'
  ),
  public_url = replace(
    public_url,
    '/ai-stock-images/NebulaDemoPhotos/Property%20Images/ProfessionalPeoplePics/',
    '/ai-stock-images/NebulaDemoPhotos/PropertyManagerTeamPics/'
  )
where site_id is null
  and storage_path like 'NebulaDemoPhotos/Property Images/ProfessionalPeoplePics/%';

-- 3. Remaining property categories: "Property Images" → "PropertyImages"
update ai_stock_images
set
  storage_path = replace(
    storage_path,
    'NebulaDemoPhotos/Property Images/',
    'NebulaDemoPhotos/PropertyImages/'
  ),
  public_url = replace(
    public_url,
    '/ai-stock-images/NebulaDemoPhotos/Property%20Images/',
    '/ai-stock-images/NebulaDemoPhotos/PropertyImages/'
  )
where site_id is null
  and storage_path like 'NebulaDemoPhotos/Property Images/%';
