/**
 * Data sources Claude can bind components to. The Initial Generation system
 * prompt embeds this snippet so the model knows which fields exist on each
 * RM entity. Mirrors `apps/web/types/rm.ts` exactly -- if a field is added
 * there, mirror it here, and the prompt snapshot test will catch drift.
 *
 * `units_with_property` is documented as a virtual data source for Sprint 4
 * even though Sprint 9 is what materializes it. Listing it now lets Claude
 * generate configs that already reference the joined view, so Sprint 9's
 * editor work doesn't need to retrofit existing demos.
 */

export const DATA_SOURCES_PROSE = String.raw`
## properties (data source)
Type: list. One row per Property. Use inside a Repeater with
\`dataBinding: { source: "properties" }\` to render a list of property cards.

Fields:
- id: number
- name: string
- shortName: string | null
- propertyType: "Residential" | "Commercial" | "ManufacturedHousing" | null
- email: string | null
- primaryPhone: string | null
- street: string | null
- city: string | null
- state: string | null
- postalCode: string | null
- heroImageUrl: string | null
- amenities: string[]

## units (data source)
Type: list. One row per Unit. Use inside a Repeater with
\`dataBinding: { source: "units" }\` to render a list of unit cards.

Fields:
- id: number
- propertyId: number | null
- unitName: string
- squareFootage: number | null
- bedrooms: number | null
- bathrooms: number | null
- currentMarketRent: number | null
- isAvailable: boolean
- availableDate: string | null      // ISO date
- primaryImageUrl: string | null
- description: string | null
- amenities: string[]

## units_with_property (data source, joined)
Type: list. Same shape as units but with the parent property fields prefixed
\`property_\` (e.g. property_name, property_city). Sprint 9 materializes this
view; Sprint 4's prompt may reference it but the renderer's resolver will
fall back to plain \`units\` until then.

## company (data source, single)
Type: singleton. One row per site (the property manager's own RM company).
Repeater binding to \`company\` is allowed but degenerate -- the iteration
fires exactly once. Prefer reading individual fields with \`{{ row.* }}\` in a
non-Repeater context once Sprint 9b lands the row context provider.

Fields:
- id: number
- name: string
- legalName: string | null
- primaryPhone: string | null
- email: string | null
- street: string | null
- city: string | null
- state: string | null
- postalCode: string | null
- logoUrl: string | null
`.trim();
