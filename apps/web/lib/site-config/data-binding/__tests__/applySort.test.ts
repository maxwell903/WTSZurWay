import { describe, expect, it } from "vitest";
import { applySort } from "../applySort";

describe("applySort", () => {
  it("sorts ascending by a numeric field", () => {
    const rows = [
      { id: 1, n: 3 },
      { id: 2, n: 1 },
      { id: 3, n: 2 },
    ];
    expect(applySort(rows, { field: "n", direction: "asc" }).map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it("sorts descending by a numeric field", () => {
    const rows = [
      { id: 1, n: 3 },
      { id: 2, n: 1 },
      { id: 3, n: 2 },
    ];
    expect(applySort(rows, { field: "n", direction: "desc" }).map((r) => r.id)).toEqual([1, 3, 2]);
  });

  it("is stable for equal keys (preserves input order)", () => {
    const rows = [
      { id: 1, k: "a" },
      { id: 2, k: "a" },
      { id: 3, k: "a" },
    ];
    expect(applySort(rows, { field: "k", direction: "asc" }).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("places null/undefined values at the end regardless of direction", () => {
    const rows = [
      { id: 1, n: null as number | null },
      { id: 2, n: 5 },
      { id: 3, n: undefined as number | undefined },
      { id: 4, n: 1 },
    ];
    const asc = applySort(rows, { field: "n", direction: "asc" }).map((r) => r.id);
    expect(asc.slice(0, 2)).toEqual([4, 2]);
    expect(asc.slice(2).sort()).toEqual([1, 3]);
    const desc = applySort(rows, { field: "n", direction: "desc" }).map((r) => r.id);
    expect(desc.slice(0, 2)).toEqual([2, 4]);
    expect(desc.slice(2).sort()).toEqual([1, 3]);
  });

  it("returns the input order when the field is unknown on every row", () => {
    const rows = [
      { id: 1, n: 1 },
      { id: 2, n: 2 },
      { id: 3, n: 3 },
    ];
    expect(applySort(rows, { field: "missing", direction: "asc" }).map((r) => r.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it("sorts strings ascending alphabetically (default direction)", () => {
    const rows = [
      { id: 1, k: "banana" },
      { id: 2, k: "apple" },
      { id: 3, k: "cherry" },
    ];
    expect(applySort(rows, { field: "k", direction: "asc" }).map((r) => r.id)).toEqual([2, 1, 3]);
  });
});
