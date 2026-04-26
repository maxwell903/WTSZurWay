import { FORMATTERS } from "./formatters";

// Token grammar: {{ <expr> }} where <expr> is `row.<dot.path>` optionally
// followed by ` | <formatter>`. Whitespace inside the braces is trimmed.
// Unknown path → original token emitted verbatim (no replacement).
// `row === null` → entire input string returned verbatim with tokens intact.
// PROJECT_SPEC.md §8.12 + Sprint 9 CLAUDE.md "Naming reminder".
const TOKEN_RE = /\{\{(.+?)\}\}/g;

type Lookup = { found: true; value: unknown } | { found: false };

function lookupPath(row: unknown, segments: string[]): Lookup {
  let cur: unknown = row;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return { found: false };
    if (typeof cur !== "object") return { found: false };
    if (!(seg in (cur as Record<string, unknown>))) return { found: false };
    cur = (cur as Record<string, unknown>)[seg];
  }
  return { found: true, value: cur };
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

export function resolveTokens(value: string, row: unknown | null): string {
  // No row in scope → leave the input untouched. The Sprint 5 shell behavior
  // for static pages (PROJECT_SPEC.md §8.12 last paragraph).
  if (row === null || row === undefined) return value;
  if (!value.includes("{{")) return value;

  return value.replace(TOKEN_RE, (whole, inner: string) => {
    const trimmed = inner.trim();

    const [exprRaw, formatterRaw] = trimmed.split("|").map((s) => s.trim());
    if (!exprRaw) return whole;

    // Only `row.<path>` and the bare `row` are supported. Anything else passes
    // through verbatim — keeps the door open for future namespaces (e.g.
    // `params.*`) without breaking older configs.
    const segments = exprRaw.split(".").filter((s) => s.length > 0);
    if (segments.length === 0 || segments[0] !== "row") return whole;
    const pathSegments = segments.slice(1);

    const result = lookupPath(row, pathSegments);
    if (!result.found) return whole;

    if (formatterRaw && formatterRaw.length > 0) {
      const fn = FORMATTERS[formatterRaw];
      if (fn) return fn(result.value);
      // Unknown formatter → unformatted value (DoD).
      return stringifyValue(result.value);
    }

    return stringifyValue(result.value);
  });
}
