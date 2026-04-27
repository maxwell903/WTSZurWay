#!/usr/bin/env tsx
/**
 * Demo-fallback recording script (Sprint 14, PROJECT_SPEC.md §9.10).
 *
 * For each canonical input from `apps/web/lib/ai/fixtures-canonical.ts`,
 * call the live orchestrator and UPSERT the captured response into the
 * `demo_fixtures` table. Idempotent: re-running with the same canonical
 * inputs replaces existing rows (the `(surface, input_hash)` unique
 * constraint plus `.upsert(..., { onConflict: ... })` does the work).
 *
 * Run from the repo root with `pnpm record-fixtures`. Requires
 * `apps/web/.env.local` populated with:
 *   - ANTHROPIC_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * The script runs the canonical generation FIRST, captures the resulting
 * (siteId, versionId), and uses those for the canonical ai-edit inputs.
 * Per the Sprint 14 plan hint:
 *
 *   "The recording script's canonical ai-edit inputs reference a `siteId`
 *    and `currentVersionId`. ... Alternatively, the script can do this
 *    end-to-end: run the generation fixtures first, capture the resulting
 *    siteId / versionId, then run the ai-edit fixtures against the
 *    captured ids. This is the cleaner approach and is what DoD-14
 *    implicitly assumes."
 *
 * On success exits 0; on any input failure prints all failures and exits 1.
 */

import { createHash } from "node:crypto";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

// Load env BEFORE importing anything that touches process.env at import time
// (createServiceSupabaseClient throws when the keys are missing). The .env
// path is repo-relative so the script works from `pnpm record-fixtures`
// invoked at the repo root.
loadDotenv({ path: path.resolve(process.cwd(), "apps/web/.env.local") });

import { aiEdit } from "@/lib/ai/ai-edit";
import { createAnthropicClient } from "@/lib/ai/client";
import {
  hashAiEditInput,
  hashGenerationInput,
  recordAiEditFixture,
  recordGenerationFixture,
} from "@/lib/ai/fixtures";
import { CANONICAL_AI_EDIT_INPUTS, CANONICAL_GENERATION_INPUTS } from "@/lib/ai/fixtures-canonical";
import { generateInitialSite } from "@/lib/ai/generate-initial-site";
import { type SiteConfig, safeParseSiteConfig } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";

const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

