/**
 * TypeScript-prose rendering of the SiteConfig schema for the Initial
 * Generation system prompt. Hand-authored rather than generated from Zod
 * because (a) Claude reads TypeScript fluently and (b) the schema's
 * superRefine cross-field rules cannot be expressed in plain TS -- they need
 * the prose comments.
 *
 * Mirrors `apps/web/lib/site-config/schema.ts` exactly. If that schema
 * changes, this snippet MUST be updated in lockstep -- the
 * buildInitialGenerationSystemPrompt snapshot test will catch drift.
 */

export const SCHEMA_PROSE = String.raw`
type SiteConfig = {
  meta: {
    siteName: string;
    siteSlug: string;
    description?: string;
    favicon?: string;
  };
  brand: {
    palette: "ocean" | "forest" | "sunset" | "violet" | "monochrome" | "rose";
    primaryLogoUrl?: string;
    secondaryLogoUrl?: string;
    additionalLogos?: string[];
    fontFamily: string;
    customColors?: Record<string, string>;
  };
  global: {
    navBar: NavBarConfig;
    footer: FooterConfig;
  };
  pages: Page[];
  forms: FormDefinition[];
};

type Page = {
  id: string;
  slug: string;
  name: string;
  // "static" by default. "detail" pages render a per-row template -- see
  // the detail-page rules in the system prompt body.
  kind: "static" | "detail";
  // Required iff kind === "detail". Forbidden iff kind === "static".
  detailDataSource?: "properties" | "units";
  meta?: { title?: string; description?: string };
  rootComponent: ComponentNode;
};

type ComponentNode = {
  // Stable id. Use the format "cmp_<short>" so AI ops can address it.
  id: string;
  type: ComponentType;
  // Type-specific props. Each component's props shape is documented in the
  // component catalog snippet.
  props: Record<string, unknown>;
  style: StyleConfig;
  animation?: AnimationConfig;
  visibility?: "always" | "desktop" | "mobile";
  children?: ComponentNode[];
  // Present on Repeater components. The renderer iterates the data source
  // and instantiates the single child template per row.
  dataBinding?: DataBinding;
};

type StyleConfig = {
  background?:
    | { kind: "color"; value: string }
    | { kind: "gradient"; from: string; to: string; angle?: number };
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  border?: { width: number; style: "solid" | "dashed" | "dotted" | "none"; color: string };
  borderRadius?: number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  // Any CSS length token: "120px", "100%", "auto", "32rem".
  width?: string;
  height?: string;
  textColor?: string;
};

type AnimationConfig = {
  onEnter?: AnimationPreset;
  onHover?: AnimationPreset;
  duration?: number;
  delay?: number;
};

type AnimationPreset =
  | "none" | "fadeIn" | "fadeInUp" | "fadeInDown"
  | "slideInLeft" | "slideInRight" | "zoomIn" | "bounceIn"
  | "hoverLift" | "hoverGlow";

type DataBinding = {
  source: "properties" | "units" | "units_with_property" | "company";
  // Sprint 9 will narrow this. For Sprint 4, omit it and let the renderer
  // return the unfiltered set.
  filters?: unknown;
  connectedInputs?: { inputId: string; field: string; operator: string }[];
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
  emptyState?: ComponentNode;
};

type NavBarConfig = {
  links: { label: string; href: string }[];
  logoPlacement: "left" | "center" | "right";
  sticky: boolean;
};

type FooterConfig = {
  columns: { title: string; links: { label: string; href: string }[] }[];
  copyright: string;
};

type FormDefinition = {
  id: string;
  inputIds: string[];
  submitButtonId: string;
  successMessage?: string;
};

type ComponentType =
  | "Section" | "Row" | "Column"
  | "Heading" | "Paragraph" | "Button" | "Image" | "Logo"
  | "Spacer" | "Divider"
  | "NavBar" | "Footer" | "HeroBanner"
  | "PropertyCard" | "UnitCard" | "Repeater"
  | "InputField" | "Form"
  | "MapEmbed" | "Gallery";
`.trim();
