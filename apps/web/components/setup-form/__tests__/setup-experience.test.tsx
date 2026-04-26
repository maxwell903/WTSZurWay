import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupExperience } from "../SetupExperience";

// Reuse the polyfills the existing setup-form tests rely on; Radix selects
// inside the form sections need them.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
});

vi.mock("@/lib/storage", () => ({
  uploadLogo: vi.fn(),
  uploadAttachment: vi.fn(),
}));
vi.mock("@/lib/setup-form/resize-image", () => ({
  resizeImage: vi.fn(async (file: File) => ({
    blob: new Blob([file.name], { type: file.type || "image/png" }),
    url: `blob:fake-${file.name}`,
    name: file.name,
  })),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
  Toaster: () => null,
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  // SetupExperience transitions through a generating state that mounts
  // <LoadingNarration>, which queries prefers-reduced-motion. jsdom does
  // not implement matchMedia -- stub it so the effect doesn't crash mid
  // render.
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

async function fillRequiredFields() {
  // Type the required Company Name. The Color Scheme palette radio is the
  // other required field; click the "Ocean" card.
  fireEvent.input(screen.getByLabelText(/Company Name/i, { selector: "input" }), {
    target: { value: "Aurora Property Group" },
  });
  // The palette radio group renders palette cards as buttons / inputs with
  // the visible label "Ocean".
  const oceanCard = await screen.findByText(/Ocean/i);
  fireEvent.click(oceanCard);
}

describe("<SetupExperience>", () => {
  it("mounts the SetupForm and the PreviewPanel in the empty state", async () => {
    render(<SetupExperience />);
    expect(screen.getByTestId("setup-form")).toBeInTheDocument();
    expect(screen.getByTestId("preview-panel")).toHaveAttribute("data-panel-state", "empty");
  });

  it("on submit success: transitions empty -> generating -> generated", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        siteId: "s1",
        slug: "aurora-property-group",
        versionId: "v1",
        previewUrl: "/aurora-property-group/preview?v=v1",
      }),
    } as Response);

    render(<SetupExperience />);
    await fillRequiredFields();

    await waitFor(() => {
      const button = screen.getByTestId("setup-form-save");
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("setup-form-save"));

    await waitFor(() => {
      expect(screen.getByTestId("preview-panel")).toHaveAttribute("data-panel-state", "generated");
    });
    const iframe = screen.getByTestId("preview-panel-iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe("/aurora-property-group/preview?v=v1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate-initial-site",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("on submit failure: transitions to the error state with the returned AiError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: { kind: "auth_error", message: "Bad key" },
      }),
    } as Response);

    render(<SetupExperience />);
    await fillRequiredFields();
    await waitFor(() => expect(screen.getByTestId("setup-form-save")).not.toBeDisabled());
    fireEvent.click(screen.getByTestId("setup-form-save"));

    await waitFor(() => {
      expect(screen.getByTestId("preview-panel")).toHaveAttribute("data-panel-state", "error");
    });
    expect(screen.getByTestId("preview-panel-error-copy")).toHaveTextContent(/Service unavailable/);
  });

  it("on a thrown fetch (network outage): transitions to network_error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));

    render(<SetupExperience />);
    await fillRequiredFields();
    await waitFor(() => expect(screen.getByTestId("setup-form-save")).not.toBeDisabled());
    fireEvent.click(screen.getByTestId("setup-form-save"));

    await waitFor(() => {
      expect(screen.getByTestId("preview-panel")).toHaveAttribute("data-panel-state", "error");
    });
    expect(screen.getByTestId("preview-panel-retry")).toBeInTheDocument();
  });
});
