import type { SortSpec } from "./types";

function isMissing(v: unknown): boolean {
  return v === null || v === undefined;
}

function compare(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  // Null/undefined values sort to the END regardless of direction. The
  // editor canvas displays missing data badly, so always pushing it down
  // means the visible portion of a paginated list is always populated.
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  let result = 0;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b));
  }
  return direction === "asc" ? result : -result;
}

export function applySort<T>(rows: T[], sort: SortSpec | undefined): T[] {
  if (!sort) return rows;
  const direction = sort.direction ?? "asc";
  // Array.prototype.sort is stable in every modern engine (ES2019), so we
  // rely on it for the "stability" test rather than decorating with an index.
  return rows.slice().sort((a, b) => {
    const va = (a as Record<string, unknown> | null | undefined)?.[sort.field];
    const vb = (b as Record<string, unknown> | null | undefined)?.[sort.field];
    return compare(va, vb, direction);
  });
}
