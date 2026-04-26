// Pure formatters consumed by `resolveTokens`. No React imports, no DOM
// imports — the resolver runs on the server (Sprint 9b detail-page paths)
// and on the client.

const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function toNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export const FORMATTERS: Record<string, (input: unknown) => string> = {
  money(input) {
    if (input === null || input === undefined) return "";
    const n = toNumber(input);
    if (n === null) return String(input);
    return MONEY_FORMATTER.format(n);
  },
  number(input) {
    if (input === null || input === undefined) return "";
    const n = toNumber(input);
    if (n === null) return String(input);
    return NUMBER_FORMATTER.format(n);
  },
  date(input) {
    if (input === null || input === undefined) return "";
    if (typeof input !== "string" && typeof input !== "number" && !(input instanceof Date)) {
      return String(input);
    }
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return String(input);
    return DATE_FORMATTER.format(d);
  },
  lower(input) {
    if (input === null || input === undefined) return "";
    return String(input).toLowerCase();
  },
  upper(input) {
    if (input === null || input === undefined) return "";
    return String(input).toUpperCase();
  },
};
