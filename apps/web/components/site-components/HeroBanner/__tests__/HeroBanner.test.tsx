import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBanner } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_hero", type: "HeroBanner", props, style: {} };
}

describe("<HeroBanner>", () => {
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
    const root = container.querySelector(
      "[data-component-type='HeroBanner']",
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.querySelector("h1")?.textContent).toBe("Find your home");
    expect(root?.querySelector("p")?.textContent).toBe("Lease today, move in tomorrow.");
    const cta = root?.querySelector("a") as HTMLAnchorElement | null;
    expect(cta?.getAttribute("href")).toBe("/units");
    expect(cta?.textContent).toBe("Browse");
    expect(root?.querySelector("[data-hero-overlay='true']")).not.toBeNull();
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({ heading: "Hi", height: "320px" })}
        cssStyle={{ marginTop: "16px" }}
      />,
    );
    const root = container.querySelector(
      "[data-component-type='HeroBanner']",
    ) as HTMLElement | null;
    expect(root?.style.height).toBe("320px");
    expect(root?.style.marginTop).toBe("16px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <HeroBanner node={makeNode({ heading: 5, ctaLabel: 42, height: 99 })} cssStyle={{}} />,
    );
    const root = container.querySelector(
      "[data-component-type='HeroBanner']",
    ) as HTMLElement | null;
    expect(root?.querySelector("h1")?.textContent).toBe("Welcome");
    expect(root?.querySelector("a")).toBeNull();
    expect(root?.style.height).toBe("480px");
  });
});
