import type { Page, SiteConfig } from "@/lib/site-config";

/**
 * Look up the STATIC page that should render for a given URL slug array.
 *
 * Sprint 13 owns the static branch only -- detail pages (kind === "detail")
 * are matched by Sprint 9b's detail branch in the catch-all page itself.
 * This helper is intentionally narrowed to `kind === "static"` so the U2
 * routing pattern (PROJECT_SPEC.md §11: a static and a detail page may share
 * a slug) resolves cleanly here -- the static page wins for the bare slug,
 * and Sprint 9b handles the deeper detail path with its own resolver.
 */
export function resolveStaticPage(config: SiteConfig, slug: string[] | undefined): Page | null {
  const slugPath = (slug?.join("/") ?? "") || "home";
  const page = config.pages.find((p) => p.kind === "static" && p.slug === slugPath);
  return page ?? null;
}

export type DetailMatch = { page: Page; rowId: number };

// Positive integer with no leading zero, no sign, no decimal. PROJECT_SPEC.md
// §8.12 explicitly rejects non-numeric ids; the regex also rejects "0"/"01"
// to keep the URL space deterministic (Number("01") === 1 would otherwise
// alias to "/units/1").
const POSITIVE_INT_RE = /^[1-9]\d*$/;

/**
 * Match a `/{site}/{slug}/{id}` URL against the config's detail pages. Returns
 * the matched detail Page plus a parsed numeric `rowId`, or null if the slug
 * is not exactly two segments, the trailing segment is not a positive integer,
 * or no detail page has the matching first-segment slug. PROJECT_SPEC.md §8.12.
 */
export function resolveDetailPage(
  config: SiteConfig,
  slug: string[] | undefined,
): DetailMatch | null {
  if (slug === undefined || slug.length !== 2) return null;
  const [pageSlug, idRaw] = slug;
  if (pageSlug === undefined || idRaw === undefined) return null;
  if (!POSITIVE_INT_RE.test(idRaw)) return null;
  const page = config.pages.find((p) => p.kind === "detail" && p.slug === pageSlug);
  if (!page) return null;
  return { page, rowId: Number(idRaw) };
}
