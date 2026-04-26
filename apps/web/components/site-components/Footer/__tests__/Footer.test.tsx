import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_footer", type: "Footer", props, style: {} };
}

describe("<Footer>", () => {
  it("renders one block per column with link lists given a minimal valid node", () => {
    const { container } = render(
      <Footer
        node={makeNode({
          columns: [
            {
              title: "Company",
              links: [
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ],
            },
            {
              title: "Legal",
              links: [{ label: "Privacy", href: "/privacy" }],
            },
          ],
          copyright: "© 2026 Demo",
        })}
        cssStyle={{}}
      />,
    );
    const footer = container.querySelector(
      "footer[data-component-type='Footer']",
    ) as HTMLElement | null;
    expect(footer).not.toBeNull();
    const cols = footer?.querySelectorAll("[data-footer-column='true']") ?? [];
    expect(cols.length).toBe(2);
    expect(cols[0]?.querySelector("h4")?.textContent).toBe("Company");
    expect(footer?.querySelector("[data-footer-copyright='true']")?.textContent).toBe(
      "© 2026 Demo",
    );
  });

  it("applies the supplied cssStyle to its root <footer> element", () => {
    const { container } = render(
      <Footer node={makeNode({ columns: [], copyright: "" })} cssStyle={{ background: "#111" }} />,
    );
    const footer = container.querySelector(
      "footer[data-component-type='Footer']",
    ) as HTMLElement | null;
    expect(footer?.style.background).toContain("rgb(17, 17, 17)");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <Footer node={makeNode({ columns: "many", copyright: 99 })} cssStyle={{}} />,
    );
    const footer = container.querySelector(
      "footer[data-component-type='Footer']",
    ) as HTMLElement | null;
    expect(footer).not.toBeNull();
    expect(footer?.querySelector("[data-footer-column='true']")).toBeNull();
    expect(footer?.querySelector("[data-footer-copyright='true']")).toBeNull();
  });
});
