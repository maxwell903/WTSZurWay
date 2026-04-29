-- Seeds the 25 default AI stock images. Pre-written with the project's
-- known public URL prefix rather than emitted by scripts/seed-ai-stock-images.ts
-- so the migration can land in source control before the bucket files are
-- uploaded — descriptions reviewed in advance.
--
-- Run scripts/seed-ai-stock-images.ts (or upload via Studio) AFTER pushing
-- this migration to populate the actual bucket objects at the storage_paths
-- listed below. Until then the rows exist but their public_url 404s.
--
-- Idempotent on storage_path; re-running is a no-op.

insert into ai_stock_images (site_id, storage_path, public_url, category, description) values
  (null, 'default/CustomerPhotos/SmilingHeadshot1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/CustomerPhotos/SmilingHeadshot1.jpg', 'CustomerPhotos', 'Smiling professional headshot, used for testimonials, team rosters, and customer-success sections.'),
  (null, 'default/CustomerPhotos/SmilingHeadshot2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/CustomerPhotos/SmilingHeadshot2.jpg', 'CustomerPhotos', 'Smiling professional headshot, alternative composition for testimonial / about-us pages.'),
  (null, 'default/CustomerPhotos/SmilingHeadshot3.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/CustomerPhotos/SmilingHeadshot3.jpg', 'CustomerPhotos', 'Smiling professional headshot, third variant for team or testimonial grids.'),
  (null, 'default/InteriorPics/Interior1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/InteriorPics/Interior1.jpg', 'InteriorPics', 'Modern apartment interior, neutral tones, good for unit-feature and amenity sections.'),
  (null, 'default/InteriorPics/Interior2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/InteriorPics/Interior2.jpg', 'InteriorPics', 'Apartment interior, alternative angle for gallery rotations or unit detail pages.'),
  (null, 'default/InteriorPics/Interior3.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/InteriorPics/Interior3.jpg', 'InteriorPics', 'Apartment interior, third interior shot for unit galleries.'),
  (null, 'default/MFHPropertyPics/MFH1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFHPropertyPics/MFH1.jpg', 'MFHPropertyPics', 'Multi-family housing exterior — apartment complex; use for property hero or featured-property sections.'),
  (null, 'default/MFHPropertyPics/MFH2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFHPropertyPics/MFH2.jpg', 'MFHPropertyPics', 'Multi-family apartment-complex exterior, alternative composition.'),
  (null, 'default/MFHPropertyPics/MFH3.jpeg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFHPropertyPics/MFH3.jpeg', 'MFHPropertyPics', 'Multi-family apartment-complex exterior, third variant.'),
  (null, 'default/MFPropertyPics/MF1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MF1.jpg', 'MFPropertyPics', 'Manufactured-housing exterior — single mobile home; use for properties focused on manufactured / trailer housing.'),
  (null, 'default/MFPropertyPics/MF2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MF2.jpg', 'MFPropertyPics', 'Manufactured-home exterior, alternative composition.'),
  (null, 'default/MFPropertyPics/MF3.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MF3.jpg', 'MFPropertyPics', 'Manufactured-home exterior, third variant.'),
  (null, 'default/MFPropertyPics/MFGroup1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MFGroup1.jpg', 'MFPropertyPics', 'Manufactured-housing community — multiple mobile homes together; use for park / community sections.'),
  (null, 'default/MFPropertyPics/MFGroup2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MFGroup2.jpg', 'MFPropertyPics', 'Manufactured-housing community, alternative angle.'),
  (null, 'default/MFPropertyPics/MfGroup3.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/MFPropertyPics/MfGroup3.jpg', 'MFPropertyPics', 'Manufactured-housing community, third community-scale variant.'),
  (null, 'default/ProfessionalPeoplePics/2peopleworkingonIpad.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/ProfessionalPeoplePics/2peopleworkingonIpad.jpg', 'ProfessionalPeoplePics', 'Two professionals collaborating on a tablet; use for service / process / about-us sections.'),
  (null, 'default/ProfessionalPeoplePics/3peoplecollaborating.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/ProfessionalPeoplePics/3peoplecollaborating.jpg', 'ProfessionalPeoplePics', 'Three professionals collaborating around a screen; use for team or services sections.'),
  (null, 'default/ProfessionalPeoplePics/ShakingHandsPhoto.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/ProfessionalPeoplePics/ShakingHandsPhoto.jpg', 'ProfessionalPeoplePics', 'Two business people shaking hands; use for partnerships, agreements, or contact sections.'),
  (null, 'default/ProfessionalPeoplePics/TeamPhoto.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/ProfessionalPeoplePics/TeamPhoto.jpg', 'ProfessionalPeoplePics', 'Group team photo; use for "about us" or team pages.'),
  (null, 'default/SFHPropertyPics/SFH1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFH1.jpg', 'SFHPropertyPics', 'Single-family home exterior; use for SFH-focused property listings or hero sections.'),
  (null, 'default/SFHPropertyPics/SFH2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFH2.jpg', 'SFHPropertyPics', 'Single-family home exterior, alternative composition.'),
  (null, 'default/SFHPropertyPics/SFH5.jpeg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFH5.jpeg', 'SFHPropertyPics', 'Single-family home exterior, third variant.'),
  (null, 'default/SFHPropertyPics/SFHGroup1.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFHGroup1.jpg', 'SFHPropertyPics', 'Cluster of single-family homes — neighborhood / community shot.'),
  (null, 'default/SFHPropertyPics/SFHGroup2.jpg', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFHGroup2.jpg', 'SFHPropertyPics', 'Single-family neighborhood, alternative composition.'),
  (null, 'default/SFHPropertyPics/SFHGroup3.avif', 'https://duxvdehwrblnabkqwzqo.supabase.co/storage/v1/object/public/ai-stock-images/default/SFHPropertyPics/SFHGroup3.avif', 'SFHPropertyPics', 'Single-family neighborhood, third variant (AVIF format).')
on conflict (storage_path) do nothing;
