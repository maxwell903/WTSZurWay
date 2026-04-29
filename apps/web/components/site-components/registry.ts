import { COMPONENT_TYPES, type ComponentNode, type ComponentType } from "@/lib/site-config";
import type { CSSProperties, ComponentType as ReactComponentType, ReactNode } from "react";
import { Button } from "./Button";
import { Column } from "./Column";
import { Divider } from "./Divider";
import { FlowGroup } from "./FlowGroup";
import { Footer } from "./Footer";
import { Form } from "./Form";
import { Gallery } from "./Gallery";
import { Heading } from "./Heading";
import { HeroBanner } from "./HeroBanner";
import { Image } from "./Image";
import { InputField } from "./InputField";
import { Logo } from "./Logo";
import { MapEmbed } from "./MapEmbed";
import { NavBar } from "./NavBar";
import { Paragraph } from "./Paragraph";
import { PropertyCard } from "./PropertyCard";
import { Repeater } from "./Repeater";
import { Row } from "./Row";
import { Section } from "./Section";
import { Spacer } from "./Spacer";
import { UnitCard } from "./UnitCard";

export type SiteComponentCategory =
  | "Layout"
  | "Content"
  | "Media"
  | "Data"
  | "Forms"
  | "Navigation";

export type ChildrenPolicy = "none" | "one" | "many";

export type SiteComponentProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

// Rich-text Phase 1 + 4.5 — descriptors for components that have editable
// text. Discriminated by `kind`:
//
//   "flat"  — a single (propKey, richKey) pair on the component's props.
//             Used for Heading.text/richText, Button.label/richLabel, etc.
//   "array" — a (itemPropKey, itemRichKey) pair on each item of an array
//             prop. Used for NavBar.links[i].label/richLabel and
//             Footer.columns[i].title/richTitle. The runtime addresses a
//             specific item via path-style propKey: "links.2.richLabel".
//
// `kind` defaults to "flat" so existing entries don't need updating.
// `profile` selects the extension set (block = paragraphs/lists/headings
// allowed, inline = marks-only for legal HTML inside <button>/<a>).
export type FlatTextFieldDescriptor = {
  kind?: "flat";
  propKey: string;
  richKey: string;
  label: string;
  profile: "block" | "inline";
};

export type ArrayTextFieldDescriptor = {
  kind: "array";
  arrayKey: string; // e.g. "links" | "columns"
  itemPropKey: string; // e.g. "label" | "title"
  itemRichKey: string; // e.g. "richLabel" | "richTitle"
  label: string;
  profile: "block" | "inline";
};

export type TextFieldDescriptor = FlatTextFieldDescriptor | ArrayTextFieldDescriptor;

export type RegistryEntry = {
  Component: ReactComponentType<SiteComponentProps>;
  meta: {
    displayName: string;
    category: SiteComponentCategory;
    childrenPolicy: ChildrenPolicy;
    textFields?: readonly TextFieldDescriptor[];
  };
};

// Meta entries for the 14 components implemented in Sprint 5. Categories and
// children policies were pre-assigned in Sprint 3 per PROJECT_SPEC.md §6.1 +
// §8.3 — Sprint 5 only swaps the Component reference, never re-categorizes.
const placeholderMeta: Record<
  Exclude<ComponentType, "Section" | "Heading" | "Paragraph" | "Image" | "Spacer" | "Divider">,
  { displayName: string; category: SiteComponentCategory; childrenPolicy: ChildrenPolicy }
> = {
  FlowGroup: { displayName: "Flow Group", category: "Layout", childrenPolicy: "many" },
  Row: { displayName: "Row", category: "Layout", childrenPolicy: "many" },
  Column: { displayName: "Column", category: "Layout", childrenPolicy: "many" },
  Button: { displayName: "Button", category: "Content", childrenPolicy: "none" },
  Logo: { displayName: "Logo", category: "Media", childrenPolicy: "none" },
  NavBar: { displayName: "NavBar", category: "Navigation", childrenPolicy: "none" },
  Footer: { displayName: "Footer", category: "Navigation", childrenPolicy: "none" },
  HeroBanner: { displayName: "Hero Banner", category: "Content", childrenPolicy: "none" },
  PropertyCard: { displayName: "Property Card", category: "Data", childrenPolicy: "none" },
  UnitCard: { displayName: "Unit Card", category: "Data", childrenPolicy: "none" },
  Repeater: { displayName: "Repeater", category: "Data", childrenPolicy: "one" },
  InputField: { displayName: "Input Field", category: "Forms", childrenPolicy: "none" },
  Form: { displayName: "Form", category: "Forms", childrenPolicy: "many" },
  MapEmbed: { displayName: "Map Embed", category: "Media", childrenPolicy: "none" },
  Gallery: { displayName: "Gallery", category: "Media", childrenPolicy: "none" },
};

