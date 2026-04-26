import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_logo", type: "Logo", props, style: {} };
}

describe("<Logo>", () => {
  it("renders an <img> when source=custom and customUrl is set", () => {
    const { container } = render(
      <Logo
        node={makeNode({
          source: "custom",
          customUrl: "https://placehold.co/120x40",
          alt: "Acme",
          height: 40,
        })}
        cssStyle={{}}
      />,
    );
    const img = container.querySelector(
      "img[data-component-type='Logo']",
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://placehold.co/120x40");
    expect(img?.getAttribute("alt")).toBe("Acme");
    expect(img?.style.height).toBe("40px");
  });

  it("renders the placeholder for source=primary and applies cssStyle to its root", () => {
    const { container } = render(
      <Logo node={makeNode({ source: "primary", height: 24 })} cssStyle={{ marginRight: "8px" }} />,
    );
    const ph = container.querySelector(
      "[data-component-type='Logo'][data-logo-placeholder='true']",
    ) as HTMLElement | null;
    expect(ph).not.toBeNull();
    expect(ph?.textContent).toBe("Logo");
    expect(ph?.style.height).toBe("24px");
    expect(ph?.style.marginRight).toBe("8px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <Logo node={makeNode({ source: "rainbow", height: "tall", alt: 5 })} cssStyle={{}} />,
    );
    const ph = container.querySelector(
      "[data-component-type='Logo'][data-logo-placeholder='true']",
    ) as HTMLElement | null;
    expect(ph).not.toBeNull();
    expect(ph?.style.height).toBe("32px");
  });
});
