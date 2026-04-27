import { PALETTE_IDS } from "@/lib/setup-form/types";
import { z } from "zod";

// ----- Component types ----------------------------------------------------

export const COMPONENT_TYPES = [
  "Section",
  "Row",
  "Column",
  "FlowGroup",
  "Heading",
  "Paragraph",
  "Button",
  "Image",
  "Logo",
  "Spacer",
  "Divider",
  "NavBar",
  "Footer",
  "HeroBanner",
  "PropertyCard",
  "UnitCard",
  "Repeater",
  "InputField",
  "Form",
  "MapEmbed",
  "Gallery",
] as const;

export const componentTypeSchema = z.enum(COMPONENT_TYPES);
export type ComponentType = z.infer<typeof componentTypeSchema>;

// ----- Animation ----------------------------------------------------------

export const ANIMATION_PRESETS = [
  "none",
  "fadeIn",
  "fadeInUp",
  "fadeInDown",
  "slideInLeft",
  "slideInRight",
  "zoomIn",
  "bounceIn",
  "hoverLift",
  "hoverGlow",
] as const;

export const animationPresetSchema = z.enum(ANIMATION_PRESETS);
export type AnimationPreset = z.infer<typeof animationPresetSchema>;

export const animationConfigSchema = z.object({
  onEnter: animationPresetSchema.optional(),
  onHover: animationPresetSchema.optional(),
  duration: z.number().nonnegative().optional(),
  delay: z.number().nonnegative().optional(),
});
export type AnimationConfig = z.infer<typeof animationConfigSchema>;

// ----- Style primitives ---------------------------------------------------

export const SHADOW_PRESETS = ["none", "sm", "md", "lg", "xl"] as const;
export const shadowPresetSchema = z.enum(SHADOW_PRESETS);
export type ShadowPreset = z.infer<typeof shadowPresetSchema>;

// SizeUnit is any CSS length token: "120px", "100%", "auto", "32rem", etc.
// Stored as a string so AI-generated configs can pass arbitrary CSS lengths
// without a stricter regex blocking them.
export const sizeUnitSchema = z.string();
export type SizeUnit = z.infer<typeof sizeUnitSchema>;

export const colorOrGradientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("color"), value: z.string() }),
  z.object({
    kind: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
    angle: z.number().optional(),
  }),
]);
export type ColorOrGradient = z.infer<typeof colorOrGradientSchema>;

export const spacingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});
export type Spacing = z.infer<typeof spacingSchema>;

export const BORDER_STYLES = ["solid", "dashed", "dotted", "none"] as const;
export const borderSchema = z.object({
  width: z.number().nonnegative(),
  style: z.enum(BORDER_STYLES),
  color: z.string(),
});
export type Border = z.infer<typeof borderSchema>;

export const styleConfigSchema = z.object({
  background: colorOrGradientSchema.optional(),
  padding: spacingSchema.optional(),
  margin: spacingSchema.optional(),
  border: borderSchema.optional(),
  borderRadius: z.number().nonnegative().optional(),
  shadow: shadowPresetSchema.optional(),
  width: sizeUnitSchema.optional(),
  height: sizeUnitSchema.optional(),
  textColor: z.string().optional(),
});
export type StyleConfig = z.infer<typeof styleConfigSchema>;

// ----- Recursive ComponentNode + DataBinding ------------------------------

export type DataBinding = {
  source: "properties" | "units" | "units_with_property" | "company";
  filters?: unknown;
  connectedInputs?: { inputId: string; field: string; operator: string }[];
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
  emptyState?: ComponentNode;
};

export type ComponentNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style: StyleConfig;
  animation?: AnimationConfig;
  visibility?: "always" | "desktop" | "mobile";
  children?: ComponentNode[];
  dataBinding?: DataBinding;
};

// Forward declaration: dataBindingSchema references componentNodeSchema and
// vice versa. Both are z.lazy so the references resolve at validation time.
export const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: componentTypeSchema,
    props: z.record(z.string(), z.unknown()),
    style: styleConfigSchema,
    animation: animationConfigSchema.optional(),
    visibility: z.enum(["always", "desktop", "mobile"]).optional(),
    children: z.array(componentNodeSchema).optional(),
    dataBinding: dataBindingSchema.optional(),
  }),
);

