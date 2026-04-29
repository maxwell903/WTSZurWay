import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBanner } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_hero_layouts", type: "HeroBanner", props, style: {} };
}

function getRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
}

const oneImage = [{ src: "https://x/1.png", alt: "1" }];

describe("<HeroBanner> — layouts dispatch", () => {
  it("layout='centered' renders the centered layout (default)", () => {
    const { container } = render(<HeroBanner node={makeNode({ heading: "X" })} cssStyle={{}} />);
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("centered");
  });

  it("layout='split-left' renders the split layout with text panel before media", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: "X", layout: "split-left" })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("split-left");
    const text = root?.querySelector("[data-hero-split-pane='text']");
    const media = root?.querySelector("[data-hero-split-pane='media']");
    expect(text).not.toBeNull();
    expect(media).not.toBeNull();
    // CSS `order` is the visual ordering control; assert the text pane is order 1.
    expect((text as HTMLElement).style.order).toBe("1");
    expect((media as HTMLElement).style.order).toBe("2");
  });

  it("layout='split-right' swaps the order: media first, text second", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: "X", layout: "split-right" })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("split-right");
    const text = root?.querySelector("[data-hero-split-pane='text']") as HTMLElement;
    const media = root?.querySelector("[data-hero-split-pane='media']") as HTMLElement;
    expect(text.style.order).toBe("2");
    expect(media.style.order).toBe("1");
  });

  it("layout='full-bleed' renders the full-bleed layout marker", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: "X", layout: "full-bleed" })} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("full-bleed");
    // No split-pane markers in full-bleed.
    expect(root?.querySelector("[data-hero-split-pane]")).toBeNull();
  });

  it("split layouts route slideshow into the media panel (data-slideshow-index lives there, not on the section)", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          layout: "split-left",
          images: oneImage,
          autoplay: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    // Outer section does NOT carry the slideshow index in split layouts...
    expect(root?.getAttribute("data-slideshow-index")).toBeNull();
    // ...but the media pane does.
    const media = root?.querySelector("[data-hero-split-pane='media']");
    expect(media?.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("split layouts render the slide image inside the media pane", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          layout: "split-right",
          images: oneImage,
          autoplay: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    const media = root?.querySelector("[data-hero-split-pane='media']");
    const slide = media?.querySelector("img[data-hero-slide]");
    expect(slide).not.toBeNull();
    expect((slide as HTMLImageElement).getAttribute("src")).toBe("https://x/1.png");
  });

  it("full-bleed renders the slideshow + corner-anchored text panel", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "X",
          layout: "full-bleed",
          images: oneImage,
          autoplay: false,
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-slideshow-index")).toBe("0");
    expect(root?.querySelector("img[data-hero-slide]")).not.toBeNull();
    // The h1 has the corner-positioned style; we just confirm one renders.
    expect(root?.querySelector("h1")?.textContent).toBe("X");
  });
});
