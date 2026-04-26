import { SetSubBarTitle } from "@/components/rmx-shell/sub-bar-context";
import { SetupExperience } from "@/components/setup-form/SetupExperience";
import { Toaster } from "@/components/ui/sonner";
import { createServiceSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

async function loadEditableSites() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("sites")
    .select("slug, name, site_versions!inner(is_working)")
    .eq("site_versions.is_working", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((row) => ({ slug: row.slug, name: row.name }));
}

export default async function SetupPage() {
  const editableSites = await loadEditableSites();

  return (
    <>
      <SetSubBarTitle title="Add Website Template" />
      {editableSites.length > 0 && (
        <section className="mx-auto w-full max-w-4xl px-4 pt-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-200">
              Open an existing site in the editor
            </h2>
            <ul className="flex flex-wrap gap-2">
              {editableSites.map((site) => (
                <li key={site.slug}>
                  <Link
                    href={`/${site.slug}/edit`}
                    className="inline-flex h-8 items-center rounded-md border border-zinc-700 bg-transparent px-3 text-xs font-medium text-zinc-200 transition hover:bg-zinc-900"
                  >
                    {site.name}
                    <span className="ml-2 text-zinc-500">/{site.slug}/edit</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <SetupExperience />
      <Toaster richColors position="top-right" />
    </>
  );
}
