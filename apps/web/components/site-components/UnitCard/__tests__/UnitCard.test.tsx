import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnitCard } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_ucard", type: "UnitCard", props, style: {} };
}

describe("<UnitCard>", () => {
  it("renders heading, stats, formatted rent, and CTA given a minimal valid node", () => {
    const { container } = render(
      <UnitCard
        node={makeNode({
          heading: "Unit 2A",
          beds: 2,
          baths: 1.5,
          sqft: 980,
          rent: 1850,
          imageSrc: "https://placehold.co/600x400",
          ctaLabel: "Apply",
          ctaHref: "/apply/2a",
        })}
        cssStyle={{}}
      />,
    );
    const root = container.querySelector(
      "article[data-component-type='UnitCard']",
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.querySelector("h3")?.textContent).toBe("Unit 2A");
    expect(root?.querySelector("[data-unit-stats='true']")?.textContent).toBe(
      "2 bd · 1.5 ba · 980 sqft",
    );
    expect(root?.querySelector("[data-unit-rent='true']")?.textContent).toBe("$1,850/mo");
    const cta = root?.querySelector("a") as HTMLAnchorElement | null;
    expect(cta?.getAttribute("href")).toBe("/apply/2a");
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <UnitCard node={makeNode({ heading: "X" })} cssStyle={{ marginRight: "12px" }} />,
    );
    const root = container.querySelector(
      "article[data-component-type='UnitCard']",
    ) as HTMLElement | null;
    expect(root?.style.marginRight).toBe("12px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <UnitCard
        node={makeNode({ heading: 5, rent: -1, sqft: "huge", beds: null })}
        cssStyle={{}}
      />,
    );
    const root = container.querySelector(
      "article[data-component-type='UnitCard']",
    ) as HTMLElement | null;
    expect(root?.querySelector("h3")?.textContent).toBe("Unit Name");
    expect(root?.querySelector("[data-unit-rent='true']")?.textContent).toBe("$0/mo");
    expect(root?.querySelector("[data-unit-image-placeholder='true']")).not.toBeNull();
  });
});
