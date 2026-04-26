/**
 * /{site}/edit -- Element 2's editor route.
 *
 * Server component. Resolves the site by slug, fetches its working
 * site_versions row (`is_working = true`), parses the stored config, and
 * hands the result to the EditorShell client component for hydration.
 *
 * Sprint 6 inlines the slug + working-version queries here rather than
 * importing helpers from `lib/sites/repo.ts` (the file does not exist on
 * master; see DECISIONS.md 2026-04-25 Sprint 6 entry). This mirrors the
 * /{site}/preview/page.tsx pattern shipped in Sprint 4.
 */

import { parseSiteConfig } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { EditorShell } from "./EditorShell";

type EditPageParams = { site: string };
type EditPageProps = { params: Promise<EditPageParams> };

async function loadSiteAndWorkingVersion(siteSlug: string) {
  const supabase = createServiceSupabaseClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, slug, name")
    .eq("slug", siteSlug)
    .maybeSingle();
  if (siteError) throw siteError;
  if (!site) return null;

  const { data: workingVersion, error: vError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", site.id)
    .eq("is_working", true)
    .maybeSingle();
  if (vError) throw vError;
  if (!workingVersion) return null;

  return { site, workingVersion };
}

export default async function EditPage(props: EditPageProps) {
  const { site: siteSlug } = await props.params;
  const result = await loadSiteAndWorkingVersion(siteSlug);
  if (!result) notFound();

  const config = parseSiteConfig(result.workingVersion.config);

  return (
    <EditorShell
      siteId={result.site.id}
      siteSlug={result.site.slug}
      workingVersionId={result.workingVersion.id}
      initialConfig={config}
    />
  );
}
