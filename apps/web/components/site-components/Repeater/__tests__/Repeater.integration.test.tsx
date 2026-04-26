// Sprint 9 integration test: a handcrafted SiteConfig containing a Repeater
// of units with a UnitCard template. Mocks `lib/rm-api/getUnits` to return
// a fixed list and asserts the full fetch → filter → sort → limit → render
// pipeline plus the whole-token passthrough that lets numeric tokens
// (`{{ row.bedrooms }}`, `{{ row.currentMarketRent }}`) reach UnitCard's
// numeric props (per the 2026-04-26 DECISIONS.md entry).

import { Renderer } from "@/components/renderer/Renderer";
import type { ComponentNode, SiteConfig } from "@/types/site-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rm-api", () => ({
  getProperties: vi.fn(async () => []),
  getUnits: vi.fn(),
  getCompany: vi.fn(),
  getUnitById: vi.fn(),
  getPropertyById: vi.fn(),
}));

import { getUnits } from "@/lib/rm-api";
import type { Unit } from "@/types/rm";

const fixtureUnits: Unit[] = [
  {
    id: 101,
    propertyId: 1,
    unitName: "Apt 101",
    squareFootage: 800,
    bedrooms: 1,
    bathrooms: 1,
    currentMarketRent: 1200,
    isAvailable: true,
    availableDate: null,
    primaryImageUrl: "https://example.com/101.jpg",
    description: null,
    amenities: [],
    images: [],
  },
  {
    id: 202,
    propertyId: 1,
    unitName: "Apt 202",
    squareFootage: 1100,
    bedrooms: 2,
    bathrooms: 2,
    currentMarketRent: 1800,
    isAvailable: true,
    availableDate: null,
    primaryImageUrl: "https://example.com/202.jpg",
    description: null,
    amenities: [],
    images: [],
  },
  {
    id: 303,
    propertyId: 1,
    unitName: "Apt 303",
    squareFootage: 1500,
    bedrooms: 3,
    bathrooms: 2,
    currentMarketRent: 2400,
    isAvailable: true,
    availableDate: null,
    primaryImageUrl: "https://example.com/303.jpg",
    description: null,
    amenities: [],
    images: [],
  },
  {
    id: 404,
    propertyId: 1,
    unitName: "Apt 404",
    squareFootage: 700,
    bedrooms: 1,
    bathrooms: 1,
    currentMarketRent: 950,
    isAvailable: true,
    availableDate: null,
    primaryImageUrl: "https://example.com/404.jpg",
    description: null,
    amenities: [],
    images: [],
  },
];

function makeUnitCardTemplate(): ComponentNode {
  return {
    id: "cmp_card",
    type: "UnitCard",
    props: {
      heading: "{{ row.unitName }}",
      beds: "{{ row.bedrooms }}",
      baths: "{{ row.bathrooms }}",
      sqft: "{{ row.squareFootage }}",
      rent: "{{ row.currentMarketRent }}",
      imageSrc: "{{ row.primaryImageUrl }}",
      ctaLabel: "View Unit",
      ctaHref: "/units/{{ row.id }}",
    },
    style: {},
  };
}

