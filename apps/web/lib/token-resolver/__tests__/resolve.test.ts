// @vitest-environment node
//
// The resolver is pure — no React, no DOM. Run in node so a regression to a
// browser-only API is caught by CI (Sprint 9 DoD: "Confirm this with a tiny
// node-environment test").

import { describe, expect, it } from "vitest";
import { resolveTokens } from "../resolve";

describe("resolveTokens", () => {
  it("substitutes a single token from the row", () => {
    expect(resolveTokens("Hello {{ row.name }}!", { name: "Aurora" })).toBe("Hello Aurora!");
  });

  it("substitutes multiple tokens in one string", () => {
    expect(resolveTokens("{{ row.first }} & {{ row.second }}", { first: "A", second: "B" })).toBe(
      "A & B",
    );
  });

  it("walks nested paths (row.property.name)", () => {
    expect(resolveTokens("{{ row.property.name }}", { property: { name: "Aurora Heights" } })).toBe(
      "Aurora Heights",
    );
  });

  it("emits the original token verbatim when the path is unknown", () => {
    expect(resolveTokens("{{ row.missing }}", { name: "x" })).toBe("{{ row.missing }}");
  });

  it("returns the entire input verbatim when row is null (no substitution)", () => {
    expect(resolveTokens("Hello {{ row.name }}!", null)).toBe("Hello {{ row.name }}!");
  });

  it("formats numbers with the money formatter", () => {
    expect(resolveTokens("{{ row.rent | money }}", { rent: 1234 })).toBe("$1,234");
  });

  it("formats numbers with the number formatter (thousand separators, no currency)", () => {
    expect(resolveTokens("{{ row.sqft | number }}", { sqft: 12345 })).toBe("12,345");
  });

  it("formats ISO date strings with the date formatter", () => {
    // The exact string includes a non-ASCII narrow-no-break-space in some
    // locales; assert key fragments instead of equality.
    const out = resolveTokens("{{ row.when | date }}", { when: "2026-01-05" });
    expect(out).toContain("Jan");
    expect(out).toContain("2026");
  });

  it("falls through unknown formatters as the unformatted value", () => {
    expect(resolveTokens("{{ row.rent | unknownFmt }}", { rent: 1234 })).toBe("1234");
  });

  it("trims leading and trailing whitespace inside braces", () => {
    expect(resolveTokens("{{   row.name   }}", { name: "x" })).toBe("x");
  });

  it("leaves brace-like literals that are not tokens verbatim", () => {
    expect(resolveTokens("{notAToken}", { x: 1 })).toBe("{notAToken}");
  });

  it("renders null and undefined field values as the empty string", () => {
    expect(resolveTokens("[{{ row.name }}]", { name: null })).toBe("[]");
    expect(resolveTokens("[{{ row.name }}]", { name: undefined })).toBe("[]");
  });

  it("renders a null field through a formatter as the empty string", () => {
    expect(resolveTokens("{{ row.rent | money }}", { rent: null })).toBe("");
  });

  it("leaves backslash-prefixed brace sequences verbatim (no escape interpretation)", () => {
    // `\\{\\{ row.x }}` in source = literal `\{\{ row.x }}` in the runtime
    // string. The opening braces aren't consecutive (a backslash sits between
    // them), so the token regex doesn't match and the whole input survives.
    const input = "\\{\\{ row.name }}";
    expect(resolveTokens(input, { name: "x" })).toBe(input);
  });

  it("leaves invalid date input verbatim through the date formatter", () => {
    expect(resolveTokens("{{ row.d | date }}", { d: "not-a-date" })).toBe("not-a-date");
  });

  it("emits the bare row value when the expression is `row` with no path", () => {
    expect(resolveTokens("{{ row }}", "scalar-row")).toBe("scalar-row");
  });

  it("keeps tokens whose first segment is not `row` verbatim", () => {
    expect(resolveTokens("{{ params.q }}", { q: "ignored" })).toBe("{{ params.q }}");
  });

  it("uses upper / lower formatters", () => {
    expect(resolveTokens("{{ row.s | upper }}", { s: "AurOrA" })).toBe("AURORA");
    expect(resolveTokens("{{ row.s | lower }}", { s: "AurOrA" })).toBe("aurora");
  });

  it("returns the input untouched when it contains no token markers", () => {
    expect(resolveTokens("plain text, no tokens", { name: "x" })).toBe("plain text, no tokens");
  });
});
