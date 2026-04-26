import type { SiteConfig } from "@/types/site-config";

// Hand-rolled fixture for the /dev/preview route. Exercises all six
// Sprint-3 components (Section, Heading, Paragraph, Image, Spacer, Divider)
// and at least three different StyleConfig features (background gradient,
// padding, borderRadius, shadow, border, textColor).
export const previewFixture: SiteConfig = {
  meta: {
    siteName: "Aurora Property Group",
    siteSlug: "aurora-cincy-preview",
    description: "Sprint 3 dev preview fixture — exercises every shipped component.",
  },
  brand: {
    palette: "ocean",
    fontFamily: "Inter",
  },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "© 2026 Aurora Property Group" },
  },
  pages: [
    {
      id: "p_home",
      slug: "home",
      name: "Home",
      kind: "static",
      rootComponent: {
        id: "cmp_root",
        type: "Section",
        props: { as: "main" },
        // Style feature #1: gradient background.
        // Style feature #2: padding on every side.
        style: {
          background: {
            kind: "gradient",
            from: "#0f3a5f",
            to: "#1c5f8a",
            angle: 200,
          },
          padding: { top: 64, right: 32, bottom: 64, left: 32 },
          textColor: "#ffffff",
        },
        children: [
          {
            id: "cmp_hero_heading",
            type: "Heading",
            props: { text: "Where Cincinnati feels like home.", level: 1 },
            // Style feature #3: explicit textColor on a leaf component.
            style: { textColor: "#ffffff", margin: { bottom: 16 } },
          },
          {
            id: "cmp_hero_paragraph",
            type: "Paragraph",
            props: {
              text: "Aurora Property Group manages residential, commercial, and manufactured-housing properties across the greater Cincinnati area. Browse our available units below or get in touch.",
            },
            style: { textColor: "#dbe9f4", margin: { bottom: 24 } },
          },
          {
            id: "cmp_spacer_above_image",
            type: "Spacer",
            props: { height: 24 },
            style: {},
          },
          {
            id: "cmp_hero_image",
            type: "Image",
            props: {
              src: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200",
              alt: "Cincinnati skyline at dusk",
              fit: "cover",
            },
            // Style feature #4: borderRadius + shadow preset.
            style: {
              width: "100%",
              height: "320px",
              borderRadius: 12,
              shadow: "lg",
            },
          },
          {
            id: "cmp_spacer_below_image",
            type: "Spacer",
            props: { height: 32 },
            style: {},
          },
          {
            id: "cmp_section_divider",
            type: "Divider",
            props: { thickness: 1, color: "rgba(255, 255, 255, 0.4)" },
            style: { margin: { top: 16, bottom: 16 } },
          },
          {
            id: "cmp_about_section",
            type: "Section",
            props: { as: "section" },
            // Style feature #5: solid background, border.
            style: {
              background: { kind: "color", value: "#ffffff" },
              padding: { top: 32, right: 32, bottom: 32, left: 32 },
              border: { width: 1, style: "solid", color: "#e5e7eb" },
              borderRadius: 16,
              shadow: "md",
              textColor: "#111827",
            },
            children: [
              {
                id: "cmp_about_heading",
                type: "Heading",
                props: { text: "About Aurora", level: 2 },
                style: { textColor: "#0f3a5f", margin: { bottom: 12 } },
              },
              {
                id: "cmp_about_paragraph",
                type: "Paragraph",
                props: {
                  text: "Family-owned since 1998, Aurora Property Group offers concierge-style management for property owners and a hassle-free experience for residents.",
                },
                style: { textColor: "#1f2937" },
              },
            ],
          },
        ],
      },
    },
  ],
  forms: [],
};
