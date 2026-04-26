import { describe, expect, it } from "vitest";
import { applyLimit } from "../applyLimit";

describe("applyLimit", () => {
  const rows = [1, 2, 3, 4, 5];

  it("returns an empty array when limit is 0 (the user's explicit zero)", () => {
    expect(applyLimit(rows, 0)).toEqual([]);
  });

  it("returns all rows when limit is undefined", () => {
    expect(applyLimit(rows, undefined)).toEqual(rows);
  });

  it("returns all rows when limit exceeds rows.length", () => {
    expect(applyLimit(rows, 100)).toEqual(rows);
  });

  it("returns the first N rows when limit < rows.length", () => {
    expect(applyLimit(rows, 3)).toEqual([1, 2, 3]);
  });
});
