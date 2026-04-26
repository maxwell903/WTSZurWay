import { COMPONENT_TYPES, type ComponentNode, type ComponentType } from "@/lib/site-config";
import type { CSSProperties, ComponentType as ReactComponentType, ReactNode } from "react";
import { Button } from "./Button";
import { Column } from "./Column";
import { Divider } from "./Divider";
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

export type RegistryEntry = {
  Component: ReactComponentType<SiteComponentProps>;
  meta: {
    displayName: string;
    category: SiteComponentCategory;
    childrenPolicy: ChildrenPolicy;
  };
};

// Meta entries for the 14 components implemented in Sprint 5. Categories and
// children policies were pre-assigned in Sprint 3 per PROJECT_SPEC.md §6.1 +
// §8.3 — Sprint 5 only swaps the Component reference, never re-categorizes.
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
  Row: { Component: Row, meta: placeholderMeta.Row },
  Column: { Component: Column, meta: placeholderMeta.Column },
  Button: { Component: Button, meta: placeholderMeta.Button },
  Logo: { Component: Logo, meta: placeholderMeta.Logo },
  NavBar: { Component: NavBar, meta: placeholderMeta.NavBar },
  Footer: { Component: Footer, meta: placeholderMeta.Footer },
  HeroBanner: { Component: HeroBanner, meta: placeholderMeta.HeroBanner },
  PropertyCard: { Component: PropertyCard, meta: placeholderMeta.PropertyCard },
  UnitCard: { Component: UnitCard, meta: placeholderMeta.UnitCard },
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
