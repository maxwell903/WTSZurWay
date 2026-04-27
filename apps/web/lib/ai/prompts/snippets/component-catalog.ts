/**
 * Catalog of every registered site component, keyed by ComponentType. The
 * Initial Generation system prompt embeds this so Claude knows exactly
 * which components are available and what props each one accepts.
 *
 * Sourced from PROJECT_SPEC.md §6.1 and the per-component SPEC.md files
 * under apps/web/components/site-components/. When a component's prop
 * surface changes, update the corresponding entry here -- the prompt
 * snapshot test will fail until this snippet matches the registry's truth.
 */

import { COMPONENT_TYPES, type ComponentType } from "@/lib/site-config";

type ComponentDoc = {
  category: "Layout" | "Content" | "Media" | "Data" | "Forms" | "Navigation";
  childrenPolicy: "none" | "one" | "many";
  description: string;
  props: string;
};

const CATALOG: Record<ComponentType, ComponentDoc> = {
  Section: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Top-level vertical container. Use one per logical page section.",
    props: "{ maxWidth?: number | 'full'; align?: 'left' | 'center' | 'right' }",
  },
  Row: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Horizontal flex container. Children laid out left-to-right.",
    props: "{ gap?: number; align?: 'start' | 'center' | 'end'; wrap?: boolean }",
  },
  Column: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Vertical flex container with a width (1-12 grid units).",
    props: "{ span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; gap?: number }",
  },
  Heading: {
    category: "Content",
    childrenPolicy: "none",
    description: "Page or section title.",
    props: "{ text: string; level: 1 | 2 | 3 | 4 | 5 | 6 }",
  },
  Paragraph: {
    category: "Content",
    childrenPolicy: "none",
    description: "Body copy. Plain text only -- no inline formatting.",
    props: "{ text: string }",
  },
  Button: {
    category: "Content",
    childrenPolicy: "none",
    description:
      'Primary or secondary action. linkMode="detail" pairs with detailPageSlug to link into a detail page (Sprint 9b resolves the {row.id} segment at render time).',
    props:
      '{ label: string; href?: string; variant?: "primary" | "secondary" | "outline"; linkMode?: "static" | "detail"; detailPageSlug?: string }',
  },
  Image: {
    category: "Media",
    childrenPolicy: "none",
    description: "Static image.",
    props: "{ src: string; alt: string; objectFit?: 'cover' | 'contain' }",
  },
  Logo: {
    category: "Media",
    childrenPolicy: "none",
    description: "Renders the brand's primaryLogoUrl (or override `src`).",
    props: "{ src?: string; alt?: string; height?: number }",
  },
  Spacer: {
    category: "Layout",
    childrenPolicy: "none",
    description: "Vertical empty space.",
    props: "{ height: number }",
  },
  Divider: {
    category: "Layout",
    childrenPolicy: "none",
    description: "Horizontal rule.",
    props: "{ thickness?: number; color?: string }",
  },
  NavBar: {
    category: "Navigation",
    childrenPolicy: "none",
    description:
      "Top navigation bar. Pulls config.global.navBar by default; props overrides per-instance.",
    props: "{ links?: { label: string; href: string }[]; sticky?: boolean }",
  },
  Footer: {
    category: "Navigation",
    childrenPolicy: "none",
    description:
      "Site footer. Pulls config.global.footer by default; props overrides per-instance.",
    props:
      "{ columns?: { title: string; links: { label: string; href: string }[] }[]; copyright?: string }",
  },
  HeroBanner: {
    category: "Content",
    childrenPolicy: "none",
    description: "Large above-the-fold banner with image, headline, subheadline, and CTA.",
    props:
      "{ headline: string; subheadline?: string; backgroundImageUrl?: string; ctaLabel?: string; ctaHref?: string }",
  },
  PropertyCard: {
    category: "Data",
    childrenPolicy: "none",
    description:
      "Card rendering one Property. Props can be bound to RM fields with {{ row.* }} when used inside a Repeater of properties.",
    props:
      "{ name: string; city?: string; state?: string; heroImageUrl?: string; propertyType?: string; ctaLabel?: string; ctaHref?: string }",
  },
  UnitCard: {
    category: "Data",
    childrenPolicy: "none",
    description:
      "Card rendering one Unit. Props can be bound to RM fields with {{ row.* }} when used inside a Repeater of units.",
    props:
      "{ unitName: string; bedrooms?: number; bathrooms?: number; rent?: number; primaryImageUrl?: string; ctaLabel?: string; ctaHref?: string }",
  },
  Repeater: {
    category: "Data",
    childrenPolicy: "one",
    description:
      'Iterates over a data source and renders its single child once per row. Pair with detail pages: a Repeater of units MUST be paired with a kind="detail" page with detailDataSource="units". Same for properties.',
    props: "{} -- configuration lives in dataBinding (source/filters/sort/limit)",
  },
  InputField: {
    category: "Forms",
    childrenPolicy: "none",
    description:
      "A single form input. defaultValueFromQueryParam reads window.location.search on mount (used by cross-page filter links).",
    props:
      '{ name: string; label?: string; placeholder?: string; type?: "text" | "email" | "tel" | "number" | "textarea" | "select" | "checkbox"; defaultValueFromQueryParam?: string; options?: { value: string; label: string }[] }',
  },
  Form: {
    category: "Forms",
    childrenPolicy: "many",
    description:
      "Wraps inputs and a submit button. Wired to the global `forms` array via the Form's id matching a FormDefinition.id.",
    props: "{ formId: string }",
  },
  MapEmbed: {
    category: "Media",
    childrenPolicy: "none",
    description: "Embedded map. For the demo, a static map iframe is acceptable.",
    props: "{ address?: string; lat?: number; lng?: number; zoom?: number }",
  },
  Gallery: {
    category: "Media",
    childrenPolicy: "none",
    description: "Image grid.",
    props: "{ images: { src: string; alt?: string }[]; columns?: 2 | 3 | 4 }",
  },
  // FlowGroup is engine-managed; the AI must never emit it directly.
  FlowGroup: {
    category: "Layout",
    childrenPolicy: "many",
    description:
      "Engine-managed horizontal flex wrapper. Never emit FlowGroup directly — it is auto-inserted by the editor when a user drops on the side edge of a component.",
    props: "(none)",
  },
};

export function buildComponentCatalog(): string {
  return COMPONENT_TYPES.map((type) => {
    const doc = CATALOG[type];
    return [
      `### ${type} (${doc.category}, children: ${doc.childrenPolicy})`,
      doc.description,
      `Props: ${doc.props}`,
    ].join("\n");
  }).join("\n\n");
}
