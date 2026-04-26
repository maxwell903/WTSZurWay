import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PropertyCard } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_pcard", type: "PropertyCard", props, style: {} };
}

describe("<PropertyCard>", () => {
  it("renders heading, body, image, and CTA given a minimal valid node", () => {
    const { container } = render(
      <PropertyCard
        node={makeNode({
          heading: "Maple Heights",
          body: "Garden-style 2 BR.",
          imageSrc: "https://placehold.co/600x400",
          ctaLabel: "Tour it",
          ctaHref: "/p/maple",
        })}
        cssStyle={{}}
      />,
    );
    const root = container.querySelector(
      "article[data-component-type='PropertyCard']",
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.querySelector("h3")?.textContent).toBe("Maple Heights");
    expect(root?.querySelector("p")?.textContent).toBe("Garden-style 2 BR.");
    expect(root?.querySelector("img")?.getAttribute("src")).toBe("https://placehold.co/600x400");
    const cta = root?.querySelector("a") as HTMLAnchorElement | null;
    expect(cta?.getAttribute("href")).toBe("/p/maple");
    expect(cta?.textContent).toBe("Tour it");
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <PropertyCard node={makeNode({ heading: "X" })} cssStyle={{ marginTop: "20px" }} />,
    );
    const root = container.querySelector(
      "article[data-component-type='PropertyCard']",
    ) as HTMLElement | null;
    expect(root?.style.marginTop).toBe("20px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <PropertyCard
        node={makeNode({ heading: 5, imageSrc: 12, propertyId: "abc" })}
        cssStyle={{}}
      />,
    );
    const root = container.querySelector(
      "article[data-component-type='PropertyCard']",
    ) as HTMLElement | null;
    expect(root?.querySelector("h3")?.textContent).toBe("Property Name");
    expect(root?.querySelector("[data-property-image-placeholder='true']")).not.toBeNull();
  });
});
