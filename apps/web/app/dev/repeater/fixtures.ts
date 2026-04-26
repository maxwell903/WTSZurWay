import type { SiteConfig } from "@/types/site-config";

// Hand-rolled fixture for the /dev/repeater route. Exercises the full
// Sprint-9 pipeline (fetch → filter → connected-input live filter → sort →
// limit → render with row context) without requiring drag-and-drop in the
// real Aurora editor.
//
// The fixture has two Sections:
//
//   Section #1 — a Repeater bound to `units`, sort `currentMarketRent desc`,
//                limit 12. Template = UnitCard with `{{ row.* }}` tokens.
//   Section #2 — an InputField (component id `cmp_q`) and a Repeater
//                connected to it: when the user types into `cmp_q`, the
//                second Repeater filters its units by `unitName contains
//                <input value>`. The same Repeater carries an `emptyState`
//                Paragraph that renders "No units match."

export const SECTION_TOP_REPEATER_ID = "cmp_repeater_top";
export const SECTION_BOTTOM_INPUT_ID = "cmp_q";
export const SECTION_BOTTOM_REPEATER_ID = "cmp_repeater_bottom";

const cardTemplateProps = {
  // Whole-token strings — ComponentRenderer's resolver hook short-circuits
  // these to the underlying typed row value (see DECISIONS.md 2026-04-26).
  heading: "{{ row.unitName }}",
  beds: "{{ row.bedrooms }}",
  baths: "{{ row.bathrooms }}",
  sqft: "{{ row.squareFootage }}",
  rent: "{{ row.currentMarketRent }}",
  imageSrc: "{{ row.primaryImageUrl }}",
  ctaLabel: "View Unit",
  ctaHref: "/units/{{ row.id }}",
};

export const repeaterDevFixture: SiteConfig = {
  meta: {
    siteName: "Sprint 9 Dev Preview",
    siteSlug: "dev-repeater",
  },
  brand: {
    palette: "ocean",
    fontFamily: "Inter",
  },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "" },
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
        props: {},
        style: { padding: { top: 24, right: 24, bottom: 24, left: 24 } },
        children: [
          {
            id: "cmp_section_top",
            type: "Section",
            props: {},
            style: {
              padding: { top: 16, right: 16, bottom: 16, left: 16 },
            },
            children: [
              {
                id: "cmp_h_top",
                type: "Heading",
                props: { text: "Top 12 by rent (sorted desc)", level: 2 },
                style: {},
              },
              {
                id: SECTION_TOP_REPEATER_ID,
                type: "Repeater",
                props: {},
                style: {},
                dataBinding: {
                  source: "units",
                  sort: { field: "currentMarketRent", direction: "desc" },
                  limit: 12,
                },
                children: [
                  {
                    id: "cmp_card_top",
                    type: "UnitCard",
                    props: cardTemplateProps,
                    style: {},
                  },
                ],
              },
            ],
          },
          {
            id: "cmp_section_bottom",
            type: "Section",
            props: {},
            style: {
              padding: { top: 16, right: 16, bottom: 16, left: 16 },
            },
            children: [
              {
                id: "cmp_h_bottom",
                type: "Heading",
                props: { text: "Search units by name", level: 2 },
                style: {},
              },
              {
                id: SECTION_BOTTOM_INPUT_ID,
                type: "InputField",
                props: {
                  name: "q",
                  label: "Search",
                  inputType: "text",
                  placeholder: 'Try "101" or "4B"',
                },
                style: {},
              },
              {
                id: SECTION_BOTTOM_REPEATER_ID,
                type: "Repeater",
                props: {},
                style: {},
                dataBinding: {
                  source: "units",
                  connectedInputs: [
                    {
                      inputId: SECTION_BOTTOM_INPUT_ID,
                      field: "unitName",
                      operator: "contains",
                    },
                  ],
                  emptyState: {
                    id: "cmp_empty_bottom",
                    type: "Paragraph",
                    props: { text: "No units match." },
                    style: {},
                  },
                },
                children: [
                  {
                    id: "cmp_card_bottom",
                    type: "UnitCard",
                    props: cardTemplateProps,
                    style: {},
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
  forms: [],
};
