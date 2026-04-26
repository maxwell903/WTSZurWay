import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTab } from "../DataTab";

const TEST_SITE_ID = "11111111-1111-4111-8111-111111111111";

const fetchMock = vi.fn();

function makeFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "X", siteSlug: "x" },
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
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children: [] },
      },
    ],
    forms: [],
  };
}

beforeEach(() => {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: TEST_SITE_ID,
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(),
  });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataTab", () => {
  it("renders the empty-state copy when the API returns forms=[]", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ forms: [] }), { status: 200 }));
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTestId("data-tab-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("data-tab-empty")).toHaveTextContent(
      /No form submissions yet\. Drop a Form, name it, and publish to start collecting\./,
    );
  });

  it("renders a skeleton row while the request is in flight", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    fetchMock.mockReturnValue(
      new Promise<Response>((r) => {
        resolveFetch = r;
      }),
    );
    render(<DataTab />);
    expect(screen.getByTestId("data-tab-skeleton")).toBeInTheDocument();
    await act(async () => {
      resolveFetch?.(new Response(JSON.stringify({ forms: [] }), { status: 200 }));
    });
  });

  it("renders one row per { formId, count } entry the API returns", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          forms: [
            { formId: "contact_us", count: 3 },
            { formId: "newsletter", count: 1 },
          ],
        }),
        { status: 200 },
      ),
    );
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTestId("data-tab-row-contact_us")).toBeInTheDocument();
    });
    expect(screen.getByTestId("data-tab-row-contact_us")).toHaveTextContent("3 submissions");
    expect(screen.getByTestId("data-tab-row-newsletter")).toHaveTextContent("1 submission");
  });

  it("renders the error state and re-fetches when the user clicks Retry", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTestId("data-tab-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/Couldn't load submissions\. Retry\./)).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ forms: [{ formId: "contact_us", count: 1 }] }), {
        status: 200,
      }),
    );
    fireEvent.click(screen.getByTestId("data-tab-retry"));
    await waitFor(() => {
      expect(screen.getByTestId("data-tab-row-contact_us")).toBeInTheDocument();
    });
  });

  it("opens the SubmissionsModal with the row's formId when the row is clicked", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("formId=")) {
        return new Response(JSON.stringify({ submissions: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ forms: [{ formId: "contact_us", count: 1 }] }), {
        status: 200,
      });
    });
    render(<DataTab />);
    await waitFor(() => {
      expect(screen.getByTestId("data-tab-row-contact_us")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("data-tab-row-contact_us"));
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-title")).toHaveTextContent(
        "Submissions: contact_us",
      );
    });
  });
});
