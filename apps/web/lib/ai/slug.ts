/**
 * Slug derivation for the `sites.slug` column.
 *
 * `deriveSiteSlug` is pure and deterministic: same input -> same output.
 * `ensureUniqueSlug` consults the database and appends `-2`, `-3`, … until
 * it finds an unused slug. The two are split so that `deriveSiteSlug` is
 * trivially testable without a database connection.
 *
 * The TOCTOU race (two concurrent requests pick the same suffix) is
 * documented in the Sprint 4 plan as acceptable for the demo. Postgres'
 * unique constraint on `sites.slug` will surface as a 23505 error if it
 * happens; the route handler catches that and returns an `auth_error`
 * (catch-all). Sprint 14 may add a real lock/upsert path.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";

const MAX_SLUG_LENGTH = 60;
const FALLBACK_SLUG = "site";

export type DeriveSiteSlugInput = {
  companyName: string;
  currentWebsiteUrl?: string;
};

export function deriveSiteSlug(input: DeriveSiteSlugInput): string {
  const fromUrl = extractHostnameSlug(input.currentWebsiteUrl);
  if (fromUrl) return fromUrl;

  return slugify(input.companyName);
}

function extractHostnameSlug(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    // Drop the TLD; "aurora-cincy.com" -> "aurora-cincy".
    const dot = host.lastIndexOf(".");
    const stripped = dot > 0 ? host.slice(0, dot) : host;
    return slugify(stripped);
  } catch {
    return "";
  }
}

function slugify(raw: string): string {
  // 1. NFKD-normalize so diacritics decompose into base char + combining mark,
  //    then strip the combining marks. This lets "Pâtisserie" become "patisserie".
  const ascii = raw
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    // 2. Lowercase.
    .toLowerCase()
    // 3. Replace any non [a-z0-9-] (including whitespace) with `-`. Multi-char
    //    runs collapse on the next step.
    .replace(/[^a-z0-9-]+/g, "-")
    // 4. Collapse runs of `-`.
    .replace(/-+/g, "-")
    // 5. Strip leading/trailing `-`.
    .replace(/^-|-$/g, "")
    // 6. Cap length.
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/g, "");

  return ascii || FALLBACK_SLUG;
}

export async function ensureUniqueSlug(slug: string): Promise<string> {
  const supabase = createServiceSupabaseClient();
  let candidate = slug;
  let suffix = 2;
  // The loop is bounded in practice; 1000 is a paranoia cap that should
  // never be reached for the demo (one site per company name).
  for (let attempt = 0; attempt < 1000; attempt++) {
    const { data, error } = await supabase
      .from("sites")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  // Fall through: extremely unlikely; surface as a generic conflict so the
  // route handler can map it to auth_error per the Sprint 4 plan.
  throw new Error(`Could not derive unique slug starting from "${slug}"`);
}
