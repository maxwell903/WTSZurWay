/**
 * Prose rendering of the stock-image catalog for the AI Edit and Initial
 * Generation system prompts. The list is dynamic (per-site uploads can
 * change between requests) so this is a build-from-rows function rather
 * than a static constant — see DATA_SOURCES_PROSE for the static-case
 * sibling.
 *
 * The directive is binding: the prompt tells the model to choose URLs
 * verbatim from this list and to ask a clarifying question if no image
 * fits, rather than guess. Without that guard the model invents URLs.
 */

export type StockImageRow = {
  id: number;
  site_id: string | null;
  storage_path: string;
  public_url: string;
  category: string | null;
  description: string;
};

export function buildStockImagesProse(images: StockImageRow[]): string {
  if (images.length === 0) return "";
  const lines = images.map((img) => {
    const tag =
      img.site_id === null ? `(default — ${img.category ?? "uncategorized"})` : "(per-site)";
    return `- ${img.public_url} — ${tag} — ${img.description}`;
  });
  return [
    "# Available stock images",
    "",
    "When setting an Image component's `src` prop, choose from this catalog.",
    "Use the URL exactly as written. Do not invent image URLs. If no image",
    "in the catalog fits the user's request, ask a clarifying question",
    "rather than guess.",
    "",
    ...lines,
  ].join("\n");
}
