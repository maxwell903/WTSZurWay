import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeResizedDimensions, resizeImage } from "../resize-image";

describe("computeResizedDimensions", () => {
  it("returns identity when both dimensions are within the max", () => {
    expect(computeResizedDimensions(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it("returns identity when the long edge equals the max", () => {
    expect(computeResizedDimensions(1568, 900, 1568)).toEqual({ width: 1568, height: 900 });
  });

  it("scales a landscape image so the long edge equals the max", () => {
    expect(computeResizedDimensions(3136, 1568, 1568)).toEqual({ width: 1568, height: 784 });
  });

  it("scales a portrait image so the long edge equals the max", () => {
    expect(computeResizedDimensions(1568, 3136, 1568)).toEqual({ width: 784, height: 1568 });
  });

  it("scales a square image so each side equals the max", () => {
    expect(computeResizedDimensions(2400, 2400, 1568)).toEqual({ width: 1568, height: 1568 });
  });

  it("rounds dimensions to integers", () => {
    const { width, height } = computeResizedDimensions(3000, 1999, 1568);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });
});

describe("resizeImage", () => {
  const createdCanvases: HTMLCanvasElement[] = [];
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    createdCanvases.length = 0;

    class MockFileReader {
      result: string | null = null;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_: Blob) {
        this.result = "data:image/png;base64,abc";
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 3136;
      naturalHeight = 1568;
      width = 3136;
      height = 1568;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage as unknown as typeof Image);

    const fakeContext = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeContext as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
      type?: string,
    ) {
      const blob = new Blob(["fake"], { type: type ?? "image/png" });
      queueMicrotask(() => cb(blob));
    } as never);

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:fake-url"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "canvas") {
        createdCanvases.push(el as HTMLCanvasElement);
      }
      return el;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns blob, url, and name from a File", async () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const result = await resizeImage(file, 1568);
    expect(result.name).toBe("photo.png");
    expect(result.url).toBe("blob:fake-url");
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it("downscales the canvas to the max long edge for a landscape source", async () => {
    const file = new File(["x"], "wide.png", { type: "image/png" });
    await resizeImage(file, 1568);
    const canvas = createdCanvases[0];
    expect(canvas).toBeDefined();
    expect(canvas?.width).toBe(1568);
    expect(canvas?.height).toBe(784);
  });

  it("falls back to image/png when the source file has no MIME type", async () => {
    const file = new File(["x"], "photo", { type: "" });
    const result = await resizeImage(file, 1568);
    expect(result.blob.type).toBe("image/png");
  });
});
