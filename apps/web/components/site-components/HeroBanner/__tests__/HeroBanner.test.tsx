import { RenderModeProvider } from "@/components/renderer/RenderModeContext";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode } from "@/types/site-config";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroBanner } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_hero", type: "HeroBanner", props, style: {} };
}

function getRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
}

function requireRoot(container: HTMLElement): HTMLElement {
  const root = getRoot(container);
  if (!root) throw new Error("HeroBanner root not found");
  return root;
}

describe("<HeroBanner> — backwards-compat (no slideshow images)", () => {
  it("renders heading, subheading, and CTA when all are provided", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Find your home",
          subheading: "Lease today, move in tomorrow.",
          ctaLabel: "Browse",
          ctaHref: "/units",
          backgroundImage: "https://placehold.co/1200x400",
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root).not.toBeNull();
    expect(root?.querySelector("h1")?.textContent).toBe("Find your home");
    expect(root?.querySelector("p")?.textContent).toBe("Lease today, move in tomorrow.");
    const cta = root?.querySelector("a") as HTMLAnchorElement | null;
    expect(cta?.getAttribute("href")).toBe("/units");
    expect(cta?.textContent).toBe("Browse");
    expect(root?.querySelector("[data-hero-overlay='true']")).not.toBeNull();
    expect(root?.querySelector("[data-hero-slide]")).toBeNull();
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({ heading: "Hi", height: "320px" })}
        cssStyle={{ marginTop: "16px" }}
      />,
    );
    const root = getRoot(container);
    expect(root?.style.height).toBe("320px");
    expect(root?.style.marginTop).toBe("16px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: 5, ctaLabel: 42, height: 99 })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Welcome");
    expect(root?.querySelector("a")).toBeNull();
    expect(root?.style.height).toBe("480px");
    // Malformed props short-circuit to FALLBACK_DATA, which has images: [] →
    // backwards-compat path; no slideshow markers.
    expect(root?.querySelector("[data-hero-slide]")).toBeNull();
  });

  it("renders backwards-compat hero when images is explicitly an empty array", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: "Hi", images: [] })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-slide]")).toBeNull();
    expect(root?.getAttribute("data-slideshow-index")).toBeNull();
  });

  it("falls back to backwards-compat when images is non-array (malformed)", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: "Hi", images: "not-an-array" })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-slide]")).toBeNull();
  });
});

describe("<HeroBanner> — slideshow rendering", () => {
  const threeImages = [
    { src: "https://placehold.co/1600x600?text=1", alt: "1" },
    { src: "https://placehold.co/1600x600?text=2", alt: "2" },
    { src: "https://placehold.co/1600x600?text=3", alt: "3" },
  ];

  it("stacks N images and only the active one has opacity 1", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({ heading: "Hi", images: threeImages, autoplay: false })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-slideshow-index")).toBe("0");
    const slides = root?.querySelectorAll("[data-hero-slide]") ?? [];
    expect(slides.length).toBe(3);
    expect((slides[0] as HTMLElement).style.opacity).toBe("1");
    expect((slides[1] as HTMLElement).style.opacity).toBe("0");
    expect((slides[2] as HTMLElement).style.opacity).toBe("0");
  });

  it("first slide is loading=eager, the rest are lazy", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({ heading: "Hi", images: threeImages, autoplay: false })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    const slides = root?.querySelectorAll("img[data-hero-slide]") ?? [];
    expect((slides[0] as HTMLImageElement).getAttribute("loading")).toBe("eager");
    expect((slides[1] as HTMLImageElement).getAttribute("loading")).toBe("lazy");
    expect((slides[2] as HTMLImageElement).getAttribute("loading")).toBe("lazy");
  });

  it("renders dots and arrows according to flags", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          showDots: true,
          showArrows: true,
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelectorAll("[data-hero-dot]").length).toBe(3);
    expect(root?.querySelector("[data-hero-arrow='prev']")).not.toBeNull();
    expect(root?.querySelector("[data-hero-arrow='next']")).not.toBeNull();
  });

  it("hides dots and arrows when their flags are false", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          showDots: false,
          showArrows: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-dot]")).toBeNull();
    expect(root?.querySelector("[data-hero-arrow]")).toBeNull();
  });
});

describe("<HeroBanner> — autoplay behavior", () => {
  const threeImages = [
    { src: "a", alt: "1" },
    { src: "b", alt: "2" },
    { src: "c", alt: "3" },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autoplay advances the index every intervalMs", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: true,
          intervalMs: 1000,
          loop: true,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // loop:true wraps back to 0
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("loop=false clamps at the last slide", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: true,
          intervalMs: 1000,
          loop: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
  });

  it("autoplay=false does not advance the index", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          intervalMs: 1000,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("pauseOnHover=true halts the timer on mouseEnter and resumes on mouseLeave", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: true,
          intervalMs: 1000,
          pauseOnHover: true,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    fireEvent.mouseEnter(root);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
    fireEvent.mouseLeave(root);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
  });

  it("pauseOnHover=false ignores mouseEnter", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: true,
          intervalMs: 1000,
          pauseOnHover: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    fireEvent.mouseEnter(root);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
  });
});

describe("<HeroBanner> — manual navigation", () => {
  const threeImages = [
    { src: "a", alt: "1" },
    { src: "b", alt: "2" },
    { src: "c", alt: "3" },
  ];

  it("clicking a dot jumps to that slide", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          showDots: true,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    const dot2 = root.querySelector("[data-hero-dot='2']") as HTMLButtonElement;
    fireEvent.click(dot2);
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
  });

  it("next arrow advances; prev arrow retreats; loop wraps around", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          showArrows: true,
          loop: true,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    const next = root.querySelector("[data-hero-arrow='next']") as HTMLButtonElement;
    const prev = root.querySelector("[data-hero-arrow='prev']") as HTMLButtonElement;
    fireEvent.click(next);
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
    fireEvent.click(next);
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
    fireEvent.click(next);
    // loop:true wraps to 0
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
    fireEvent.click(prev);
    // loop:true wraps prev from 0 back to 2
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
  });

  it("loop=false disables prev at index 0 and next at last index", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: false,
          showArrows: true,
          loop: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    const prev = root.querySelector("[data-hero-arrow='prev']") as HTMLButtonElement;
    const next = root.querySelector("[data-hero-arrow='next']") as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(root.getAttribute("data-slideshow-index")).toBe("2");
    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(false);
  });
});

describe("<HeroBanner> — prefers-reduced-motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not advance on autoplay when reduce-motion is preferred", () => {
    const threeImages = [
      { src: "a", alt: "1" },
      { src: "b", alt: "2" },
      { src: "c", alt: "3" },
    ];
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hi",
          images: threeImages,
          autoplay: true,
          intervalMs: 1000,
        })}
        cssStyle={{}}
      />,
    );
    const root = requireRoot(container);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });
});

describe("<HeroBanner> — edit-mode pause", () => {
  beforeEach(() => __resetEditorStoreForTests());
  afterEach(() => vi.useRealTimers());

  it("freezes on slide 0 when slideshowPaused is true (edit mode)", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeProvider value="edit">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().toggleSlideshowPaused();
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("freezes when this banner is the selected component (edit mode)", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeProvider value="edit">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().selectComponent("cmp_hero");
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("ignores slideshowPaused in preview mode", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeProvider value="preview">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().toggleSlideshowPaused();
    });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
  });
});
