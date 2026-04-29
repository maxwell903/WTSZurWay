import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBanner } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_hero_sc", type: "HeroBanner", props, style: {} };
}

function getRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
}

describe("SlideContent — per-slide overrides + banner-level fallback", () => {
  it("uses the slide's heading when provided", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Banner heading",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1", heading: "Slide-specific heading" }],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Slide-specific heading");
  });

  it("falls back to the banner heading when the slide's heading is missing", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Banner heading",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1" }],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Banner heading");
  });

  it("renders the secondary CTA when secondaryCtaLabel is set on the slide", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          ctaLabel: "Browse",
          ctaHref: "/units",
          autoplay: false,
          images: [
            {
              src: "https://x/1.png",
              alt: "1",
              secondaryCtaLabel: "Learn more",
              secondaryCtaHref: "/about",
            },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    const primary = root?.querySelector("[data-hero-cta='primary']") as HTMLAnchorElement;
    const secondary = root?.querySelector("[data-hero-cta='secondary']") as HTMLAnchorElement;
    expect(primary).not.toBeNull();
    expect(secondary).not.toBeNull();
    expect(primary.getAttribute("href")).toBe("/units");
    expect(secondary.getAttribute("href")).toBe("/about");
    expect(secondary.textContent).toBe("Learn more");
  });

  it("renders the banner-level secondary CTA when set on the banner (and no slide override)", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          ctaLabel: "Browse",
          secondaryCtaLabel: "Learn more",
          secondaryCtaHref: "/about",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1" }],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-cta='secondary']")).not.toBeNull();
  });

  it("hides the secondary CTA when both slide and banner secondaryCtaLabel are empty", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          ctaLabel: "Browse",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1" }],
        })}
        cssStyle={{}}
      />,
    );
    expect(getRoot(container)?.querySelector("[data-hero-cta='secondary']")).toBeNull();
  });

  it("hides the primary CTA when both slide and banner ctaLabel are empty", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1" }],
        })}
        cssStyle={{}}
      />,
    );
    expect(getRoot(container)?.querySelector("[data-hero-cta='primary']")).toBeNull();
  });
});
