/**
 * /{site}/[[...slug]] -- Element 3's public catch-all.
 *
 * Server component. Reads `params.site` (the site slug) and `params.slug`
 * (an optional URL segment array). Resolves the site by slug, loads the
 * deployed `site_versions` row, parses the config, and renders the matching
 * STATIC page via the shared <Renderer> in `mode="public"`. Sprint 9b will
 * append the detail branch immediately above the final notFound().
 *
 * Per the Sprint 6 deviation that rejected `lib/sites/repo.ts`, the
 * supabase load is inlined here -- three near-duplicate loaders (preview,
 * edit, and this one) is acceptable for the demo; consolidation is a
 * future sprint's concern.
 *
 * Auth is a placeholder per PROJECT_SPEC.md §17 -- read with the
 * service-role client. Replace with audience-scoped policies when real
 * auth lands.
 */

import { Renderer } from "@/components/renderer";
import { type SiteConfig, parseSiteConfig } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveStaticPage } from "./resolve";

type CatchAllPageParams = { site: string; slug?: string[] };
type CatchAllPageProps = { params: Promise<CatchAllPageParams> };

async function loadSiteAndDeployedVersion(siteSlug: string) {
  const supabase = createServiceSupabaseClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, slug, name")
    .eq("slug", siteSlug)
    .maybeSingle();
  if (siteError) throw siteError;
  if (!site) return null;

  const { data: version, error: versionError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", site.id)
    .eq("is_deployed", true)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!version) return null;
  return { site, version };
}

export async function generateMetadata(props: CatchAllPageProps): Promise<Metadata> {
  try {
    const params = await props.params;
    const result = await loadSiteAndDeployedVersion(params.site);
    if (!result) return { title: "Site not found" };
    const config = parseSiteConfig(result.version.config);
    const page = resolveStaticPage(config, params.slug);
    return {
      title: page?.meta?.title ?? config.meta.siteName,
      description: page?.meta?.description ?? config.meta.description,
    };
  } catch {
    return { title: "Site not found" };
  }
}

export default async function CatchAllPage(props: CatchAllPageProps) {
  const params = await props.params;
  const result = await loadSiteAndDeployedVersion(params.site);
  if (!result) notFound();

  let config: SiteConfig;
  try {
    config = parseSiteConfig(result.version.config);
  } catch {
    // Defense-in-depth: the deploy gate already validated against
    // siteConfigSchema, so a corrupted deployed config should never reach
    // here. If it does, surface as 404 rather than crashing the route.
    notFound();
  }

  const staticPage = resolveStaticPage(config, params.slug);
  if (staticPage) {
    return <Renderer config={config} page={staticPage.slug} mode="public" />;
  }

  // === SPRINT 9B INSERTS DETAIL BRANCH HERE ===
  notFound();
}
