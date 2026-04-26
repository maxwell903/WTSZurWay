// Sprint 9 replaces the Sprint-5 shell tests with Sprint-9 behavior tests.
// The Sprint-5 invariants test case (asserting that this file does NOT
// import @/lib/rm-api, @tanstack/react-query, or contain RM-token braces)
// is deliberately deleted per Sprint 9 CLAUDE.md DoD ("planned, in-scope
// removal of a Sprint-5 invariant guard, not a deviation").

import type { ComponentNode } from "@/types/site-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rm-api", () => ({
  getProperties: vi.fn(),
  getUnits: vi.fn(),
  getCompany: vi.fn(),
  getUnitById: vi.fn(),
  getPropertyById: vi.fn(),
}));

import { getCompany, getUnits } from "@/lib/rm-api";
import { Repeater } from "../index";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
}

function withClient(ui: ReactNode, client: QueryClient = makeQueryClient()): ReactNode {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function makeNode(over: Partial<ComponentNode> = {}): ComponentNode {
  return {
    id: "cmp_rep",
    type: "Repeater",
    props: {},
    style: {},
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(getUnits).mockReset();
  vi.mocked(getCompany).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<Repeater> (Sprint 9 behavior)", () => {
  it("renders an empty wrapper when no dataBinding is configured", () => {
    const { container } = render(
      withClient(
        <Repeater node={makeNode()} cssStyle={{}}>
          <div data-template="x">tpl</div>
        </Repeater>,
      ),
    );
    const root = container.querySelector("[data-component-type='Repeater']") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-component-id")).toBe("cmp_rep");
    expect(root?.children.length).toBe(0);
  });

  it("preserves the supplied cssStyle on its root wrapper", () => {
    const { container } = render(
      withClient(
        <Repeater node={makeNode()} cssStyle={{ padding: "16px" }}>
          <div>x</div>
        </Repeater>,
      ),
    );
    const root = container.querySelector("[data-component-type='Repeater']") as HTMLElement | null;
    expect(root?.style.padding).toBe("16px");
  });

  it("renders an aria-hidden skeleton with three placeholders during the first load", async () => {
    let resolveUnits: (value: unknown) => void = () => {};
    vi.mocked(getUnits).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUnits = resolve;
      }),
    );
    const { container } = render(
      withClient(
        <Repeater node={makeNode({ dataBinding: { source: "units" } })} cssStyle={{}}>
          <div data-template="row" />
        </Repeater>,
      ),
    );
    const skeletons = container.querySelectorAll("[data-repeater-skeleton='true']");
    expect(skeletons.length).toBe(3);
    const skeletonHost = skeletons[0]?.parentElement;
    expect(skeletonHost?.getAttribute("aria-hidden")).toBe("true");
    resolveUnits([]);
  });

  it("iterates exactly once when source is `company`", async () => {
    vi.mocked(getCompany).mockResolvedValue({
      id: 1,
      name: "Aurora",
      legalName: null,
      primaryPhone: null,
      email: null,
      street: null,
      city: null,
      state: null,
      postalCode: null,
      logoUrl: null,
    });
    render(
      withClient(
        <Repeater node={makeNode({ dataBinding: { source: "company" } })} cssStyle={{}}>
          <div data-testid="iteration">tpl</div>
        </Repeater>,
      ),
    );
    await waitFor(() => {
      expect(screen.getAllByTestId("iteration")).toHaveLength(1);
    });
  });

  it("renders the configured emptyState when the post-pipeline result is empty", async () => {
    vi.mocked(getUnits).mockResolvedValue([]);
    const emptyState: ComponentNode = {
      id: "cmp_empty",
      type: "Paragraph",
      props: { text: "No units match." },
      style: {},
    };
    render(
      withClient(
        <Repeater node={makeNode({ dataBinding: { source: "units", emptyState } })} cssStyle={{}}>
          <div data-testid="iteration">tpl</div>
        </Repeater>,
      ),
    );
    await waitFor(() => {
      expect(screen.getByText("No units match.")).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId("iteration")).toHaveLength(0);
  });

  it("renders one iteration per row when bound to a mock list", async () => {
    vi.mocked(getUnits).mockResolvedValue([
      { id: 1, unitName: "A", currentMarketRent: 1000 },
      { id: 2, unitName: "B", currentMarketRent: 1500 },
      { id: 3, unitName: "C", currentMarketRent: 2000 },
    ] as never);
    render(
      withClient(
        <Repeater node={makeNode({ dataBinding: { source: "units" } })} cssStyle={{}}>
          <div data-testid="iteration">tpl</div>
        </Repeater>,
      ),
    );
    await waitFor(() => {
      expect(screen.getAllByTestId("iteration")).toHaveLength(3);
    });
  });

  it("renders an inline error message when the query fails", async () => {
    vi.mocked(getUnits).mockRejectedValue(new Error("boom"));
    render(
      withClient(
        <Repeater node={makeNode({ dataBinding: { source: "units" } })} cssStyle={{}}>
          <div data-testid="iteration">tpl</div>
        </Repeater>,
      ),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Couldn.t load data/);
    });
  });
});
