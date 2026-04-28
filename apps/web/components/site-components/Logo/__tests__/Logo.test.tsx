import { BrandProvider } from "@/components/renderer/BrandContext";
import type { SiteConfig } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Logo } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_logo", type: "Logo", props, style: {} };
}

function withBrand(brand: Partial<SiteConfig["brand"]>, ui: ReactNode): ReactNode {
  return (
    <BrandProvider brand={{ palette: "ocean", fontFamily: "Inter", ...brand }}>{ui}</BrandProvider>
  );
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

  it("renders an <img> with brand.primaryLogoUrl when source=primary and brand context provides it", () => {
    const { container } = render(
      withBrand(
        { primaryLogoUrl: "https://cdn.test/primary.png" },
        <Logo node={makeNode({ source: "primary", height: 36 })} cssStyle={{}} />,
      ),
    );
    const img = container.querySelector(
      "img[data-component-type='Logo']",
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://cdn.test/primary.png");
    expect(img?.style.height).toBe("36px");
  });

  it("renders an <img> with brand.secondaryLogoUrl when source=secondary", () => {
    const { container } = render(
      withBrand(
        { secondaryLogoUrl: "https://cdn.test/secondary.svg" },
        <Logo node={makeNode({ source: "secondary" })} cssStyle={{}} />,
      ),
    );
    const img = container.querySelector(
      "img[data-component-type='Logo']",
    ) as HTMLImageElement | null;
    expect(img?.getAttribute("src")).toBe("https://cdn.test/secondary.svg");
  });

  it("renders the placeholder when source=primary but brand has no primaryLogoUrl", () => {
    const { container } = render(
      withBrand({}, <Logo node={makeNode({ source: "primary" })} cssStyle={{}} />),
    );
    const ph = container.querySelector(
      "[data-component-type='Logo'][data-logo-placeholder='true']",
    ) as HTMLElement | null;
    expect(ph).not.toBeNull();
  });
});
