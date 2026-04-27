import { COMPONENT_TYPES } from "@/lib/site-config";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { componentRegistry, getRegistryEntry, isRegisteredType } from "../registry";

const SPRINT_3_TYPES = ["Section", "Heading", "Paragraph", "Image", "Spacer", "Divider"] as const;
const SPRINT_5_TYPES = COMPONENT_TYPES.filter(
  (t) => !(SPRINT_3_TYPES as readonly string[]).includes(t),
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

  it("has six Sprint-3 components and 14 Sprint-5 components", () => {
    expect(SPRINT_3_TYPES.length).toBe(6);
    expect(SPRINT_5_TYPES.length).toBe(14);
  });

  // Building a React element from each registry entry is the typecheck-clean
  // way to assert "this Component is a real, callable thing." We use
  // React.createElement instead of invoking Component(...) directly because
  // ComponentType<P> = ComponentClass | FunctionComponent and the former has
  // no call signature under noImplicitAny / strict mode.
  it("every registry Component yields a valid React element when given a minimal node", () => {
    for (const t of COMPONENT_TYPES) {
      const entry = componentRegistry[t];
      expect(() =>
        createElement(entry.Component, {
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

describe("FlowGroup registry entry", () => {
  it("registers FlowGroup", () => {
    expect(componentRegistry.FlowGroup).toBeDefined();
  });

  it("FlowGroup childrenPolicy is many", () => {
    expect(componentRegistry.FlowGroup.meta.childrenPolicy).toBe("many");
  });

  it("FlowGroup category is Layout", () => {
    expect(componentRegistry.FlowGroup.meta.category).toBe("Layout");
  });
});
