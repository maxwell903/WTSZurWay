import { describe, expect, it } from "vitest";
import { applyFilters } from "../applyFilters";
import type { FilterRuleGroup } from "../types";

const rows = [
  { id: 1, name: "Alpha", rent: 1000, beds: 1, tags: ["a"] },
  { id: 2, name: "Beta", rent: 1500, beds: 2, tags: ["a", "b"] },
  { id: 3, name: "Gamma", rent: 2000, beds: 3, tags: ["c"] },
];

function group(rules: FilterRuleGroup["rules"], combinator: "and" | "or" = "and"): FilterRuleGroup {
  return { combinator, rules };
}

describe("applyFilters", () => {
  it("filters by `=`", () => {
    const out = applyFilters(rows, group([{ field: "beds", operator: "=", value: 2 }]));
    expect(out.map((r) => r.id)).toEqual([2]);
  });

  it("filters by `!=`", () => {
    const out = applyFilters(rows, group([{ field: "beds", operator: "!=", value: 2 }]));
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });

  it("filters by `<` and `>=`", () => {
    expect(
      applyFilters(rows, group([{ field: "rent", operator: "<", value: 1500 }])).map((r) => r.id),
    ).toEqual([1]);
    expect(
      applyFilters(rows, group([{ field: "rent", operator: ">=", value: 1500 }])).map((r) => r.id),
    ).toEqual([2, 3]);
  });

  it("filters by `<=` and `>`", () => {
    expect(
      applyFilters(rows, group([{ field: "rent", operator: "<=", value: 1500 }])).map((r) => r.id),
    ).toEqual([1, 2]);
    expect(
      applyFilters(rows, group([{ field: "rent", operator: ">", value: 1500 }])).map((r) => r.id),
    ).toEqual([3]);
  });

  it("filters by `contains`, `beginsWith`, `endsWith` (case-insensitive)", () => {
    expect(
      applyFilters(rows, group([{ field: "name", operator: "contains", value: "et" }])).map(
        (r) => r.id,
      ),
    ).toEqual([2]);
    expect(
      applyFilters(rows, group([{ field: "name", operator: "beginsWith", value: "g" }])).map(
        (r) => r.id,
      ),
    ).toEqual([3]);
    expect(
      applyFilters(rows, group([{ field: "name", operator: "endsWith", value: "ma" }])).map(
        (r) => r.id,
      ),
    ).toEqual([3]);
  });

  it("filters by `in` and `notIn`", () => {
    expect(
      applyFilters(rows, group([{ field: "id", operator: "in", value: [1, 3] }])).map((r) => r.id),
    ).toEqual([1, 3]);
    expect(
      applyFilters(rows, group([{ field: "id", operator: "notIn", value: [1, 3] }])).map(
        (r) => r.id,
      ),
    ).toEqual([2]);
  });

  it("filters by `null` and `notNull`", () => {
    const r = [
      { id: 1, name: null },
      { id: 2, name: "x" },
    ];
    expect(applyFilters(r, group([{ field: "name", operator: "null" }])).map((x) => x.id)).toEqual([
      1,
    ]);
    expect(
      applyFilters(r, group([{ field: "name", operator: "notNull" }])).map((x) => x.id),
    ).toEqual([2]);
  });

  it("AND group requires every applicable rule to pass", () => {
    const out = applyFilters(
      rows,
      group([
        { field: "beds", operator: ">=", value: 2 },
        { field: "rent", operator: "<", value: 2000 },
      ]),
    );
    expect(out.map((r) => r.id)).toEqual([2]);
  });

  it("OR group requires at least one applicable rule to pass", () => {
    const out = applyFilters(
      rows,
      group(
        [
          { field: "beds", operator: "=", value: 1 },
          { field: "rent", operator: ">", value: 1700 },
        ],
        "or",
      ),
    );
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });

  it("supports nested groups", () => {
    const nested: FilterRuleGroup = {
      combinator: "and",
      rules: [
        { field: "beds", operator: ">=", value: 2 },
        {
          combinator: "or",
          rules: [
            { field: "name", operator: "beginsWith", value: "B" },
            { field: "name", operator: "beginsWith", value: "G" },
          ],
        },
      ],
    };
    expect(applyFilters(rows, nested).map((r) => r.id)).toEqual([2, 3]);
  });

  it("treats an empty top-level group as no constraint (returns all rows)", () => {
    expect(applyFilters(rows, group([])).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("treats malformed input as no filter (returns rows unchanged)", () => {
    expect(applyFilters(rows, "not a group").map((r) => r.id)).toEqual([1, 2, 3]);
    expect(applyFilters(rows, { combinator: "and" }).map((r) => r.id)).toEqual([1, 2, 3]);
    expect(applyFilters(rows, undefined).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("skips rules whose field is missing on the row (no constraint applied)", () => {
    expect(
      applyFilters(rows, group([{ field: "missing", operator: "=", value: 1 }])).map((r) => r.id),
    ).toEqual([1, 2, 3]);
  });

  it("skips a string operator on a numeric field (rule does not constrain)", () => {
    expect(
      applyFilters(rows, group([{ field: "beds", operator: "contains", value: "2" }])).map(
        (r) => r.id,
      ),
    ).toEqual([1, 2, 3]);
  });

  it("AND group with all rules skipped → all rows pass (vacuous truth)", () => {
    const out = applyFilters(
      rows,
      group([
        { field: "missing-a", operator: "=", value: 1 },
        { field: "missing-b", operator: "=", value: 2 },
      ]),
    );
    expect(out.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("respects the optional `not` flag on a group", () => {
    const out = applyFilters(rows, {
      combinator: "and",
      not: true,
      rules: [{ field: "beds", operator: "=", value: 2 }],
    });
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });
});
