import type { DataBinding } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { dataBindingQueryKey } from "../queryKey";

const baseBinding: DataBinding = {
  source: "units",
  sort: { field: "currentMarketRent", direction: "desc" },
  limit: 12,
};

describe("dataBindingQueryKey", () => {
  it("is deterministic across runs given the same input", () => {
    const a = dataBindingQueryKey(baseBinding, { q: "foo" });
    const b = dataBindingQueryKey(baseBinding, { q: "foo" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("changes when a connectedInputValues entry changes", () => {
    const a = dataBindingQueryKey(baseBinding, { q: "foo" });
    const b = dataBindingQueryKey(baseBinding, { q: "bar" });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("changes when filters change (even structurally)", () => {
    const a = dataBindingQueryKey(baseBinding, {});
    const b = dataBindingQueryKey(
      {
        ...baseBinding,
        filters: { combinator: "and", rules: [{ field: "beds", operator: ">=", value: 2 }] },
      },
      {},
    );
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("differs across sources", () => {
    const u = dataBindingQueryKey({ source: "units" }, {});
    const p = dataBindingQueryKey({ source: "properties" }, {});
    const c = dataBindingQueryKey({ source: "company" }, {});
    expect(JSON.stringify(u)).not.toBe(JSON.stringify(p));
    expect(JSON.stringify(u)).not.toBe(JSON.stringify(c));
    expect(JSON.stringify(p)).not.toBe(JSON.stringify(c));
  });
});
