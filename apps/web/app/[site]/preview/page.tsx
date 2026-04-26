/**
 * /{site}/preview -- Element 1's iframe target.
 *
 * Server component. Reads `params.site` (the site slug) and `searchParams.v`
 * (an optional version id). Resolves the site by slug, then resolves the
 * version: by id if `v` is present, else the row with `is_working = true`,
 * else the most recent row. Validates the stored config against
 * `siteConfigSchema` and renders the shared `<Renderer>` in `mode="preview"`.
 *
 * Returns Next.js notFound() when the site or version is missing -- the
 * route exists but the resource doesn't, which is the standard 404
 * convention.
 *
 * Auth is a placeholder per PROJECT_SPEC.md §17 -- read with the
 * service-role client. Replace with audience-scoped policies when real
 * auth lands.
 */

import { Renderer } from "@/components/renderer";
import { parseSiteConfig } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PreviewPageParams = { site: string };
type PreviewPageSearchParams = {
  v?: string | string[];
  page?: string | string[];
};

type PreviewPageProps = {
  params: Promise<PreviewPageParams>;
  searchParams: Promise<PreviewPageSearchParams>;
};

function singular(value: string | string[] | undefined): string | undefined {
  // Next.js 15 hands string[] for repeated query params (`?v=1&v=2`). Keep
  // the first occurrence -- the route contract is one version, one page.
  if (Array.isArray(value)) return value[0];
  return value;
}

async function loadSiteAndVersion(
  siteSlug: string,
  versionId: string | undefined,
) {
  const supabase = createServiceSupabaseClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, slug, name")
    .eq("slug", siteSlug)
    .maybeSingle();
  if (siteError) throw siteError;
  if (!site) return null;

  if (versionId) {
    const { data: version, error: versionError } = await supabase
      .from("site_versions")
      .select("id, config")
      .eq("id", versionId)
      .eq("site_id", site.id)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) return null;
    return { site, version };
  }

  const { data: workingVersion, error: workingError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", site.id)
    .eq("is_working", true)
    .maybeSingle();
  if (workingError) throw workingError;
  if (workingVersion) {
    return { site, version: workingVersion };
  }

  // Fallback: most recently created row for this site. Used when the
  // working flag was somehow cleared (manual SQL, midflight migration).
  const { data: anyVersion, error: anyError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (anyError) throw anyError;
  if (!anyVersion) return null;
  return { site, version: anyVersion };
}

export async function generateMetadata(props: PreviewPageProps): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const versionId = singular(searchParams.v);
  try {
    const result = await loadSiteAndVersion(params.site, versionId);
    if (!result) return { title: "Site not found" };
    const config = parseSiteConfig(result.version.config);
    return {
      title: config.meta.siteName,
      description: config.meta.description,
    };
  } catch {
    return { title: "Site preview" };
  }
}

export default async function PreviewPage(props: PreviewPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const versionId = singular(searchParams.v);
  const pageSlug = singular(searchParams.page) ?? "home";

  const result = await loadSiteAndVersion(params.site, versionId);
  if (!result) {
    notFound();
  }

  const config = parseSiteConfig(result.version.config);
  return <Renderer config={config} page={pageSlug} mode="preview" />;
}
