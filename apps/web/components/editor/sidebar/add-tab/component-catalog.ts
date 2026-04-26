import type { ComponentType } from "@/lib/site-config";
import {
  BadgePlus,
  Building2,
  ClipboardList,
  Columns3,
  DoorOpen,
  Heading1,
  Image as ImageIcon,
  Images,
  LayoutPanelTop,
  LayoutTemplate,
  type LucideIcon,
  MapPin,
  Menu,
  Minus,
  Pilcrow,
  RectangleHorizontal,
  Repeat,
  Rows3,
  Space,
  Square,
  TextCursorInput,
} from "lucide-react";

export type ComponentGroup =
  | "Layout"
  | "Content"
  | "Media"
  | "Data"
  | "Forms"
  | "Navigation";

export const COMPONENT_GROUP_ORDER: ComponentGroup[] = [
  "Layout",
  "Content",
  "Media",
  "Data",
  "Forms",
  "Navigation",
];

export type ComponentCatalogEntry = {
  type: ComponentType;
  group: ComponentGroup;
  label: string;
  icon: LucideIcon;
  description: string;
};

// 20 catalog entries -- the keys match registry.ts exactly. Test
// component-catalog.test.ts asserts the count and the parity with the
// registry. HeroBanner is grouped under Layout per the Sprint 6 plan note
// (a hero is a structural lead block).
export const COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  // Layout
  {
    type: "Section",
    group: "Layout",
    label: "Section",
    icon: LayoutPanelTop,
    description: "Full-width container that holds rows.",
  },
  {
    type: "Row",
    group: "Layout",
    label: "Row",
    icon: Rows3,
    description: "Horizontal container for columns.",
  },
  {
    type: "Column",
    group: "Layout",
    label: "Column",
    icon: Columns3,
    description: "Vertical container for elements.",
  },
  {
    type: "Spacer",
    group: "Layout",
    label: "Spacer",
    icon: Space,
    description: "Pure vertical whitespace.",
  },
  {
    type: "Divider",
    group: "Layout",
    label: "Divider",
    icon: Minus,
    description: "Horizontal rule between sections.",
  },
  {
    type: "HeroBanner",
    group: "Layout",
    label: "Hero Banner",
    icon: LayoutTemplate,
    description: "Large image + overlay text + CTA.",
  },

  // Content
  {
    type: "Heading",
    group: "Content",
    label: "Heading",
    icon: Heading1,
    description: "H1, H2, or H3 with configurable size.",
  },
  {
    type: "Paragraph",
    group: "Content",
    label: "Paragraph",
    icon: Pilcrow,
    description: "Long-form text block.",
  },
  {
    type: "Button",
    group: "Content",
    label: "Button",
    icon: RectangleHorizontal,
    description: "Link or CTA with style presets.",
  },

  // Media
  {
    type: "Image",
    group: "Media",
    label: "Image",
    icon: ImageIcon,
    description: "Single image with alt and fit.",
  },
  {
    type: "Logo",
    group: "Media",
    label: "Logo",
    icon: BadgePlus,
    description: "Pulls from your uploaded primary or secondary logo.",
  },
  {
    type: "Gallery",
    group: "Media",
    label: "Gallery",
    icon: Images,
    description: "Image grid (uses unit images by default).",
  },
  {
    type: "MapEmbed",
    group: "Media",
    label: "Map Embed",
    icon: MapPin,
    description: "Embedded map for a property address.",
  },

  // Data
  {
    type: "Repeater",
    group: "Data",
    label: "Repeater",
    icon: Repeat,
    description: "Renders a child template once per row of a data source.",
  },
  {
    type: "PropertyCard",
    group: "Data",
    label: "Property Card",
    icon: Building2,
    description: "Pre-bound display of one property.",
  },
  {
    type: "UnitCard",
    group: "Data",
    label: "Unit Card",
    icon: DoorOpen,
    description: "Pre-bound display of one unit.",
  },

  // Forms
  {
    type: "Form",
    group: "Forms",
    label: "Form",
    icon: ClipboardList,
    description: "Wraps inputs and a submit button.",
  },
  {
    type: "InputField",
    group: "Forms",
    label: "Input Field",
    icon: TextCursorInput,
    description: "Text, email, phone, or number input.",
  },

  // Navigation
  {
    type: "NavBar",
    group: "Navigation",
    label: "NavBar",
    icon: Menu,
    description: "Site-wide top navigation.",
  },
  {
    type: "Footer",
    group: "Navigation",
    label: "Footer",
    icon: Square,
    description: "Site-wide footer with company info and links.",
  },
];

export function getCatalogByGroup(): Record<ComponentGroup, ComponentCatalogEntry[]> {
  const result = {
    Layout: [],
    Content: [],
    Media: [],
    Data: [],
    Forms: [],
    Navigation: [],
  } as Record<ComponentGroup, ComponentCatalogEntry[]>;
  for (const entry of COMPONENT_CATALOG) {
    result[entry.group].push(entry);
  }
  return result;
}
