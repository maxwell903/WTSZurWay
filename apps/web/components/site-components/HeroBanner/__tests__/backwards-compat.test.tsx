import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBanner } from "../index";
import { heroBannerPropsSchema, overlaySchema, slideSchema } from "../schema";

// Frozen v1 fixture — the literal shape Sprint 12 wrote into site configs
// before the v2 schema landed. Every assertion here is a contract Wave 3
// sprints must NOT break; if a Wave 3 sprint changes one of these markers
// it must replace this fixture deliberately and document the swap in its
// Completion Report.
const v1HeroProps = {
  heading: "Find your home",
  subheading: "Lease today, move in tomorrow.",
  ctaLabel: "Browse",
  ctaHref: "/units",
  backgroundImage: "https://placehold.co/1200x400",
  overlay: true, // v1 boolean
  height: "480px",
  images: [
    { src: "https://placehold.co/1600x600?text=1", alt: "1" },
    { src: "https://placehold.co/1600x600?text=2", alt: "2" },
    { src: "https://placehold.co/1600x600?text=3", alt: "3" },
  ],
  autoplay: false,
  intervalMs: 5000,
  loop: true,
  pauseOnHover: true,
  showDots: true,
  showArrows: true,
};

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_hero_v1", type: "HeroBanner", props, style: {} };
}

describe("HeroBanner v1 → v2 schema coercion", () => {
  it("coerces `overlay: true` → solid overlay {kind:'solid', color:'#000000', opacity:0.45}", () => {
    const parsed = overlaySchema.parse(true);
    expect(parsed).toEqual({ kind: "solid", color: "#000000", opacity: 0.45 });
  });

  it("coerces `overlay` omitted (undefined) → solid overlay (preserves v1 default-true)", () => {
    const parsed = overlaySchema.parse(undefined);
    expect(parsed).toEqual({ kind: "solid", color: "#000000", opacity: 0.45 });
  });

  it("coerces `overlay: false` → undefined (no overlay)", () => {
    const parsed = overlaySchema.parse(false);
    expect(parsed).toBeUndefined();
  });

  it("accepts the v2 discriminated overlay shape unchanged", () => {
    const parsed = overlaySchema.parse({ kind: "solid", color: "#112233", opacity: 0.7 });
    expect(parsed).toEqual({ kind: "solid", color: "#112233", opacity: 0.7 });
  });

  it("coerces a legacy `{src, alt}` slide → `{kind:'image', src, alt}`", () => {
    const parsed = slideSchema.parse({ src: "https://x/1.png", alt: "Hi" });
    expect(parsed).toEqual({ kind: "image", src: "https://x/1.png", alt: "Hi" });
  });

  it("accepts a v2 image slide shape unchanged", () => {
    const parsed = slideSchema.parse({ kind: "image", src: "https://x/2.png", alt: "Hi" });
    expect(parsed).toEqual({ kind: "image", src: "https://x/2.png", alt: "Hi" });
  });

  it("accepts a v2 video slide shape", () => {
    const parsed = slideSchema.parse({
      kind: "video",
      videoSrc: "https://x/clip.mp4",
      videoPoster: "https://x/poster.png",
    });
    expect(parsed).toEqual({
      kind: "video",
      videoSrc: "https://x/clip.mp4",
      videoPoster: "https://x/poster.png",
    });
  });

  it("parses the full v1 fixture cleanly and applies all v2 defaults", () => {
    const parsed = heroBannerPropsSchema.parse(v1HeroProps);
    expect(parsed.heading).toBe("Find your home");
    expect(parsed.layout).toBe("centered");
    expect(parsed.slideTransition).toBe("crossfade");
    expect(parsed.kenBurns).toBe(false);
    expect(parsed.parallax).toBe(false);
    expect(parsed.cursorSpotlight).toBe(false);
    expect(parsed.particles).toBe("none");
    expect(parsed.overlay).toEqual({ kind: "solid", color: "#000000", opacity: 0.45 });
    expect(parsed.images).toHaveLength(3);
    expect(parsed.images[0]).toEqual({
      kind: "image",
      src: "https://placehold.co/1600x600?text=1",
      alt: "1",
    });
  });
});

describe("HeroBanner v1 fixture renders identically post-v2-refactor", () => {
  function getRoot(container: HTMLElement): HTMLElement | null {
    return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
  }

  it("preserves the section root data attributes", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-component-id")).toBe("cmp_hero_v1");
    expect(root?.getAttribute("data-component-type")).toBe("HeroBanner");
    expect(root?.getAttribute("data-slideshow-index")).toBe("0");
    expect(root?.getAttribute("data-hero-layout")).toBe("centered");
  });

  it("renders the overlay div with `data-hero-overlay='true'` when overlay was the v1 boolean true", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-overlay='true']")).not.toBeNull();
  });

  it("renders 3 stacked slides with the active one at opacity 1, others at 0", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    const slides = root?.querySelectorAll("img[data-hero-slide]") ?? [];
    expect(slides.length).toBe(3);
    expect((slides[0] as HTMLImageElement).style.opacity).toBe("1");
    expect((slides[1] as HTMLImageElement).style.opacity).toBe("0");
    expect((slides[2] as HTMLImageElement).style.opacity).toBe("0");
    // First slide is loaded eagerly per v1 contract
    expect((slides[0] as HTMLImageElement).getAttribute("loading")).toBe("eager");
    expect((slides[1] as HTMLImageElement).getAttribute("loading")).toBe("lazy");
  });

  it("renders dots and arrows because v1 fixture has both flags on", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root?.querySelectorAll("[data-hero-dot]").length).toBe(3);
    expect(root?.querySelector("[data-hero-arrow='prev']")).not.toBeNull();
    expect(root?.querySelector("[data-hero-arrow='next']")).not.toBeNull();
  });

  it("renders heading, subheading, and CTA via the shared SlideContent slot", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Find your home");
    expect(root?.querySelector("p")?.textContent).toBe("Lease today, move in tomorrow.");
    const cta = root?.querySelector("a") as HTMLAnchorElement | null;
    expect(cta?.getAttribute("href")).toBe("/units");
    expect(cta?.textContent).toBe("Browse");
  });

  it("preserves the height set in the v1 fixture", () => {
    const { container } = render(<HeroBanner node={makeNode(v1HeroProps)} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root?.style.height).toBe("480px");
  });
});