export const dataBindingSchema: z.ZodType<DataBinding> = z.lazy(() =>
  z.object({
    source: z.enum(["properties", "units", "units_with_property", "company"]),
    // TODO(architect): Sprint 9 will narrow filters to the react-querybuilder shape.
    filters: z.unknown().optional(),
    connectedInputs: z
      .array(
        z.object({
          inputId: z.string(),
          field: z.string(),
          operator: z.string(),
        }),
      )
      .optional(),
    sort: z
      .object({
        field: z.string(),
        direction: z.enum(["asc", "desc"]),
      })
      .optional(),
    limit: z.number().int().nonnegative().optional(),
    emptyState: componentNodeSchema.optional(),
  }),
);

// ----- Forms, NavBar, Footer, Page, SiteConfig ----------------------------

export const formDefinitionSchema = z.object({
  id: z.string(),
  inputIds: z.array(z.string()),
  submitButtonId: z.string(),
  successMessage: z.string().optional(),
});
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

const navLinkSchema = z.object({ label: z.string(), href: z.string() });

export const navBarConfigSchema = z.object({
  links: z.array(navLinkSchema),
  logoPlacement: z.enum(["left", "center", "right"]),
  sticky: z.boolean(),
});
export type NavBarConfig = z.infer<typeof navBarConfigSchema>;

export const footerConfigSchema = z.object({
  columns: z.array(
    z.object({
      title: z.string(),
      links: z.array(navLinkSchema),
    }),
  ),
  copyright: z.string(),
});
export type FooterConfig = z.infer<typeof footerConfigSchema>;

export const pageKindSchema = z.enum(["static", "detail"]);
export type PageKind = z.infer<typeof pageKindSchema>;

export const detailDataSourceSchema = z.enum(["properties", "units"]);
export type DetailDataSource = z.infer<typeof detailDataSourceSchema>;

export const pageSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: pageKindSchema.default("static"),
    detailDataSource: detailDataSourceSchema.optional(),
    meta: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
    rootComponent: componentNodeSchema,
  })
  .superRefine((page, ctx) => {
    if (page.kind === "detail" && page.detailDataSource === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailDataSource"],
        message: "Detail pages must specify detailDataSource",
      });
    }
    if (page.kind === "static" && page.detailDataSource !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailDataSource"],
        message: "Static pages must not specify detailDataSource",
      });
    }
  });
export type Page = z.infer<typeof pageSchema>;

export const paletteIdSchema = z.enum(PALETTE_IDS);
export type PaletteId = z.infer<typeof paletteIdSchema>;

export const siteConfigSchema = z
  .object({
    meta: z.object({
      siteName: z.string(),
      siteSlug: z.string(),
      description: z.string().optional(),
      favicon: z.string().optional(),
    }),
    brand: z.object({
      palette: paletteIdSchema,
      primaryLogoUrl: z.string().optional(),
      secondaryLogoUrl: z.string().optional(),
      additionalLogos: z.array(z.string()).optional(),
      fontFamily: z.string(),
      customColors: z.record(z.string(), z.string()).optional(),
    }),
    global: z.object({
      navBar: navBarConfigSchema,
      footer: footerConfigSchema,
    }),
    pages: z.array(pageSchema),
    forms: z.array(formDefinitionSchema),
  })
  .superRefine((config, ctx) => {
    // U2 routing per PROJECT_SPEC.md §11 + §8.12: slug uniqueness is per `kind`,
    // not global. A static and a detail page may share a slug; two pages of the
    // same kind may not.
    const seen = new Map<string, number>();
    config.pages.forEach((page, index) => {
      const key = `${page.kind}::${page.slug}`;
      const firstIndex = seen.get(key);
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", index, "slug"],
          message: `Duplicate ${page.kind} page slug "${page.slug}" (already used by page at index ${firstIndex})`,
        });
      } else {
        seen.set(key, index);
      }
    });
  });
export type SiteConfig = z.infer<typeof siteConfigSchema>;
