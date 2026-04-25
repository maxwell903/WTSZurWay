import { COMPONENT_TYPES, type ComponentNode, type ComponentType } from "@/lib/site-config";
import type { CSSProperties, ComponentType as ReactComponentType, ReactNode } from "react";
import { Divider } from "./Divider";
import { Heading } from "./Heading";
import { Image } from "./Image";
import { Paragraph } from "./Paragraph";
import { Section } from "./Section";
import { Spacer } from "./Spacer";

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

export type RegistryEntry = {
  Component: ReactComponentType<SiteComponentProps>;
  meta: {
    displayName: string;
    category: SiteComponentCategory;
    childrenPolicy: ChildrenPolicy;
  };
};

function makePlaceholder(type: ComponentType): ReactComponentType<SiteComponentProps> {
  function Placeholder(): ReactNode {
    throw new Error(`Component ${type} not yet implemented — Sprint 5`);
  }
  Placeholder.displayName = `${type}Placeholder`;
  return Placeholder;
}

// Meta entries for the 14 not-yet-implemented components. Categories and
// children policies are pre-assigned per PROJECT_SPEC.md §6.1 + §8.3 so that
// Sprint 5 only has to swap the Component reference, never re-categorize.
const placeholderMeta: Record<
  Exclude<ComponentType, "Section" | "Heading" | "Paragraph" | "Image" | "Spacer" | "Divider">,
  { displayName: string; category: SiteComponentCategory; childrenPolicy: ChildrenPolicy }
> = {
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
    meta: { displayName: "Heading", category: "Content", childrenPolicy: "none" },
  },
  Paragraph: {
    Component: Paragraph,
    meta: { displayName: "Paragraph", category: "Content", childrenPolicy: "none" },
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
  Row: { Component: makePlaceholder("Row"), meta: placeholderMeta.Row },
  Column: { Component: makePlaceholder("Column"), meta: placeholderMeta.Column },
  Button: { Component: makePlaceholder("Button"), meta: placeholderMeta.Button },
  Logo: { Component: makePlaceholder("Logo"), meta: placeholderMeta.Logo },
  NavBar: { Component: makePlaceholder("NavBar"), meta: placeholderMeta.NavBar },
  Footer: { Component: makePlaceholder("Footer"), meta: placeholderMeta.Footer },
  HeroBanner: {
    Component: makePlaceholder("HeroBanner"),
    meta: placeholderMeta.HeroBanner,
  },
  PropertyCard: {
    Component: makePlaceholder("PropertyCard"),
    meta: placeholderMeta.PropertyCard,
  },
  UnitCard: { Component: makePlaceholder("UnitCard"), meta: placeholderMeta.UnitCard },
  Repeater: { Component: makePlaceholder("Repeater"), meta: placeholderMeta.Repeater },
  InputField: {
    Component: makePlaceholder("InputField"),
    meta: placeholderMeta.InputField,
  },
  Form: { Component: makePlaceholder("Form"), meta: placeholderMeta.Form },
  MapEmbed: { Component: makePlaceholder("MapEmbed"), meta: placeholderMeta.MapEmbed },
  Gallery: { Component: makePlaceholder("Gallery"), meta: placeholderMeta.Gallery },
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