function makeConfigWithRepeater(over: {
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}): SiteConfig {
  const repeater: ComponentNode = {
    id: "cmp_rep",
    type: "Repeater",
    props: {},
    style: {},
    children: [makeUnitCardTemplate()],
    dataBinding: {
      source: "units",
      sort: over.sort,
      limit: over.limit,
    },
  };
  const root: ComponentNode = {
    id: "cmp_root",
    type: "Section",
    props: {},
    style: {},
    children: [repeater],
  };
  return {
    meta: { siteName: "T", siteSlug: "t" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [{ id: "p_home", slug: "home", name: "Home", kind: "static", rootComponent: root }],
    forms: [],
  };
}

function withClient(ui: ReactNode): ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(getUnits).mockReset();
  vi.mocked(getUnits).mockResolvedValue(fixtureUnits);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<Repeater> integration (Sprint 9 full pipeline)", () => {
  it("renders one card per fixture unit when no limit/sort is applied", async () => {
    render(withClient(<Renderer config={makeConfigWithRepeater({})} page="home" mode="preview" />));
    await waitFor(() => {
      expect(screen.getAllByText(/^Apt \d+/)).toHaveLength(fixtureUnits.length);
    });
  });

  it("each card's heading reflects its row's unitName", async () => {
    render(withClient(<Renderer config={makeConfigWithRepeater({})} page="home" mode="preview" />));
    await waitFor(() => {
      expect(screen.getByText("Apt 101")).toBeInTheDocument();
      expect(screen.getByText("Apt 202")).toBeInTheDocument();
      expect(screen.getByText("Apt 303")).toBeInTheDocument();
      expect(screen.getByText("Apt 404")).toBeInTheDocument();
    });
  });

  it("each card's rent text reflects the row's currentMarketRent via the money formatter", async () => {
    const { container } = render(
      withClient(<Renderer config={makeConfigWithRepeater({})} page="home" mode="preview" />),
    );
    await waitFor(() => {
      expect(screen.getByText(/Apt 101/)).toBeInTheDocument();
    });
    const rents = Array.from(container.querySelectorAll("[data-unit-rent='true']")).map(
      (el) => el.textContent,
    );
    // The whole-token passthrough means UnitCard receives numeric rent and
    // formats it via its own UnitCard money formatter ($X,XXX/mo).
    expect(rents).toContain("$1,200/mo");
    expect(rents).toContain("$1,800/mo");
    expect(rents).toContain("$2,400/mo");
    expect(rents).toContain("$950/mo");
  });

  it("each card's image src reflects the row's primaryImageUrl", async () => {
    const { container } = render(
      withClient(<Renderer config={makeConfigWithRepeater({})} page="home" mode="preview" />),
    );
    await waitFor(() => {
      expect(screen.getByText(/Apt 101/)).toBeInTheDocument();
    });
    const imgs = Array.from(container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src"),
    );
    expect(imgs).toContain("https://example.com/101.jpg");
    expect(imgs).toContain("https://example.com/202.jpg");
    expect(imgs).toContain("https://example.com/303.jpg");
    expect(imgs).toContain("https://example.com/404.jpg");
  });

  it("applies the configured sort (currentMarketRent desc → highest rent first)", async () => {
    render(
      withClient(
        <Renderer
          config={makeConfigWithRepeater({
            sort: { field: "currentMarketRent", direction: "desc" },
          })}
          page="home"
          mode="preview"
        />,
      ),
    );
    await waitFor(() => {
      expect(screen.getByText("Apt 303")).toBeInTheDocument();
    });
    const headings = Array.from(document.querySelectorAll("h3")).map((el) => el.textContent);
    // Filter only the unit-card headings (drop layout headings if any).
    const aptHeadings = headings.filter((h) => h?.startsWith("Apt"));
    expect(aptHeadings).toEqual(["Apt 303", "Apt 202", "Apt 101", "Apt 404"]);
  });

  it("applies the configured limit (caps to N rows)", async () => {
    render(
      withClient(
        <Renderer
          config={makeConfigWithRepeater({
            sort: { field: "currentMarketRent", direction: "desc" },
            limit: 2,
          })}
          page="home"
          mode="preview"
        />,
      ),
    );
    await waitFor(() => {
      expect(screen.getByText("Apt 303")).toBeInTheDocument();
    });
    const aptHeadings = Array.from(document.querySelectorAll("h3"))
      .map((el) => el.textContent)
      .filter((h): h is string => Boolean(h?.startsWith("Apt")));
    expect(aptHeadings).toEqual(["Apt 303", "Apt 202"]);
  });

  it("renders a numeric stats line per row (beds / baths / sqft passthrough)", async () => {
    const { container } = render(
      withClient(<Renderer config={makeConfigWithRepeater({})} page="home" mode="preview" />),
    );
    await waitFor(() => {
      expect(screen.getByText(/Apt 101/)).toBeInTheDocument();
    });
    const stats = Array.from(container.querySelectorAll("[data-unit-stats='true']")).map(
      (el) => el.textContent,
    );
    // Apt 303 has bedrooms=3, bathrooms=2, squareFootage=1500.
    expect(stats).toContain("3 bd · 2 ba · 1500 sqft");
  });
});
