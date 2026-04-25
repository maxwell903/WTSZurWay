import { SetupForm } from "@/components/setup-form/setup-form";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Radix UI components used inside <AdvancedSection> rely on DOM APIs that
// jsdom does not implement. Polyfill them once before any test runs.
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

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  }),
}));

vi.mock("@/lib/setup-form/resize-image", () => ({
  resizeImage: vi.fn(async (file: File) => ({
    blob: new Blob([file.name], { type: file.type || "image/png" }),
    url: `blob:fake-${file.name}`,
    name: file.name,
  })),
}));

describe("<SetupForm>", () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all six sections in the spec order", () => {
    render(<SetupForm />);
    // Spec order: General → Company Logo (Brand) → Color Scheme →
    // Template Start → Custom Instructions → Advanced.
    expect(screen.getByText(/^General$/)).toBeInTheDocument();
    expect(screen.getByText(/^Company Logo$/)).toBeInTheDocument();
    expect(screen.getByText(/^Color Scheme/)).toBeInTheDocument();
    expect(screen.getByText(/^Template Start$/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/How would you like me to/)).toBeInTheDocument();
    expect(screen.getByTestId("advanced-trigger")).toBeInTheDocument();
  });

  it("renders the bottom action bar with Required-fields legend, Cancel, Save", () => {
    render(<SetupForm />);
    expect(screen.getByText(/Required fields/)).toBeInTheDocument();
    expect(screen.getByTestId("setup-form-cancel")).toHaveTextContent(/Cancel/);
    const cancel = screen.getByTestId("setup-form-cancel") as HTMLAnchorElement;
    expect(cancel.getAttribute("href")).toBe("/");
    expect(screen.getByTestId("setup-form-save")).toHaveTextContent(/Save/);
  });

  it("disables Save when the schema is invalid (empty companyName, no palette)", async () => {
    render(<SetupForm />);
    await waitFor(() => {
      expect(screen.getByTestId("setup-form-save")).toBeDisabled();
    });
  });

  it("enables Save once required fields (companyName + palette) are set", async () => {
    render(<SetupForm />);

    fireEvent.change(screen.getByPlaceholderText(/Acme Corporation/), {
      target: { value: "Aurora Property Group" },
    });
    fireEvent.click(screen.getByTestId("palette-card-ocean"));

    await waitFor(
      () => {
        expect(screen.getByTestId("setup-form-save")).not.toBeDisabled();
      },
      { timeout: 2000 },
    );
  });

  it("invokes onValid with the validated payload when Save is clicked", async () => {
    const onValid = vi.fn();
    render(<SetupForm onValid={onValid} />);

    fireEvent.change(screen.getByPlaceholderText(/Acme Corporation/), {
      target: { value: "Aurora Property Group" },
    });
    fireEvent.click(screen.getByTestId("palette-card-ocean"));

    const save = screen.getByTestId("setup-form-save");
    await waitFor(() => {
      expect(save).not.toBeDisabled();
    });

    fireEvent.click(save);

    await waitFor(() => {
      expect(onValid).toHaveBeenCalledTimes(1);
    });
    const payload = onValid.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      companyName: "Aurora Property Group",
      palette: "ocean",
      templateStart: "ai_generate",
    });
  });

  it("logs the payload and toasts when Save is clicked without an onValid override", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    render(<SetupForm />);
    fireEvent.change(screen.getByPlaceholderText(/Acme Corporation/), {
      target: { value: "Aurora Property Group" },
    });
    fireEvent.click(screen.getByTestId("palette-card-ocean"));

    const save = screen.getByTestId("setup-form-save");
    await waitFor(() => {
      expect(save).not.toBeDisabled();
    });
    fireEvent.click(save);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
    expect(toastSuccessMock.mock.calls[0]?.[0]).toMatch(/Sprint 4 will wire the API/);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[setup-form] valid payload",
      expect.objectContaining({ companyName: "Aurora Property Group", palette: "ocean" }),
    );
  });
});
