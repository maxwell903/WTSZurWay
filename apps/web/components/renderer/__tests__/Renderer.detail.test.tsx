import type { ComponentNode, SiteConfig } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Renderer } from "../Renderer";

// Sprint 9b: detail-page disambiguation + row-context activation.
//
// New sibling test file (rather than appending to Renderer.test.tsx) so the
// Sprint 3 test file stays untouched. The U2 fixture below has a static
// `units` page and a detail `units` page coexisting -- per PROJECT_SPEC.md
// §11 / §8.12 their slugs may collide because slug uniqueness is per-`kind`.
function makeU2Config(): SiteConfig {
  const staticRoot: ComponentNode = {
    id: "cmp_static_root",
    type: "Section",
    props: {},
    style: {},
    children: [
      {
        id: "cmp_listing_heading",
        type: "Heading",
        props: { text: "Units listing", level: 1 },
        style: {},
      },
    ],
  };
  const detailRoot: ComponentNode = {
    id: "cmp_detail_root",
    type: "Section",
    props: {},
    style: {},
    children: [
      {
        id: "cmp_detail_heading",
        type: "Heading",
        props: { text: "{{ row.unitName }}", level: 1 },
        style: {},
      },
    ],
  };
  return {
    meta: { siteName: "T", siteSlug: "t" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p_units_static",
        slug: "units",
        name: "Units",
        kind: "static",
        rootComponent: staticRoot,
      },
      {
        id: "p_units_detail",
        slug: "units",
        name: "Unit Detail",
        kind: "detail",
        detailDataSource: "units",
        rootComponent: detailRoot,
      },
    ],
    forms: [],
  };
}

describe("<Renderer> detail-page disambiguation (Sprint 9b)", () => {
  it("defaults to the STATIC page when pageKind is omitted (U2 disambiguation)", () => {
    const { getByText, queryByText } = render(
      <Renderer config={makeU2Config()} page="units" mode="public" />,
    );
    expect(getByText("Units listing")).toBeInTheDocument();
    expect(queryByText("Apt 101")).toBeNull();
    // The detail-page Heading template stays unrendered, so its raw token
    // string never reaches the DOM.
    expect(queryByText("{{ row.unitName }}")).toBeNull();
  });

  it("defaults to the STATIC page when pageKind is explicitly 'static'", () => {
    const { getByText, queryByText } = render(
      <Renderer config={makeU2Config()} page="units" mode="public" pageKind="static" />,
    );
    expect(getByText("Units listing")).toBeInTheDocument();
    expect(queryByText("Apt 101")).toBeNull();
  });

  it("renders the DETAIL page when pageKind='detail' and resolves {{ row.* }} via the in-scope row", () => {
    const { getByText, queryByText } = render(
      <Renderer
        config={makeU2Config()}
        page="units"
        mode="public"
        pageKind="detail"
        row={{ id: 42, unitName: "Apt 101" }}
      />,
    );
    // The detail-page Heading text resolves through the RowContextProvider
    // wrap that Sprint 9b adds inside <Renderer> -- this is the regression
    // test for the Sprint 9 ComponentRenderer hook firing under a detail
    // wrap (CLAUDE.md "Notes & hints").
    expect(getByText("Apt 101")).toBeInTheDocument();
    expect(queryByText("Units listing")).toBeNull();
  });

  it("renders 'Page not found: {slug}' when no detail page matches under pageKind='detail'", () => {
    const { getByText } = render(
      <Renderer
        config={makeU2Config()}
        page="does-not-exist"
        mode="public"
        pageKind="detail"
        row={{ id: 1 }}
      />,
    );
    expect(getByText("Page not found: does-not-exist")).toBeInTheDocument();
  });
});
