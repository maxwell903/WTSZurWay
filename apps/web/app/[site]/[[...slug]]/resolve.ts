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
