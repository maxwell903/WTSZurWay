import {
  type SlideshowImage,
  SlideshowImagesEditor,
} from "@/components/editor/edit-panels/controls/SlideshowImagesEditor";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  uploadSiteMedia: vi.fn(),
  uploadLogo: vi.fn(),
  uploadAttachment: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

function Harness({ initial }: { initial: SlideshowImage[] }) {
  const [value, setValue] = useState<SlideshowImage[]>(initial);
  return (
    <SlideshowImagesEditor
      id="slides"
      label="Slides"
      value={value}
      onChange={setValue}
      testId="slides"
      inheritance={{ heading: "Banner heading", ctaLabel: "Banner CTA" }}
    />
  );
}

describe("<SlideshowImagesEditor> — collapsed row UI", () => {
  it("renders one collapsed card per slide with a default heading 'Slide N'", () => {
    render(<Harness initial={[{ src: "" }, { src: "" }]} />);
    expect(screen.getByTestId("slides-0")).toBeTruthy();
    expect(screen.getByTestId("slides-1")).toBeTruthy();
    // Collapsed by default: expanded sub-card not present
    expect(screen.queryByTestId("slides-0-expanded")).toBeNull();
    // Default label is "Slide N"
    expect(screen.getByTestId("slides-0").textContent).toContain("Slide 1");
  });

  it("uses the per-slide heading as the collapsed label when set", () => {
    render(<Harness initial={[{ src: "", heading: "My slide" }]} />);
    expect(screen.getByTestId("slides-0").textContent).toContain("My slide");
  });

  it("clicking the toggle expands the row to reveal the per-slide fields", () => {
    render(<Harness initial={[{ src: "" }]} />);
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    expect(screen.getByTestId("slides-0-expanded")).toBeTruthy();
    expect(screen.getByTestId("slides-0-src-url")).toBeTruthy();
    expect(screen.getByTestId("slides-0-alt")).toBeTruthy();
  });

  it("clicking the toggle again collapses the row", () => {
    render(<Harness initial={[{ src: "" }]} />);
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    expect(screen.queryByTestId("slides-0-expanded")).toBeNull();
  });
});

describe("<SlideshowImagesEditor> — per-slide field writes", () => {
  it("editing the per-slide heading writes through to onChange", () => {
    const onChange = vi.fn();
    render(
      <SlideshowImagesEditor id="s" value={[{ src: "" }]} onChange={onChange} testId="slides" />,
    );
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    fireEvent.change(screen.getByTestId("slides-0-heading"), {
      target: { value: "New heading" },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ heading: "New heading" }),
    ]);
  });

  it("editing the secondary CTA label writes through to onChange", () => {
    const onChange = vi.fn();
    render(
      <SlideshowImagesEditor id="s" value={[{ src: "" }]} onChange={onChange} testId="slides" />,
    );
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    fireEvent.change(screen.getByTestId("slides-0-secondary-cta-label"), {
      target: { value: "Learn more" },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ secondaryCtaLabel: "Learn more" }),
    ]);
  });

  it("toggling the kind to 'video' writes kind='video'", () => {
    const onChange = vi.fn();
    render(
      <SlideshowImagesEditor id="s" value={[{ src: "" }]} onChange={onChange} testId="slides" />,
    );
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    fireEvent.click(screen.getByTestId("slides-0-kind-video"));
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: "video" })]);
  });

  it("expanded video row shows video-src + poster fields (not image alt)", () => {
    render(<Harness initial={[{ src: "", kind: "video" }]} />);
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    expect(screen.getByTestId("slides-0-video-src")).toBeTruthy();
    expect(screen.getByTestId("slides-0-video-poster")).toBeTruthy();
    expect(screen.queryByTestId("slides-0-alt")).toBeNull();
  });
});

describe("<SlideshowImagesEditor> — inheritance placeholders", () => {
  it("per-slide heading shows the banner heading in its placeholder", () => {
    render(<Harness initial={[{ src: "" }]} />);
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    const headingInput = screen.getByTestId("slides-0-heading") as HTMLInputElement;
    expect(headingInput.placeholder).toContain("Banner heading");
  });

  it("falls back to '(inherits banner)' when the banner-level value is empty", () => {
    const { container } = render(
      <SlideshowImagesEditor
        id="s"
        value={[{ src: "" }]}
        onChange={vi.fn()}
        testId="slides"
        inheritance={{}}
      />,
    );
    fireEvent.click(screen.getByTestId("slides-0-toggle"));
    const headingInput = container.querySelector(
      "[data-testid='slides-0-heading']",
    ) as HTMLInputElement;
    expect(headingInput.placeholder).toContain("inherits banner");
  });
});

describe("<SlideshowImagesEditor> — add / remove still work", () => {
  it("Add slide appends a blank slide", () => {
    const onChange = vi.fn();
    render(<SlideshowImagesEditor id="s" value={[]} onChange={onChange} testId="slides" />);
    fireEvent.click(screen.getByTestId("slides-add"));
    expect(onChange).toHaveBeenCalledWith([{ src: "", alt: "" }]);
  });

  it("Remove drops the row", () => {
    const onChange = vi.fn();
    render(
      <SlideshowImagesEditor
        id="s"
        value={[{ src: "a" }, { src: "b" }]}
        onChange={onChange}
        testId="slides"
      />,
    );
    fireEvent.click(screen.getByTestId("slides-0-remove"));
    expect(onChange).toHaveBeenCalledWith([{ src: "b" }]);
  });
});