async function main(): Promise<number> {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing required environment variables in apps/web/.env.local:");
    missing.forEach((key, idx) => {
      console.error(`  ${idx + 1}. ${key}`);
    });
    return 1;
  }

  const failures: string[] = [];
  let generationCount = 0;
  let aiEditCount = 0;

  // Capture the (siteId, versionId) of the FIRST recorded generation. The
  // canonical ai-edit prompts assume that working version exists; rerunning
  // the script after each script change keeps both surfaces' fixtures in
  // sync against the same demo site.
  let recordedSite: { siteId: string; versionId: string; config: SiteConfig } | null = null;

  // ------------------------------------------------------------------
  // 1. Generations
  // ------------------------------------------------------------------
  for (let i = 0; i < CANONICAL_GENERATION_INPUTS.length; i++) {
    const form = CANONICAL_GENERATION_INPUTS[i];
    if (!form) continue;
    const hash = hashGenerationInput(form);
    try {
      const client = createAnthropicClient();
      const result = await generateInitialSite({ form, inspirationImages: [] }, client);
      if (result.kind !== "ok") {
        const detail = result.kind === "error" ? result.error.kind : "unknown";
        failures.push(
          `generation #${i} (${form.companyName}): orchestrator returned ${result.kind} (${detail})`,
        );
        continue;
      }
      // Validate before recording so a malformed live response doesn't
      // poison the fixture row.
      const parsed = safeParseSiteConfig(result.config);
      if (!parsed.success) {
        failures.push(
          `generation #${i} (${form.companyName}): captured config failed safeParseSiteConfig`,
        );
        continue;
      }
      await recordGenerationFixture(form, parsed.data);
      generationCount += 1;
      console.log(`[ok] surface=initial_generation hash=${hash} company="${form.companyName}"`);

      // Persist the first recorded generation so the ai-edit fixtures have
      // a real (siteId, versionId) to point at. This is what DoD-14 (b)'s
      // cleaner end-to-end path describes.
      if (!recordedSite) {
        const persisted = await persistSiteForFixtures(form.companyName, parsed.data);
        if (persisted) {
          recordedSite = { ...persisted, config: parsed.data };
          console.log(
            `[ok] persisted demo site siteId=${persisted.siteId} versionId=${persisted.versionId}`,
          );
        } else {
          failures.push(
            `generation #${i} (${form.companyName}): could not persist a demo site row -- ai-edit fixtures will be skipped`,
          );
        }
      }
    } catch (e) {
      failures.push(`generation #${i} (${form.companyName}): threw ${stringifyError(e)}`);
    }
  }

  // ------------------------------------------------------------------
  // 2. AI Edits (only if we have a working version to attach them to)
  // ------------------------------------------------------------------
  if (!recordedSite) {
    console.warn("Skipping ai-edit fixtures: no demo site was recorded successfully.");
  } else {
    const site = recordedSite;
    for (let i = 0; i < CANONICAL_AI_EDIT_INPUTS.length; i++) {
      const canonical = CANONICAL_AI_EDIT_INPUTS[i];
      if (!canonical) continue;
      // Overwrite the placeholder ids in the canonical input with the
      // actually-recorded site so the fixture hash matches what the live
      // route call from the Element 1 / Element 2 surface would produce.
      const input = {
        prompt: canonical.prompt,
        siteId: site.siteId,
        currentVersionId: site.versionId,
        selection: canonical.selection,
      };
      const hash = hashAiEditInput(input);
      try {
        const client = createAnthropicClient();
        const result = await aiEdit(
          {
            prompt: canonical.prompt,
            config: site.config,
            selection: canonical.selection,
            siteId: site.siteId,
            currentVersionId: site.versionId,
          },
          client,
        );
        if (result.kind === "error") {
          failures.push(
            `ai-edit #${i}: orchestrator returned error ${result.error.kind} (${result.error.message})`,
          );
          continue;
        }
        // Errors are not recorded as fixtures -- only ok/clarify shapes.
        await recordAiEditFixture(input, result);
        aiEditCount += 1;
        console.log(
          `[ok] surface=ai_edit hash=${hash} kind=${result.kind} prompt="${truncate(canonical.prompt, 50)}"`,
        );
      } catch (e) {
        failures.push(`ai-edit #${i}: threw ${stringifyError(e)}`);
      }
    }
  }

  console.log(`Recorded ${generationCount} generation fixtures, ${aiEditCount} ai-edit fixtures.`);
  if (failures.length > 0) {
    console.error("\nFailures:");
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    return 1;
  }
  return 0;
}

/**
 * Persist the canonical generation as a real `sites` + `site_versions`
 * row pair so the ai-edit fixtures can reference (siteId, versionId).
 * Reuses an existing site by slug if one is already present so re-runs
 * are idempotent.
 */
async function persistSiteForFixtures(
  name: string,
  config: SiteConfig,
): Promise<{ siteId: string; versionId: string } | null> {
  const supabase = createServiceSupabaseClient();
  const slug = config.meta.siteSlug || sha256Slug(name);

  // Look up an existing site by slug first -- the script is idempotent.
  const existing = await supabase.from("sites").select("id").eq("slug", slug).maybeSingle();
  let siteId: string | null = existing.data?.id ?? null;
  if (!siteId) {
    const inserted = await supabase.from("sites").insert({ slug, name }).select("id").single();
    if (inserted.error || !inserted.data) {
      console.error(
        `persistSiteForFixtures: failed to insert site (${inserted.error?.message ?? "no row"})`,
      );
      return null;
    }
    siteId = inserted.data.id;
  }

  // Look up the working version, fall through to insert if missing.
  const existingVersion = await supabase
    .from("site_versions")
    .select("id")
    .eq("site_id", siteId)
    .eq("is_working", true)
    .maybeSingle();
  if (existingVersion.data?.id) {
    return { siteId, versionId: existingVersion.data.id };
  }

  const insertedVersion = await supabase
    .from("site_versions")
    .insert({
      site_id: siteId,
      // Cast through unknown -- the JSON column accepts any JSON-serializable
      // value, but the typed shape is more restrictive than SiteConfig.
      config: config as unknown as never,
      created_by: "system",
      source: "initial_generation",
      is_working: true,
      is_deployed: false,
      parent_version_id: null,
    })
    .select("id")
    .single();
  if (insertedVersion.error || !insertedVersion.data) {
    console.error(
      `persistSiteForFixtures: failed to insert site_versions (${insertedVersion.error?.message ?? "no row"})`,
    );
    return null;
  }
  return { siteId, versionId: insertedVersion.data.id };
}

function stringifyError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function sha256Slug(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((e) => {
    console.error("record-fixtures threw:", e);
    process.exit(1);
  });
