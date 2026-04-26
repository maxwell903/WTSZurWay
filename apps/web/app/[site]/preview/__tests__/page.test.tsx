// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks must be declared before importing the page module.

const notFoundMock = vi.fn(() => {
  // Mirror Next.js' real notFound() which throws to short-circuit rendering.
  const err = new Error("NEXT_NOT_FOUND");
  (err as Error & { digest?: string }).digest = "NEXT_NOT_FOUND";
  throw err;
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({ from: fromMock }),
}));

const RendererMock = vi.fn((props: { page: string }) => (
  <div data-testid="renderer">page={props.page}</div>
));
vi.mock("@/components/renderer", () => ({
  Renderer: (props: { page: string }) => RendererMock(props),
}));

import PreviewPage from "../page";

const VALID_CONFIG = {
  meta: { siteName: "Aurora", siteSlug: "aurora" },
  brand: { palette: "ocean", fontFamily: "Inter" },
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
      rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {} },
    },
  ],
  forms: [],
};

type MaybeSingle = { data: unknown; error: unknown };

function chainSiteLookup(returns: MaybeSingle) {
  // .from("sites").select(cols).eq("slug", slug).maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

function chainVersionByIdLookup(returns: MaybeSingle) {
  // .from("site_versions").select(cols).eq("id", id).eq("site_id", siteId).maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  return { select };
}

function chainWorkingVersionLookup(returns: MaybeSingle) {
  // .from("site_versions").select(cols).eq("site_id", siteId).eq("is_working", true).maybeSingle()
  const maybeSingle = vi.fn(async () => returns);
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  return { select };
}

describe("/[site]/preview page", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    RendererMock.mockClear();
    fromMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls notFound() when the site slug does not exist", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return chainSiteLookup({ data: null, error: null });
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      PreviewPage({
        params: Promise.resolve({ site: "no-such-site" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("calls notFound() when the requested ?v= version does not exist", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") {
        return chainSiteLookup({
          data: { id: "site-uuid-1", slug: "aurora", name: "A" },
          error: null,
        });
      }
      if (table === "site_versions") {
        return chainVersionByIdLookup({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      PreviewPage({
        params: Promise.resolve({ site: "aurora" }),
        searchParams: Promise.resolve({ v: "missing-version" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the Renderer with the parsed config and the requested page slug", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") {
        return chainSiteLookup({
          data: { id: "site-uuid-1", slug: "aurora", name: "A" },
          error: null,
        });
      }
      if (table === "site_versions") {
        // No v= -> working-version path.
        return chainWorkingVersionLookup({
          data: { id: "version-uuid-1", config: VALID_CONFIG },
          error: null,
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const element = await PreviewPage({
      params: Promise.resolve({ site: "aurora" }),
      searchParams: Promise.resolve({ page: "home" }),
    });
    const { getByTestId } = render(element);
    expect(getByTestId("renderer")).toBeInTheDocument();
    expect(RendererMock).toHaveBeenCalledWith(expect.objectContaining({ page: "home" }));
  });

  it("defaults to page=home when no ?page= is provided", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "sites") {
        return chainSiteLookup({
          data: { id: "site-uuid-1", slug: "aurora", name: "A" },
          error: null,
        });
      }
      if (table === "site_versions") {
        return chainWorkingVersionLookup({
          data: { id: "version-uuid-1", config: VALID_CONFIG },
          error: null,
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const element = await PreviewPage({
      params: Promise.resolve({ site: "aurora" }),
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(RendererMock).toHaveBeenCalledWith(expect.objectContaining({ page: "home" }));
  });
});
