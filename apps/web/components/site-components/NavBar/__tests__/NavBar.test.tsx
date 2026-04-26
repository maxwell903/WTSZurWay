import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavBar } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_nav", type: "NavBar", props, style: {} };
}

describe("<NavBar>", () => {
  it("renders one <a> per link given a minimal valid node", () => {
    const { container } = render(
      <NavBar
        node={makeNode({
          links: [
            { label: "Home", href: "/" },
            { label: "Units", href: "/units" },
            { label: "Apply", href: "/apply" },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const nav = container.querySelector("nav[data-component-type='NavBar']") as HTMLElement | null;
    expect(nav).not.toBeNull();
    const anchors = nav?.querySelectorAll("a") ?? [];
    expect(anchors.length).toBe(3);
    expect(anchors[0]?.getAttribute("href")).toBe("/");
    expect(anchors[2]?.textContent).toBe("Apply");
  });

  it("applies the supplied cssStyle to its root <nav> element", () => {
    const { container } = render(
      <NavBar node={makeNode({ links: [], sticky: true })} cssStyle={{ background: "#0f0" }} />,
    );
    const nav = container.querySelector("nav[data-component-type='NavBar']") as HTMLElement | null;
    expect(nav?.style.background).toContain("rgb(0, 255, 0)");
    expect(nav?.style.position).toBe("sticky");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <NavBar
        node={makeNode({ links: "many", logoPlacement: "diagonal", sticky: "yes" })}
        cssStyle={{}}
      />,
    );
    const nav = container.querySelector("nav[data-component-type='NavBar']") as HTMLElement | null;
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll("a").length).toBe(0);
    expect(nav?.style.position).toBe("");
  });
});
