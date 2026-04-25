// Component IDs are the stable handles AI operations target. They must be
// short enough to read in a JSON dump and unique enough to avoid collisions
// across an entire site config.

export function newComponentId(prefix?: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix ?? "cmp"}_${hex}`;
}
