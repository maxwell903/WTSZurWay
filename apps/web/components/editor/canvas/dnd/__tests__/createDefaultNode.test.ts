import { COMPONENT_TYPES, componentNodeSchema } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { createDefaultNode } from "../createDefaultNode";

describe("createDefaultNode — id format", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))(
    "%s emits a cmp_<short> id matching /^cmp_[a-z0-9]+$/",
    (type) => {
      const node = createDefaultNode(type);
      expect(node.id).toMatch(/^cmp_[a-z0-9]+$/);
    },
  );

  it("two consecutive calls produce distinct ids", () => {
    const a = createDefaultNode("Heading");
    const b = createDefaultNode("Heading");
    expect(a.id).not.toBe(b.id);
  });
});

describe("createDefaultNode — structural schema round-trip", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))(
    "%s round-trips through componentNodeSchema.safeParse",
    (type) => {
      const node = createDefaultNode(type);
      const result = componentNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    },
  );
});

describe("createDefaultNode — never sets animation/visibility/dataBinding", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))(
    "%s output omits animation, visibility, and dataBinding",
    (type) => {
      const node = createDefaultNode(type);
      expect("animation" in node).toBe(false);
      expect("visibility" in node).toBe(false);
      expect("dataBinding" in node).toBe(false);
    },
  );
});

describe("createDefaultNode — type is preserved", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))("%s output has type === %s", (type) => {
    expect(createDefaultNode(type).type).toBe(type);
  });
});

describe("createDefaultNode — style is always {}", () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))("%s starts with style: {}", (type) => {
    expect(createDefaultNode(type).style).toEqual({});
  });
});

describe("createDefaultNode — container vs leaf children seeding", () => {
  it.each([["Section"], ["Row"], ["Column"], ["Form"], ["Repeater"]] as const)(
    "%s starts with an empty children array",
    (type) => {
      const node = createDefaultNode(type);
      expect(node.children).toEqual([]);
    },
  );

  it.each([
    ["Heading"],
    ["Paragraph"],
    ["Button"],
    ["Image"],
    ["Spacer"],
    ["Logo"],
    ["Divider"],
    ["NavBar"],
    ["Footer"],
  ] as const)("%s leaves children undefined (leaf type)", (type) => {
    const node = createDefaultNode(type);
    expect(node.children).toBeUndefined();
  });
});

describe("createDefaultNode — props match the runtime safeParse contract", () => {
  // The 2026-04-26 Sprint-7 deviation realigned three rows in the binding
  // default-props table to the prop names the corresponding runtime
  // components actually read. These tests are the contract guard against
  // future drift.

  it("Form props use formName/submitLabel/successMessage (NOT formId)", () => {
    const node = createDefaultNode("Form");
    expect(Object.keys(node.props).sort()).toEqual(["formName", "submitLabel", "successMessage"]);
    expect(node.props).toMatchObject({
      formName: "new_form",
      submitLabel: "Submit",
      successMessage: "Thanks.",
    });
    expect("formId" in node.props).toBe(false);
  });

  it("HeroBanner props use heading/subheading (NOT headline/subheadline) and seed slideshow defaults", () => {
    const node = createDefaultNode("HeroBanner");
    expect(Object.keys(node.props).sort()).toEqual([
      "autoplay",
      "ctaHref",
      "ctaLabel",
      "heading",
      "images",
      "intervalMs",
      "loop",
      "pauseOnHover",
      "showArrows",
      "showDots",
      "subheading",
    ]);
    expect(node.props).toMatchObject({
      heading: "New hero",
      subheading: "",
      ctaLabel: "Learn more",
      ctaHref: "#",
      images: [],
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      pauseOnHover: true,
      showDots: true,
      showArrows: false,
    });
    expect("headline" in node.props).toBe(false);
    expect("subheadline" in node.props).toBe(false);
  });

  it("UnitCard props use heading/beds/baths/imageSrc (runtime contract)", () => {
    const node = createDefaultNode("UnitCard");
    expect(node.props).toMatchObject({
      heading: "Unit Name",
      beds: 0,
      baths: 0,
      sqft: 0,
      rent: 0,
      imageSrc: "",
      ctaLabel: "View Unit",
      ctaHref: "#",
    });
    expect("unitName" in node.props).toBe(false);
    expect("bedrooms" in node.props).toBe(false);
    expect("bathrooms" in node.props).toBe(false);
    expect("primaryImageUrl" in node.props).toBe(false);
  });

  it("Section default props include freePlacement=true so new sections opt into absolute layout", () => {
    expect(createDefaultNode("Section").props).toEqual({
      as: "section",
      freePlacement: true,
    });
  });

  it("Row default props match Sprint-7 table verbatim", () => {
    expect(createDefaultNode("Row").props).toEqual({
      gap: 16,
      alignItems: "stretch",
      justifyContent: "start",
      wrap: false,
    });
  });

  it("Column default span is 12", () => {
    expect(createDefaultNode("Column").props).toEqual({
      span: 12,
      gap: 8,
      alignItems: "stretch",
    });
  });

  it("Image default props match Sprint-7 table verbatim", () => {
    expect(createDefaultNode("Image").props).toEqual({ src: "", alt: "", fit: "cover" });
  });

  it("Spacer default height is 40 (numeric, NOT style.height)", () => {
    const node = createDefaultNode("Spacer");
    expect(node.props).toEqual({ height: 40 });
    expect(node.style).toEqual({});
  });

  it("Logo defaults to {} (reads brand config at render time)", () => {
    expect(createDefaultNode("Logo").props).toEqual({});
  });

  it("Repeater defaults to {} (data binding lands in Sprint 9)", () => {
    expect(createDefaultNode("Repeater").props).toEqual({});
  });
});

describe("createDefaultNode for FlowGroup", () => {
  it("returns a node with empty children array", () => {
    const node = createDefaultNode("FlowGroup");
    expect(node.type).toBe("FlowGroup");
    expect(node.children).toEqual([]);
    expect(node.props).toEqual({});
  });

  it("validates against componentNodeSchema", () => {
    const node = createDefaultNode("FlowGroup");
    expect(componentNodeSchema.safeParse(node).success).toBe(true);
  });
});
