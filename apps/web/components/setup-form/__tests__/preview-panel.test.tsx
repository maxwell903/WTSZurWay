import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewPanel } from "../PreviewPanel";

// jsdom does not implement navigator.clipboard or matchMedia. The clipboard
// stub is required by the Copy details button test; the matchMedia stub is
// required because the generating state mounts <LoadingNarration> which
// queries prefers-reduced-motion in a useEffect. The fetch stub is required
// because the generated state now mounts <AdjustmentChat>, which hydrates
// via GET /api/sites/[siteId]/working-version on mount.
const fetchMock = vi.fn(
  async () =>
    new Response(JSON.stringify({ versionId: "v1", config: VALID_CONFIG }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
);

const VALID_CONFIG = {
  meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
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

beforeEach(() => {
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(async () => undefined) },
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<PreviewPanel>", () => {
  it("empty state renders the file icon and §7.3 hint copy", () => {
    render(<PreviewPanel state={{ kind: "empty" }} />);
    expect(screen.getByTestId("preview-panel-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/Fill in your details above to see a live preview of your site\./),
    ).toBeInTheDocument();
    expect(screen.getByTestId("preview-panel-pill")).toHaveTextContent("Pending");
    // No URL slug yet -> placeholder.
    expect(screen.getByTestId("preview-panel-url")).toHaveTextContent("—");
  });

  it("generating state renders the LoadingNarration", () => {
    render(<PreviewPanel state={{ kind: "generating" }} />);
    expect(screen.getByTestId("preview-panel-generating")).toBeInTheDocument();
    expect(screen.getByTestId("loading-narration")).toBeInTheDocument();
    expect(screen.getByTestId("preview-panel-pill")).toHaveTextContent("Pending");
  });

  it("generated state renders the iframe (with cache-buster), the pill, the URL, and mounts AdjustmentChat", () => {
    render(
      <PreviewPanel
        state={{
          kind: "generated",
          previewUrl: "/aurora-cincy/preview?v=v1",
          siteSlug: "aurora-cincy",
          siteId: "s1",
          versionId: "v1",
        }}
      />,
    );
    const iframe = screen.getByTestId("preview-panel-iframe") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    // Sprint 12 cache-buster: the existing ?v=v1 is preserved verbatim and
    // the &t=N query param is appended starting at 0.
    expect(iframe.getAttribute("src")).toBe("/aurora-cincy/preview?v=v1&t=0");
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
    expect(screen.getByTestId("preview-panel-pill")).toHaveTextContent("Live");
    expect(screen.getByTestId("preview-panel-url")).toHaveTextContent(
      "https://www.aurora-cincy.com",
    );
    expect(screen.getByTestId("adjustment-chat")).toBeInTheDocument();
  });

  it("error state shows the auth_error copy and a Copy details button (no Retry)", () => {
    render(
      <PreviewPanel
        state={{
          kind: "error",
          error: { kind: "auth_error", message: "Bad key" },
        }}
      />,
    );
    expect(screen.getByTestId("preview-panel-error-copy")).toHaveTextContent(/Service unavailable/);
    expect(screen.queryByTestId("preview-panel-retry")).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-panel-copy-details")).toBeInTheDocument();
  });

  it("error state shows Retry for network_error / timeout / over_quota when onRetry is provided", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <PreviewPanel
        state={{ kind: "error", error: { kind: "network_error", message: "ECONN" } }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId("preview-panel-retry")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("preview-panel-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewPanel
        state={{ kind: "error", error: { kind: "timeout", message: "slow" } }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId("preview-panel-retry")).toBeInTheDocument();

    rerender(
      <PreviewPanel
        state={{ kind: "error", error: { kind: "over_quota", message: "rate" } }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId("preview-panel-retry")).toBeInTheDocument();
  });

  it("Copy details button copies the formatErrorReport blob to the clipboard", () => {
    render(
      <PreviewPanel
        state={{
          kind: "error",
          error: { kind: "auth_error", message: "Invalid API key", details: "{}" },
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("preview-panel-copy-details"));
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(written);
    expect(parsed.kind).toBe("auth_error");
    expect(parsed.message).toBe("Invalid API key");
  });

  it("error state for invalid_output shows non-retryable copy", () => {
    render(
      <PreviewPanel
        state={{
          kind: "error",
          error: { kind: "invalid_output", message: "bad json" },
        }}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("preview-panel-retry")).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-panel-error-copy")).toHaveTextContent(/couldn't parse/);
  });

  // ----- Sprint 14 DoD-16(f) -----

  it("Sprint 14: renders the [fixture] badge when aiSource is fixture and NODE_ENV is test", () => {
    vi.stubEnv("NODE_ENV", "test");
    render(
      <PreviewPanel
        state={{
          kind: "generated",
          previewUrl: "/aurora-cincy/preview?v=v1",
          siteSlug: "aurora-cincy",
          siteId: "s1",
          versionId: "v1",
          aiSource: "fixture",
        }}
      />,
    );
    expect(screen.getByTestId("preview-panel-ai-source")).toHaveTextContent("[fixture]");
    vi.unstubAllEnvs();
  });

  it("Sprint 14: does NOT render the badge when aiSource is undefined", () => {
    vi.stubEnv("NODE_ENV", "test");
    render(
      <PreviewPanel
        state={{
          kind: "generated",
          previewUrl: "/aurora-cincy/preview?v=v1",
          siteSlug: "aurora-cincy",
          siteId: "s1",
          versionId: "v1",
        }}
      />,
    );
    expect(screen.queryByTestId("preview-panel-ai-source")).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("Sprint 14: does NOT render the badge when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(
      <PreviewPanel
        state={{
          kind: "generated",
          previewUrl: "/aurora-cincy/preview?v=v1",
          siteSlug: "aurora-cincy",
          siteId: "s1",
          versionId: "v1",
          aiSource: "fixture",
        }}
      />,
    );
    expect(screen.queryByTestId("preview-panel-ai-source")).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
