import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("Sprint 0 smoke test", () => {
  it("cn() merges class values, dropping falsy ones", () => {
    expect(cn("a", undefined, "b")).toBe("a b");
  });
});
