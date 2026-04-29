import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroBanner } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_hero_t", type: "HeroBanner", props, style: {} };
}

function getRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
}

const threeImages = [
  { src: "https://x/1.png", alt: "1" },
  { src: "https://x/2.png", alt: "2" },
  { src: "https://x/3.png", alt: "3" },
];

describe("HeroBanner — slideTransition variants", () => {
  it("'crossfade' (default) keeps all 3 slides stacked with opacity (v1 contract)", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({ heading: "X", images: threeImages, autoplay: false })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    const slides = root?.querySelectorAll("img[data-hero-slide]") ?? [];
    expect(slides.length).toBe(3);
    expect((slides[0] as HTMLImageElement).style.opacity).toBe("1");
    expect((slides[1] as HTMLImageElement).style.opacity).toBe("0");
  });

  it("'slide-left' renders only the active slide wrapped with data-hero-transition='slide-left'", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          images: threeImages,
          autoplay: false,
          slideTransition: "slide-left",
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-transition='slide-left']")).not.toBeNull();
    // Only the active (first) slide is rendered, not all three
    const slides = root?.querySelectorAll("img[data-hero-slide]") ?? [];
    expect(slides.length).toBe(1);
  });

  it("'slide-right' uses data-hero-transition='slide-right'", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          images: threeImages,
          autoplay: false,
          slideTransition: "slide-right",
        })}
        cssStyle={{}}
      />,
    );
    expect(
      getRoot(container)?.querySelector("[data-hero-transition='slide-right']"),
    ).not.toBeNull();
  });

  it("'zoom' uses data-hero-transition='zoom'", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          images: threeImages,
          autoplay: false,
          slideTransition: "zoom",
        })}
        cssStyle={{}}
      />,
    );
    expect(getRoot(container)?.querySelector("[data-hero-transition='zoom']")).not.toBeNull();
  });

  it("'fade-up' uses data-hero-transition='fade-up'", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          images: threeImages,
          autoplay: false,
          slideTransition: "fade-up",
        })}
        cssStyle={{}}
      />,
    );
    expect(getRoot(container)?.querySelector("[data-hero-transition='fade-up']")).not.toBeNull();
  });
});

describe("HeroBanner — slideTransition under prefers-reduced-motion", () => {
  beforeEachStubReducedMotion();

  it("snaps without animation for slide transitions (uses *-snap data attribute)", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          images: threeImages,
          autoplay: false,
          slideTransition: "slide-left",
        })}
        cssStyle={{}}
      />,
    );
    expect(getRoot(container)?.querySelector("[data-hero-transition='slide-snap']")).not.toBeNull();
  });
});

function beforeEachStubReducedMotion() {
  beforeEach(() => {
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
    vi.unstubAllGlobals();
  });
}
