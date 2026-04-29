/**
 * Builds the deterministic system prompt for the Initial Generation surface
 * (PROJECT_SPEC.md §9.2). The function is pure -- no clock, no randomness,
 * no I/O -- so the snapshot test can pin every clause.
 *
 * The body is one large template literal that splices in the schema prose,
 * the registered component catalog, and the data source descriptions. Each
 * snippet lives in its own module under `./snippets/` so future schema /
 * component / RM-field changes are localized.
 *
 * Design rationale: the prompt is grounded in TypeScript types because
 * Claude reads them fluently and they are unambiguous; cross-field
 * invariants (kind iff detailDataSource, slug uniqueness per kind, the
 * detail-page coupling rule) are stated as explicit prose because they
 * cannot be expressed in the type system alone.
 */

import type { SetupFormValues } from "@/lib/setup-form/types";
import { buildComponentCatalog } from "./snippets/component-catalog";
import { DATA_SOURCES_PROSE } from "./snippets/data-sources";
import { SCHEMA_PROSE } from "./snippets/schema-prose";
import { type StockImageRow, buildStockImagesProse } from "./snippets/stock-images";

export type InitialGenerationInput = {
  form: SetupFormValues;
  inspirationImages?: { url: string }[];
  stockImages?: StockImageRow[];
};

export function buildInitialGenerationSystemPrompt(input: InitialGenerationInput): string {
  // The user-specific payload (company name, palette, etc.) goes in the user
  // message rather than the system prompt -- the system prompt is the
  // persistent, deterministic contract; the user message is the per-request
  // ask. Keeping the system prompt deterministic also keeps prompt caching
  // viable in later sprints (Sprint 14 may add caching).

  const componentCatalog = buildComponentCatalog();
  const stockImagesProse = buildStockImagesProse(input.stockImages ?? []);
  const stockImagesSection = stockImagesProse
    ? `${stockImagesProse}

When populating Image components in the generated site, choose \`src\`
from this catalog. Prefer images whose category matches the property
type the user described. Do not invent image URLs.

`
    : "";

  return `You are generating a complete SiteConfig JSON for a property management website.

# Output contract

Return exactly one JSON object that conforms to the SiteConfig type defined
below. The response MUST be a single JSON object -- no prose before or
after, no markdown code fences, no explanatory text. The first character of
your response MUST be \`{\` and the last character MUST be \`}\`.

If the response cannot be parsed as JSON or fails SiteConfig validation,
the orchestrator will retry once with the validation errors attached. A
second failure surfaces as an \`invalid_output\` error to the user.

# SiteConfig schema

${SCHEMA_PROSE}

# Validation rules (binding)

1. \`pages\` is non-empty. Always include a "home" page with \`kind: "static"\`.
2. \`Page.kind\` is "static" by default. \`Page.detailDataSource\` is
   required iff \`kind === "detail"\` and forbidden iff \`kind === "static"\`.
3. Slug uniqueness is per \`kind\`. A static page with \`slug: "units"\` and a
   detail page with \`slug: "units"\` may coexist. Two static pages with the
   same slug, or two detail pages with the same slug, are invalid.
4. Detail-page coupling: any page that contains a Repeater with
   \`dataBinding.source === "units"\` MUST be paired with at least one
   \`kind: "detail"\` page elsewhere in \`pages\` whose
   \`detailDataSource === "units"\`. The same rule applies for
   \`dataBinding.source === "properties"\` paired with a detail page with
   \`detailDataSource === "properties"\`. The detail page typically holds a
   single Section + Heading + Image + Paragraph layout that reads
   \`{{ row.* }}\` tokens; Sprint 9b will resolve them at render time.
5. Each component's \`id\` is unique across the entire config. Use the
   format \`cmp_<short-descriptive-suffix>\` (e.g. \`cmp_hero\`,
   \`cmp_units_repeater\`, \`cmp_unit_card\`).
6. Each page's \`id\` follows the same pattern with prefix \`p_\` (e.g.
   \`p_home\`, \`p_units_detail\`).
7. Total component count per page MUST NOT exceed 40 (PROJECT_SPEC.md §9.2).
   Validation does not enforce this -- treat it as a hard editorial cap.

# Registered components (use ONLY these)

You MUST NOT invent component types. The \`type\` field on every
ComponentNode must be one of the values listed below. Each component's
prop surface is fixed -- do not add props that are not listed.

${componentCatalog}

# Data sources

Repeater \`dataBinding.source\` MUST be one of:

${DATA_SOURCES_PROSE}

${stockImagesSection}# Style and palette

The user picked a palette from \`brand.palette\`. Apply it consistently
across the site:
- Use the palette's primary color for headings, buttons, and accents.
- Use the palette's neutral / surface colors for section backgrounds.
- Do not introduce one-off color values that fight the palette. Custom
  colors live in \`brand.customColors\` if you really need them, and they
  override the palette.
- \`brand.fontFamily\` cascades to all text components. The default for the
  demo is "Inter".

# Data binding (UnitCard / PropertyCard / Repeater)

When you place a UnitCard inside a Repeater bound to \`units\`, bind its
props to the per-row fields using \`{{ row.* }}\` tokens, e.g.:
- \`unitName\`: \`"{{ row.unitName }}"\`
- \`bedrooms\`: \`"{{ row.bedrooms }}"\`
- \`rent\`: \`"{{ row.currentMarketRent }}"\`
- \`primaryImageUrl\`: \`"{{ row.primaryImageUrl }}"\`
- \`ctaHref\`: \`"/units/{{ row.id }}"\`

Same idea for PropertyCard inside a Repeater of \`properties\`:
- \`name\`: \`"{{ row.name }}"\`
- \`city\`: \`"{{ row.city }}"\`
- \`heroImageUrl\`: \`"{{ row.heroImageUrl }}"\`

Sprint 9b resolves these tokens at render time. Sprint 4 only requires the
emitted strings be syntactically correct -- the renderer falls back to the
verbatim string when no row context is in scope.

# Inspiration images

If the user attached inspiration screenshots, treat them as VIBE references only. Match the feel (color temperature, density, hierarchy); do NOT try to reproduce the layout pixel-for-pixel. Inspiration images inform style choices, not structural choices.

# Forms

Every InputField placed inside a Form MUST have its \`id\` listed in the
matching FormDefinition's \`inputIds\`. The Form's \`formId\` prop must
equal the FormDefinition's \`id\`. The submitButtonId references a Button
component nested inside the Form.

# Determinism reminders

- Do not include a "kind": "clarify" response shape. The Initial
  Generation surface always returns a SiteConfig; clarification is an
  AI Edit (Sprint 11) concern.
- Do not stream. Return the complete JSON object in one response.
- Do not include any commentary, markdown fences, or trailing text.
`;
}
