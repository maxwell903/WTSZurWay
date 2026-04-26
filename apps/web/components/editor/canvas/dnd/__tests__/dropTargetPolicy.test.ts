// Sprint 7 routes drop-target validation through the component registry's
// `meta.childrenPolicy`. Drop into a `Repeater` template child is
// INTENTIONALLY out of scope this sprint — Sprint 9 owns that. A Heading
// dropped into an empty Repeater fills the template slot, which is the
// correct Sprint-7 behavior.

import { COMPONENT_TYPES, type ComponentNode, type ComponentType } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { canAcceptChild, findInsertionIndex, getChildrenPolicy } from "../dropTargetPolicy";

function makeNode(type: ComponentType, children?: ComponentNode[]): ComponentNode {
  const n: ComponentNode = { id: "cmp_x", type, props: {}, style: {} };
  if (children !== undefined) n.children = children;
  return n;
}

function makeChild(id: string): ComponentNode {
  return { id, type: "Heading", props: {}, style: {} };
}

describe("getChildrenPolicy — registry contract guard", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))(
    "%s exposes a non-empty childrenPolicy in {none, one, many}",
    (type) => {
      const policy = getChildrenPolicy(type);
      expect(["none", "one", "many"]).toContain(policy);
    },
  );

  it("matches the Sprint-3/3b registry assignments for representative types", () => {
    expect(getChildrenPolicy("Section")).toBe("many");
    expect(getChildrenPolicy("Row")).toBe("many");
    expect(getChildrenPolicy("Column")).toBe("many");
    expect(getChildrenPolicy("Form")).toBe("many");
    expect(getChildrenPolicy("Repeater")).toBe("one");
    expect(getChildrenPolicy("Heading")).toBe("none");
    expect(getChildrenPolicy("Paragraph")).toBe("none");
    expect(getChildrenPolicy("Image")).toBe("none");
  });
});

describe("canAcceptChild — none policy", () => {
  it("rejects every candidate on a Heading parent", () => {
    const heading = makeNode("Heading");
    expect(canAcceptChild(heading, "Heading")).toBe(false);
    expect(canAcceptChild(heading, "Section")).toBe(false);
  });

  it("rejects every candidate on an Image parent", () => {
    const image = makeNode("Image");
    expect(canAcceptChild(image, "Heading")).toBe(false);
  });
});

describe("canAcceptChild — many policy", () => {
  it("accepts an empty container", () => {
    expect(canAcceptChild(makeNode("Section", []), "Heading")).toBe(true);
  });

  it("accepts a non-empty container", () => {
    const section = makeNode("Section", [makeChild("cmp_a")]);
    expect(canAcceptChild(section, "Paragraph")).toBe(true);
  });

  it("accepts when children is undefined (treated as empty)", () => {
    expect(canAcceptChild(makeNode("Section"), "Heading")).toBe(true);
  });
});

describe("canAcceptChild — one policy", () => {
  it("accepts when the container is empty", () => {
    expect(canAcceptChild(makeNode("Repeater", []), "Heading")).toBe(true);
  });

  it("accepts when children is undefined (treated as empty)", () => {
    expect(canAcceptChild(makeNode("Repeater"), "Heading")).toBe(true);
  });

  it("rejects when the container already has one child", () => {
    const r = makeNode("Repeater", [makeChild("cmp_a")]);
    expect(canAcceptChild(r, "Paragraph")).toBe(false);
  });
});

describe("findInsertionIndex", () => {
  function parentWith(ids: string[]): ComponentNode {
    return makeNode(
      "Section",
      ids.map((id) => makeChild(id)),
    );
  }

  it("returns 0 when over.id is the first child (drop before first)", () => {
    expect(findInsertionIndex(parentWith(["cmp_a", "cmp_b", "cmp_c"]), "cmp_a")).toBe(0);
  });

  it("returns the middle index when over.id is a middle child", () => {
    expect(findInsertionIndex(parentWith(["cmp_a", "cmp_b", "cmp_c"]), "cmp_b")).toBe(1);
  });

  it("returns the last child's index when over.id is the last child", () => {
    expect(findInsertionIndex(parentWith(["cmp_a", "cmp_b", "cmp_c"]), "cmp_c")).toBe(2);
  });

  it("appends when over.id matches no child", () => {
    expect(findInsertionIndex(parentWith(["cmp_a"]), "cmp_unknown")).toBe(1);
  });

  it("returns 0 for an empty children array (still appends, parent is empty)", () => {
    expect(findInsertionIndex(parentWith([]), "anything")).toBe(0);
  });

  it("returns 0 when children is undefined", () => {
    expect(findInsertionIndex(makeNode("Section"), "anything")).toBe(0);
  });
});
