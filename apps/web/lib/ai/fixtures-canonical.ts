/**
 * Canonical inputs for the demo-fallback recording (`pnpm record-fixtures`).
 * The shapes here are what the stage operator types on demo day -- the
 * recording script feeds them through the live orchestrator(s) and
 * UPSERTs the captured response into `demo_fixtures` so the silent
 * fallback path can serve them when the live API is unavailable.
 *
 * Mirror PROJECT_SPEC.md §13.4 (the Aurora demo brand) and §13.2 (the
 * scripted prompts). Every input here MUST match what the operator will
 * type on stage -- if the demo script changes, so does this file, and the
 * recording script is re-run.
 *
 * The SPRINT_SCHEDULE.md Sprint 14 detail-pages amendment:
 *   - At least one initial-generation fixture must produce a SiteConfig
 *     with at least one Page whose `kind === "detail"`. Sprint 4's prompt
 *     emits a unit detail page when `pagesToInclude` includes "units" and
 *     the site features residential properties; both apply for the Aurora
 *     payload below, so the canonical generation already satisfies the
 *     amendment without a separate fixture.
 *   - At least one ai-edit fixture must exercise the `setLinkMode` /
 *     `setDetailPageSlug` operations (PROJECT_SPEC.md §8.12). The
 *     "Make each unit card link to a unit detail page..." prompt below
 *     is the Sprint 11 system-prompt's canonical setLinkMode/setDetailPageSlug
 *     trigger.
 */

import type { SetupFormValues } from "@/lib/setup-form/types";
import type { AiEditSelection } from "./prompts/ai-edit";

export type CanonicalAiEditInput = {
  /** Forwarded into the hash; must point at the Aurora-Cincy site row. */
  siteId: string;
  /** The Aurora-Cincy working-version row id. */
  currentVersionId: string;
  prompt: string;
  selection: AiEditSelection | null;
};

/**
 * The generation payload from PROJECT_SPEC.md §13.4 ("Aurora Property
 * Group", Cincinnati, Ocean palette, residential-heavy mix). Matches what
 * the stage operator types in the §13.2 demo script. Values are kept as
 * minimal as the schema requires: omitted fields default per the form
 * schema (Sprint 2's setupFormSchema).
 */
export const CANONICAL_GENERATION_INPUTS: ReadonlyArray<SetupFormValues> = [
  {
    companyName: "Aurora Cincy",
    tagline: "Where Cincinnati feels like home.",
    palette: "ocean",
    templateStart: "ai_generate",
    additionalLogos: [],
    inspirationImages: [],
    customInstructions:
      "We manage residential properties in the Cincinnati area. Highlight available units and make it easy for tenants to apply.",
    targetAudience: "Renters in the greater Cincinnati area",
    propertyTypesFeatured: ["residential"],
    pagesToInclude: ["home", "properties", "units", "about", "contact", "apply_now"],
    tone: "warm",
    primaryCta: "schedule_a_tour",
  },
] as const;

/**
 * Two ai-edit prompts. The first mirrors §13.2 step 4 (the in-preview
 * adjustment). The second is the SPRINT_SCHEDULE.md detail-pages
 * amendment trigger -- the Sprint 11 system prompt translates this into
 * a `setLinkMode: "detail"` + `setDetailPageSlug` operation pair on the
 * UnitCard's primary button.
 *
 * The siteId / currentVersionId placeholders below are overwritten by the
 * recording script after it runs the canonical generation -- the captured
 * sites.id / site_versions.id flow into both the recorded fixture's hash
 * and the per-input `pnpm record-fixtures` log.
 */
export const CANONICAL_AI_EDIT_INPUTS: ReadonlyArray<CanonicalAiEditInput> = [
  {
    siteId: "00000000-0000-0000-0000-000000000000",
    currentVersionId: "00000000-0000-0000-0000-000000000000",
    prompt: "Make the hero darker and add a testimonials section.",
    selection: null,
  },
  {
    siteId: "00000000-0000-0000-0000-000000000000",
    currentVersionId: "00000000-0000-0000-0000-000000000000",
    prompt: "Make each unit card link to a unit detail page so visitors can click into a unit.",
    selection: null,
  },
] as const;
