-- Adds the ComPropertyPics (commercial property pictures) seed row to the
-- AI stock-image catalog. The original 25-row seed (migration 003) didn't
-- include this category; it was added to the bucket later by the user.
-- Idempotent on storage_path.

insert into ai_stock_images (site_id, storage_path, public_url, category, description) values
  (
    null,
    'NebulaDemoPhotos/PropertyImages/ComPropertyPics/lcs-evening1.jpg',
    'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/NebulaDemoPhotos/PropertyImages/ComPropertyPics/lcs-evening1.jpg',
    'ComPropertyPics',
    'Commercial property exterior shot at evening with illuminated signage; use for commercial real estate listings, office space sections, or retail property pages.'
  )
on conflict (storage_path) do nothing;
