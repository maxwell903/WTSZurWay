export function applyLimit<T>(rows: T[], limit: number | undefined): T[] {
  if (limit === undefined) return rows;
  if (limit <= 0) return [];
  if (limit >= rows.length) return rows;
  return rows.slice(0, limit);
}
