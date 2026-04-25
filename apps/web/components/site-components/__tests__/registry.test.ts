import { COMPONENT_TYPES } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { componentRegistry, getRegistryEntry, isRegisteredType } from "../registry";

const REAL_TYPES = ["Section", "Heading", "Paragraph", "Image", "Spacer", "Divider"] as const;
const PLACEHOLDER_TYPES = COMPONENT_TYPES.filter(
  (t) => !(REAL_TYPES as readonly string[]).includes(t),
);

describe("componentRegistry", () => {
  it("has an entry for every documented ComponentType", () => {
    for (const t of COMPONENT_TYPES) {
      expect(componentRegistry[t]).toBeDefined();
    }
  });

  it("exposes a sensible meta record on every entry", () => {
    for (const t of COMPONENT_TYPES) {
      const entry = componentRegistry[t];
      expect(entry.meta.displayName.length).toBeGreaterThan(0);
      expect(["Layout", "Content", "Media", "Data", "Forms", "Navigation"]).toContain(
        entry.meta.category,
      );
      expect(["none", "one", "many"]).toContain(entry.meta.childrenPolicy);
    }
  });

  it("has six real Sprint-3 components and 14 placeholders", () => {
    expect(REAL_TYPES.length).toBe(6);
    expect(PLACEHOLDER_TYPES.length).toBe(14);
  });

  it("placeholder Components throw 'not yet implemented — Sprint 5' when invoked", () => {
    for (const t of PLACEHOLDER_TYPES) {
      const Component = componentRegistry[t].Component;
      expect(() =>
        Component({
          node: { id: "x", type: t, props: {}, style: {} },
          cssStyle: {},
        }),
      ).toThrow(`Component ${t} not yet implemented — Sprint 5`);
    }
  });

  it("real components do NOT throw when invoked with a minimal node", () => {
    for (const t of REAL_TYPES) {
      const Component = componentRegistry[t].Component;
      expect(() =>
        Component({
          node: { id: "x", type: t, props: {}, style: {} },
          cssStyle: {},
        }),
      ).not.toThrow();
    }
  });
});

describe("getRegistryEntry", () => {
  it("returns the entry for a known type", () => {
    expect(getRegistryEntry("Section").meta.displayName).toBe("Section");
  });
});

describe("isRegisteredType", () => {
  it("recognizes documented types", () => {
    expect(isRegisteredType("Section")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isRegisteredType("Banana")).toBe(false);
  });
});
