import type { SiteConfig } from "@/types/site-config";

// Hand-rolled fixture for /dev/components. Exercises every Sprint-5 component
// at least once: NavBar (3 links, logoPlacement="left"), HeroBanner (heading +
// subheading + CTA over a background image), Row containing three Columns each
// containing a PropertyCard, Repeater whose template child is a UnitCard,
// Form containing two InputFields and a submit Button, MapEmbed of
// "Cincinnati, OH", Gallery of six placeholder images, Logo source="custom",
// and Footer with two columns.
export const sprint5Fixture: SiteConfig = {
  meta: {
    siteName: "Sprint 5 Component Showcase",
    siteSlug: "sprint-5-showcase",
    description:
      "Dev-only fixture rendering every Sprint-5 component once for visual smoke testing.",
  },
  brand: {
    palette: "ocean",
    fontFamily: "Inter",
  },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "© 2026 Sprint 5 Showcase" },
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
        style: {
          background: { kind: "color", value: "#f9fafb" },
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        children: [
          {
            id: "cmp_navbar",
            type: "NavBar",
            props: {
              links: [
                { label: "Home", href: "/" },
                { label: "Units", href: "/units" },
                { label: "Apply", href: "/apply" },
              ],
              logoPlacement: "left",
              sticky: false,
            },
            style: {
              background: { kind: "color", value: "#ffffff" },
              border: { width: 1, style: "solid", color: "#e5e7eb" },
            },
          },
          {
            id: "cmp_logo",
            type: "Logo",
            props: {
              source: "custom",
              customUrl: "https://placehold.co/160x40?text=Acme",
              alt: "Acme Property",
              height: 40,
            },
            style: { margin: { top: 16, left: 16 } },
          },
          {
            id: "cmp_hero",
            type: "HeroBanner",
            props: {
              heading: "Find your next home in Cincinnati",
              subheading: "Browse fully-furnished units, schedule a tour, and apply online.",
              ctaLabel: "See available units",
              ctaHref: "/units",
              backgroundImage: "https://placehold.co/1600x600?text=Hero+Background",
              overlay: true,
              height: "420px",
            },
            style: {},
          },
          {
            id: "cmp_hero_slideshow",
            type: "HeroBanner",
            props: {
              heading: "Live the city, love the view",
              subheading: "Crossfading slideshow of three featured properties.",
              ctaLabel: "Explore listings",
              ctaHref: "/properties",
              overlay: true,
              height: "420px",
              images: [
                { src: "https://placehold.co/1600x600?text=Slide+1", alt: "Slide 1" },
                { src: "https://placehold.co/1600x600?text=Slide+2", alt: "Slide 2" },
                { src: "https://placehold.co/1600x600?text=Slide+3", alt: "Slide 3" },
              ],
              autoplay: true,
              intervalMs: 4000,
              loop: true,
              pauseOnHover: true,
              showDots: true,
              showArrows: true,
            },
            style: {},
          },
          {
            id: "cmp_property_row",
            type: "Row",
            props: { gap: 16, alignItems: "stretch", justifyContent: "start", wrap: true },
            style: { padding: { top: 32, right: 24, bottom: 16, left: 24 } },
            children: [
              {
                id: "cmp_col_1",
                type: "Column",
                props: { span: 4, gap: 12, alignItems: "stretch" },
                style: {},
                children: [
                  {
                    id: "cmp_pcard_1",
                    type: "PropertyCard",
                    props: {
                      heading: "Maple Heights",
                      body: "Garden-style apartments in Hyde Park.",
                      imageSrc: "https://placehold.co/600x400?text=Maple+Heights",
                      ctaLabel: "View",
                      ctaHref: "/p/maple",
                    },
                    style: {},
                  },
                ],
              },
              {
                id: "cmp_col_2",
                type: "Column",
                props: { span: 4, gap: 12, alignItems: "stretch" },
                style: {},
                children: [
                  {
                    id: "cmp_pcard_2",
                    type: "PropertyCard",
                    props: {
                      heading: "Riverside Lofts",
                      body: "Industrial-chic lofts on the riverfront.",
                      imageSrc: "https://placehold.co/600x400?text=Riverside+Lofts",
                      ctaLabel: "View",
                      ctaHref: "/p/riverside",
                    },
                    style: {},
                  },
                ],
              },
              {
                id: "cmp_col_3",
                type: "Column",
                props: { span: 4, gap: 12, alignItems: "stretch" },
                style: {},
                children: [
                  {
                    id: "cmp_pcard_3",
                    type: "PropertyCard",
                    props: {
                      heading: "Oak Commons",
                      body: "Family-friendly townhomes with private yards.",
                      imageSrc: "https://placehold.co/600x400?text=Oak+Commons",
                      ctaLabel: "View",
                      ctaHref: "/p/oak",
                    },
                    style: {},
                  },
                ],
              },
            ],
          },
          {
            id: "cmp_repeater",
            type: "Repeater",
            props: {},
            style: {
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
            },
            children: [
              {
                id: "cmp_ucard_template",
                type: "UnitCard",
                props: {
                  heading: "Unit 2A",
                  beds: 2,
                  baths: 1,
                  sqft: 900,
                  rent: 1750,
                  imageSrc: "https://placehold.co/600x400?text=Unit+2A",
                  ctaLabel: "View Unit",
                  ctaHref: "/u/2a",
                },
                style: {},
              },
            ],
          },
          {
            id: "cmp_btn_detail",
            type: "Button",
            props: {
              label: "View Unit Detail (Sprint 9b will resolve)",
              linkMode: "detail",
              detailPageSlug: "units",
              variant: "outline",
              size: "md",
            },
            style: { margin: { top: 8, right: 24, bottom: 16, left: 24 } },
          },
          {
            id: "cmp_form",
            type: "Form",
            props: {
              formName: "contact",
              submitLabel: "Send",
              successMessage: "Thanks — we'll be in touch.",
            },
            style: {
              background: { kind: "color", value: "#ffffff" },
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
              margin: { top: 16, right: 24, bottom: 16, left: 24 },
              borderRadius: 12,
              shadow: "sm",
            },
            children: [
              {
                id: "cmp_input_name",
                type: "InputField",
                props: {
                  name: "fullName",
                  label: "Full name",
                  inputType: "text",
                  placeholder: "Jane Doe",
                  required: true,
                },
                style: { margin: { bottom: 12 } },
              },
              {
                id: "cmp_input_email",
                type: "InputField",
                props: {
                  name: "email",
                  label: "Email",
                  inputType: "email",
                  placeholder: "you@example.com",
                  required: true,
                },
                style: { margin: { bottom: 12 } },
              },
              {
                id: "cmp_input_query",
                type: "InputField",
                props: {
                  name: "test_input",
                  label: "Pre-fill via ?test_input=...",
                  inputType: "text",
                  placeholder: "Try /dev/components?test_input=hello",
                  defaultValueFromQueryParam: "test_input",
                },
                style: { margin: { bottom: 12 } },
              },
              {
                id: "cmp_form_submit",
                type: "Button",
                props: {
                  label: "Send",
                  buttonType: "submit",
                  variant: "primary",
                  size: "md",
                },
                style: {},
              },
            ],
          },
          {
            id: "cmp_map",
            type: "MapEmbed",
            props: { address: "Cincinnati, OH", zoom: 12, height: "320px" },
            style: { margin: { top: 16, right: 24, bottom: 16, left: 24 } },
          },
          {
            id: "cmp_gallery",
            type: "Gallery",
            props: {
              columns: 3,
              gap: 8,
              images: [
                { src: "https://placehold.co/600x400?1", alt: "Photo 1" },
                { src: "https://placehold.co/600x400?2", alt: "Photo 2" },
                { src: "https://placehold.co/600x400?3", alt: "Photo 3" },
                { src: "https://placehold.co/600x400?4", alt: "Photo 4" },
                { src: "https://placehold.co/600x400?5", alt: "Photo 5" },
                { src: "https://placehold.co/600x400?6", alt: "Photo 6" },
              ],
            },
            style: { margin: { top: 16, right: 24, bottom: 16, left: 24 } },
          },
          {
            id: "cmp_footer",
            type: "Footer",
            props: {
              columns: [
                {
                  title: "Company",
                  links: [
                    { label: "About", href: "/about" },
                    { label: "Contact", href: "/contact" },
                  ],
                },
                {
                  title: "Legal",
                  links: [
                    { label: "Privacy", href: "/privacy" },
                    { label: "Terms", href: "/terms" },
                  ],
                },
              ],
              copyright: "© 2026 Acme Property",
            },
            style: { margin: { top: 32 } },
          },
        ],
      },
    },
    // Sprint 5b backfill — U2 same-slug coexistence case (PROJECT_SPEC.md §8.12).
    // The static page wins for `/units`; the detail page wins for `/units/{id}`.
    {
      id: "p_units_static",
      slug: "units",
      name: "Units",
      kind: "static",
      rootComponent: {
        id: "cmp_root_units_static",
        type: "Section",
        props: {},
        style: { padding: { top: 32, right: 32, bottom: 32, left: 32 } },
        children: [
          {
            id: "cmp_units_static_heading",
            type: "Heading",
            props: {
              text: "Units listing — Sprint 9 will hydrate this with a Repeater",
              level: 1,
            },
            style: {},
          },
        ],
      },
    },
    {
      id: "p_units_detail",
      slug: "units",
      name: "Units Detail",
      kind: "detail",
      detailDataSource: "units",
      rootComponent: {
        id: "cmp_root_units_detail",
        type: "Section",
        props: {},
        style: { padding: { top: 32, right: 32, bottom: 32, left: 32 } },
        children: [
          {
            id: "cmp_units_detail_heading",
            type: "Heading",
            props: {
              text: "Unit detail template — Sprint 9b will hydrate this with row data",
              level: 1,
            },
            style: {},
          },
        ],
      },
    },
  ],
  forms: [],
};
