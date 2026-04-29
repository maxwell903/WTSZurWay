import { MediaUpload } from "@/components/editor/edit-panels/controls/MediaUpload";
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

describe("<MediaUpload>", () => {
  beforeEach(() => {
    uploadSiteMediaMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an Upload button when value is empty", () => {
    render(
      <MediaUpload
        accept="image/*"
        value=""
        onUploaded={vi.fn()}
        onCleared={vi.fn()}
        testId="upload"
      />,
    );
    expect(screen.getByTestId("upload-upload")).toBeTruthy();
    expect(screen.queryByTestId("upload-preview")).toBeNull();
  });

  it("renders a preview with a Replace control when value is set", () => {
    render(
      <MediaUpload
        accept="image/*"
        value="https://cdn.test/x.png"
        onUploaded={vi.fn()}
        onCleared={vi.fn()}
        testId="upload"
      />,
    );
    const preview = screen.getByTestId("upload-preview");
    expect(preview.querySelector("img")?.getAttribute("src")).toBe("https://cdn.test/x.png");
    expect(screen.getByTestId("upload-clear")).toBeTruthy();
  });

  it("uploads a picked file via uploadSiteMedia and fires onUploaded with the URL", async () => {
    uploadSiteMediaMock.mockResolvedValue({ url: "https://cdn.test/u.png", path: "p" });
    const onUploaded = vi.fn();
    render(
      <MediaUpload
        accept="image/*"
        value=""
        onUploaded={onUploaded}
        onCleared={vi.fn()}
        testId="upload"
      />,
    );

    const file = new File(["x"], "hero.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("upload-file-input"), { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadSiteMediaMock).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith("https://cdn.test/u.png");
    });
  });

  it("clicking Replace fires onCleared", () => {
    const onCleared = vi.fn();
    render(
      <MediaUpload
        accept="image/*"
        value="https://cdn.test/x.png"
        onUploaded={vi.fn()}
        onCleared={onCleared}
        testId="upload"
      />,
    );
    fireEvent.click(screen.getByTestId("upload-clear"));
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it("rejects oversize files: shows inline error, fires toast.error, does not call uploadSiteMedia", async () => {
    const onUploaded = vi.fn();
    render(
      <MediaUpload
        accept="image/*"
        maxSizeMb={1}
        value=""
        onUploaded={onUploaded}
        onCleared={vi.fn()}
        testId="upload"
      />,
    );

    const big = new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("upload-file-input"), { target: { files: [big] } });

    await waitFor(() => {
      expect(screen.getByTestId("upload-size-error")).toBeTruthy();
    });
    expect(toastErrorMock).toHaveBeenCalled();
    expect(uploadSiteMediaMock).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("renders a <video> preview when accept includes video/*", () => {
    render(
      <MediaUpload
        accept="video/*"
        value="https://cdn.test/clip.mp4"
        onUploaded={vi.fn()}
        onCleared={vi.fn()}
        testId="upload"
      />,
    );
    const preview = screen.getByTestId("upload-preview");
    expect(preview.querySelector("video")?.getAttribute("src")).toBe("https://cdn.test/clip.mp4");
    expect(preview.querySelector("img")).toBeNull();
  });
});
