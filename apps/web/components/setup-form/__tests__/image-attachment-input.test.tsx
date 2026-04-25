import {
  type AttachedImage,
  ImageAttachmentInput,
} from "@/components/setup-form/image-attachment-input";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/setup-form/resize-image", () => ({
  resizeImage: vi.fn(async (file: File) => ({
    blob: new Blob([file.name], { type: file.type || "image/png" }),
    url: `blob:fake-${file.name}`,
    name: file.name,
  })),
}));

const toastSpy = vi.fn();
vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
}));

function Harness({ initial = [] as AttachedImage[] }: { initial?: AttachedImage[] }) {
  const [value, setValue] = useState<AttachedImage[]>(initial);
  const ref = useRef<{ openFileDialog: () => void } | null>(null);
  return (
    <div>
      <button
        type="button"
        data-testid="external-trigger"
        onClick={() => ref.current?.openFileDialog()}
      >
        open
      </button>
      <span data-testid="value-count">{value.length}</span>
      <span data-testid="value-names">{value.map((v) => v.name).join(",")}</span>
      <ImageAttachmentInput ref={ref} value={value} onChange={setValue} />
    </div>
  );
}

describe("<ImageAttachmentInput>", () => {
  beforeEach(() => {
    toastSpy.mockReset();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends resized blob entries when files are selected", async () => {
    render(<Harness />);
    const input = screen.getByTestId("image-attachment-file-input") as HTMLInputElement;
    const file1 = new File(["a"], "one.png", { type: "image/png" });
    const file2 = new File(["b"], "two.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file1, file2] } });
    await waitFor(() => {
      expect(screen.getByTestId("value-count")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("value-names")).toHaveTextContent("one.png,two.png");
  });

  it("renders a thumbnail with a remove button per attached image", () => {
    render(
      <Harness
        initial={[
          { name: "a.png", url: "blob:fake-a" },
          { name: "b.png", url: "blob:fake-b" },
        ]}
      />,
    );
    expect(screen.getByTestId("image-attachment-thumbnails")).toBeInTheDocument();
    expect(screen.getByTestId("image-attachment-thumbnail-0")).toBeInTheDocument();
    expect(screen.getByTestId("image-attachment-thumbnail-1")).toBeInTheDocument();
    expect(screen.getByTestId("image-attachment-remove-0")).toBeInTheDocument();
  });

  it("removes an image when × is clicked", async () => {
    render(
      <Harness
        initial={[
          { name: "a.png", url: "blob:fake-a" },
          { name: "b.png", url: "blob:fake-b" },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId("image-attachment-remove-0"));
    await waitFor(() => {
      expect(screen.getByTestId("value-count")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("value-names")).toHaveTextContent("b.png");
  });

  it("caps additions at max=4 and emits a toast when extras are dropped", async () => {
    render(
      <Harness
        initial={[
          { name: "x1.png", url: "blob:x1" },
          { name: "x2.png", url: "blob:x2" },
        ]}
      />,
    );
    const input = screen.getByTestId("image-attachment-file-input") as HTMLInputElement;
    const f1 = new File(["1"], "y1.png", { type: "image/png" });
    const f2 = new File(["2"], "y2.png", { type: "image/png" });
    const f3 = new File(["3"], "y3.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [f1, f2, f3] } });
    await waitFor(() => {
      expect(screen.getByTestId("value-count")).toHaveTextContent("4");
    });
    expect(toastSpy).toHaveBeenCalledWith("Max 4 images");
    expect(screen.getByTestId("value-names")).toHaveTextContent("x1.png,x2.png,y1.png,y2.png");
  });

  it("emits a toast and adds nothing when already at the cap", async () => {
    render(
      <Harness
        initial={[
          { name: "1", url: "blob:1" },
          { name: "2", url: "blob:2" },
          { name: "3", url: "blob:3" },
          { name: "4", url: "blob:4" },
        ]}
      />,
    );
    const input = screen.getByTestId("image-attachment-file-input") as HTMLInputElement;
    const extra = new File(["x"], "extra.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [extra] } });
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith("Max 4 images");
    });
    expect(screen.getByTestId("value-count")).toHaveTextContent("4");
  });

  it("opens the file dialog via the imperative handle", () => {
    render(<Harness />);
    const input = screen.getByTestId("image-attachment-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId("external-trigger"));
    expect(clickSpy).toHaveBeenCalled();
  });
});
