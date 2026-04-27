"use client";

// `createDefaultNode(type)` produces the freshly-id'd `ComponentNode` that
// Sprint 7 inserts when the user drops a palette card onto the canvas.
//
// Per Sprint 7's binding "Default props for palette inserts" table, with
// the 2026-04-26 deviation realigning HeroBanner / UnitCard / Form to the
// prop names their respective runtime safeParse schemas actually read.
// See `DECISIONS.md` 2026-04-26 — Sprint 7. Every default in the table
// MUST validate against both `componentNodeSchema.safeParse` (structural)
// AND the per-component runtime safeParse (semantic) — the
// `createDefaultNode.test.ts` file enforces both.

import { type ComponentNode, type ComponentType, newComponentId } from "@/lib/site-config";

const DEFAULT_PROPS: Record<ComponentType, Record<string, unknown>> = {
  Section: { as: "section" },
  Row: { gap: 16, alignItems: "stretch", justifyContent: "start", wrap: false },
  Column: { span: 12, gap: 8, alignItems: "stretch" },
  Heading: { text: "New heading", level: 2 },
  Paragraph: { text: "New paragraph." },
  Button: { label: "Button", href: "#", variant: "primary", linkMode: "static" },
  Image: { src: "", alt: "", fit: "cover" },
  Logo: {},
  Spacer: { height: 40 },
  Divider: { thickness: 1, color: "#e5e7eb" },
  NavBar: { links: [], logoPlacement: "left", sticky: false },
  Footer: { columns: [], copyright: "© 2026" },
  // FlowGroup is an empty horizontal container — no props at creation time;
  // layout is driven by the parent canvas context (Phase 5 x-axis resize).
  FlowGroup: {},
  HeroBanner: {
    heading: "New hero",
    subheading: "",
    ctaLabel: "Learn more",
    ctaHref: "#",
  },
  PropertyCard: {
    heading: "Property Name",
    body: "Property description goes here.",
    imageSrc: "",
    ctaLabel: "View Details",
    ctaHref: "#",
  },
  UnitCard: {
    heading: "Unit Name",
    beds: 0,
    baths: 0,
    sqft: 0,
    rent: 0,
    imageSrc: "",
    ctaLabel: "View Unit",
    ctaHref: "#",
  },
  Repeater: {},
  InputField: { name: "field", label: "Field", inputType: "text", required: false },
  Form: { formName: "new_form", submitLabel: "Submit", successMessage: "Thanks." },
  MapEmbed: { address: "" },
  Gallery: { images: [], columns: 3, gap: 8 },
};

// Container types seed `children: []` so the JSON shape matches the
// canvas-render-time invariant. Leaf types leave `children` undefined.
const CONTAINER_TYPES: ReadonlySet<ComponentType> = new Set<ComponentType>([
  "Section",
  "Row",
  "Column",
  "FlowGroup",
  "Form",
  "Repeater",
]);

export function createDefaultNode(type: ComponentType): ComponentNode {
  const node: ComponentNode = {
    id: newComponentId("cmp"),
    type,
    props: { ...DEFAULT_PROPS[type] },
    style: {},
  };
  if (CONTAINER_TYPES.has(type)) {
    node.children = [];
  }
  return node;
}
