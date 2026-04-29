// Browser-side uploads to Supabase Storage. Used by Element 1 (the setup
// form) to push the user's company logos to the `logos` bucket and AI
// inspiration screenshots to the `ai-attachments` bucket. Both buckets are
// PUBLIC for the demo (see User Actions Required in the Sprint 2c report) so
// the returned `getPublicUrl` is safe to put in `<img src>` everywhere.
//
// We always create a fresh browser client per call rather than caching a
// module-level singleton — the cost is trivial and it sidesteps any HMR /
// stale-credential weirdness during dev.

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type UploadResult = { url: string; path: string };

export const LOGO_BUCKET = "logos";
export const ATTACHMENT_BUCKET = "ai-attachments";
export const SITE_MEDIA_BUCKET = "site-media";
export const AI_STOCK_IMAGES_BUCKET = "ai-stock-images";

// Lowercase, swap whitespace for `-`, drop anything that isn't `[a-z0-9._-]`.
// Combined with a `Date.now()` prefix this makes paths unambiguous and
// collision-free for the demo. Empty input returns "file" so we never emit
// a bare timestamp.
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  return cleaned.length > 0 ? cleaned : "file";
}

async function uploadTo(bucket: string, file: File, pathOverride?: string): Promise<UploadResult> {
  const supabase = createBrowserSupabaseClient();
  const path = pathOverride ?? `${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(`Upload to ${bucket} failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(`Failed to read public URL for ${bucket}/${path}`);
  }

  return { url: data.publicUrl, path };
}

export function uploadLogo(file: File): Promise<UploadResult> {
  return uploadTo(LOGO_BUCKET, file);
}

export function uploadAttachment(file: File): Promise<UploadResult> {
  return uploadTo(ATTACHMENT_BUCKET, file);
}

export function uploadSiteMedia(file: File): Promise<UploadResult> {
  return uploadTo(SITE_MEDIA_BUCKET, file);
}

export function uploadStockImage(file: File, siteId: string): Promise<UploadResult> {
  const path = `${siteId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return uploadTo(AI_STOCK_IMAGES_BUCKET, file, path);
}
