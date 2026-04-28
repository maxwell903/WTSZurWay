import { MediaInput } from "@/components/editor/edit-panels/controls/MediaInput";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const uploadSiteMediaMock = vi.fn();
vi.mock("@/lib/storage", () => ({
  uploadSiteMedia: (file: File) => uploadSiteMediaMock(file),
  uploadLogo: vi.fn(),
  uploadAttachment: vi.fn(),
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: vi.fn(),
  }),
}));

describe("<MediaInput>", () => {
  beforeEach(() => {
    uploadSiteMediaMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the URL field with the supplied value and calls onChange when typed into", () => {
    const onChange = vi.fn();
    render(
      <MediaInput
        id="media"
        label="Image"
        value="https://example.test/a.png"
        onChange={onChange}
        testId="media"
      />,
    );
    const url = screen.getByTestId("media-url") as HTMLInputElement;
    expect(url.value).toBe("https://example.test/a.png");
    fireEvent.change(url, { target: { value: "https://example.test/b.png" } });
    expect(onChange).toHaveBeenCalledWith("https://example.test/b.png");
  });

  it("uploads a picked file via uploadSiteMedia and writes the resulting URL via onChange", async () => {
    uploadSiteMediaMock.mockResolvedValue({ url: "https://cdn.test/uploaded.png", path: "p" });
    const onChange = vi.fn();
    render(<MediaInput id="media" value="" onChange={onChange} testId="media" />);

    const file = new File(["x"], "hero.png", { type: "image/png" });
    const fileInput = screen.getByTestId("media-file-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadSiteMediaMock).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("https://cdn.test/uploaded.png");
    });
  });

  it("surfaces a toast when upload fails and does not call onChange", async () => {
    uploadSiteMediaMock.mockRejectedValue(new Error("boom"));
    const onChange = vi.fn();
    render(<MediaInput id="media" value="" onChange={onChange} testId="media" />);

    const file = new File(["x"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("media-file-input"), { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders a preview image when value is non-empty", () => {
    render(
      <MediaInput
        id="media"
        value="https://example.test/preview.png"
        onChange={vi.fn()}
        testId="media"
      />,
    );
    const preview = screen.getByTestId("media-preview");
    const img = preview.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.test/preview.png");
  });

  it("does not render a preview when value is empty", () => {
    render(<MediaInput id="media" value="" onChange={vi.fn()} testId="media" />);
    expect(screen.queryByTestId("media-preview")).toBeNull();
  });
});