export const componentRegistry: Record<ComponentType, RegistryEntry> = {
  Section: {
    Component: Section,
    meta: { displayName: "Section", category: "Layout", childrenPolicy: "many" },
  },
  Heading: {
    Component: Heading,
    meta: {
      displayName: "Heading",
      category: "Content",
      childrenPolicy: "none",
      textFields: [
        {
          propKey: "text",
          richKey: "richText",
          label: "Heading text",
          profile: "block",
        },
      ],
    },
  },
  Paragraph: {
    Component: Paragraph,
    meta: {
      displayName: "Paragraph",
      category: "Content",
      childrenPolicy: "none",
      textFields: [
        {
          propKey: "text",
          richKey: "richText",
          label: "Body text",
          profile: "block",
        },
      ],
    },
  },
  Image: {
    Component: Image,
    meta: { displayName: "Image", category: "Media", childrenPolicy: "none" },
  },
  Spacer: {
    Component: Spacer,
    meta: { displayName: "Spacer", category: "Layout", childrenPolicy: "none" },
  },
  Divider: {
    Component: Divider,
    meta: { displayName: "Divider", category: "Layout", childrenPolicy: "none" },
  },
  Row: { Component: Row, meta: placeholderMeta.Row },
  Column: { Component: Column, meta: placeholderMeta.Column },
  Button: {
    Component: Button,
    meta: {
      ...placeholderMeta.Button,
      textFields: [
        {
          propKey: "label",
          richKey: "richLabel",
          label: "Button label",
          profile: "inline",
        },
      ],
    },
  },
  Logo: { Component: Logo, meta: placeholderMeta.Logo },
  NavBar: {
    Component: NavBar,
    meta: {
      ...placeholderMeta.NavBar,
      textFields: [
        {
          kind: "array",
          arrayKey: "links",
          itemPropKey: "label",
          itemRichKey: "richLabel",
          label: "Link label",
          profile: "inline",
        },
      ],
    },
  },
  FlowGroup: { Component: FlowGroup, meta: placeholderMeta.FlowGroup },
  Footer: {
    Component: Footer,
    meta: {
      ...placeholderMeta.Footer,
      textFields: [
        {
          kind: "array",
          arrayKey: "columns",
          itemPropKey: "title",
          itemRichKey: "richTitle",
          label: "Column title",
          profile: "block",
        },
        {
          propKey: "copyright",
          richKey: "richCopyright",
          label: "Copyright",
          profile: "inline",
        },
      ],
    },
  },
  HeroBanner: {
    Component: HeroBanner,
    meta: {
      ...placeholderMeta.HeroBanner,
      textFields: [
        { propKey: "heading", richKey: "richHeading", label: "Hero heading", profile: "block" },
        {
          propKey: "subheading",
          richKey: "richSubheading",
          label: "Hero subheading",
          profile: "block",
        },
        {
          propKey: "ctaLabel",
          richKey: "richCtaLabel",
          label: "CTA label",
          profile: "inline",
        },
        {
          propKey: "secondaryCtaLabel",
          richKey: "richSecondaryCtaLabel",
          label: "Secondary CTA label",
          profile: "inline",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "heading",
          itemRichKey: "richHeading",
          label: "Slide heading",
          profile: "block",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "subheading",
          itemRichKey: "richSubheading",
          label: "Slide subheading",
          profile: "block",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "ctaLabel",
          itemRichKey: "richCtaLabel",
          label: "Slide CTA label",
          profile: "inline",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "secondaryCtaLabel",
          itemRichKey: "richSecondaryCtaLabel",
          label: "Slide secondary CTA label",
          profile: "inline",
        },
      ],
    },
  },
  PropertyCard: {
    Component: PropertyCard,
    meta: {
      ...placeholderMeta.PropertyCard,
      textFields: [
        { propKey: "heading", richKey: "richHeading", label: "Card heading", profile: "block" },
        { propKey: "body", richKey: "richBody", label: "Card body", profile: "block" },
        {
          propKey: "ctaLabel",
          richKey: "richCtaLabel",
          label: "CTA label",
          profile: "inline",
        },
      ],
    },
  },
  UnitCard: {
    Component: UnitCard,
    meta: {
      ...placeholderMeta.UnitCard,
      textFields: [
        { propKey: "heading", richKey: "richHeading", label: "Unit heading", profile: "block" },
        {
          propKey: "ctaLabel",
          richKey: "richCtaLabel",
          label: "CTA label",
          profile: "inline",
        },
      ],
    },
  },
  Repeater: { Component: Repeater, meta: placeholderMeta.Repeater },
  InputField: { Component: InputField, meta: placeholderMeta.InputField },
  Form: { Component: Form, meta: placeholderMeta.Form },
  MapEmbed: { Component: MapEmbed, meta: placeholderMeta.MapEmbed },
  Gallery: { Component: Gallery, meta: placeholderMeta.Gallery },
};

export function getRegistryEntry(type: ComponentType): RegistryEntry {
  const entry = componentRegistry[type];
  if (!entry) {
    throw new Error(`Unknown component type: ${type satisfies string}`);
  }
  return entry;
}

export function isRegisteredType(type: string): type is ComponentType {
  return (COMPONENT_TYPES as readonly string[]).includes(type);
}

// Rich-text Phase 1 — convenience lookup. Returns `[]` for components that
// don't carry editable text (vs `undefined`) so callers can iterate
// without null-checking.
export function getTextFields(type: ComponentType): readonly TextFieldDescriptor[] {
  return componentRegistry[type].meta.textFields ?? [];
}

export function hasTextFields(type: ComponentType): boolean {
  return getTextFields(type).length > 0;
}
