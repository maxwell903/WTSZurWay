import { SiteConfigProvider } from "@/components/renderer/SiteConfigContext";
import type { SiteConfig } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import { fireEvent, render } from "@testing-library/react";
import type { ReactElement } from "react";
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

// ---------------------------------------------------------------------------
// Sprint 13 — kind: "page" links + page lookup via SiteConfigProvider
// ---------------------------------------------------------------------------

function makeConfigWithPages(
  pages: { slug: string; name: string; kind?: "static" | "detail" }[],
): SiteConfig {
  return {
    meta: { siteName: "Test", siteSlug: "test" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: pages.map((p, i) => ({
      id: `p${i}`,
      slug: p.slug,
      name: p.name,
      kind: p.kind ?? ("static" as const),
      ...(p.kind === "detail" ? { detailDataSource: "units" as const } : {}),
      rootComponent: { id: `r${i}`, type: "Section", props: {}, style: {} },
    })),
    forms: [],
  };
}

function renderWithConfig(node: ReactElement, config: SiteConfig) {
  return render(<SiteConfigProvider config={config}>{node}</SiteConfigProvider>);
}

describe("<NavBar> kind: 'page' links", () => {
  it("renders /<slug> with data-internal-page-slug for kind: page links", () => {
    const config = makeConfigWithPages([
      { slug: "home", name: "Home" },
      { slug: "about", name: "About Us" },
    ]);
    const { container } = renderWithConfig(
      <NavBar
        node={makeNode({
          links: [
            { kind: "page", pageSlug: "home", label: "" },
            { kind: "page", pageSlug: "about", label: "Custom" },
          ],
        })}
        cssStyle={{}}
      />,
      config,
    );
    const anchors = container.querySelectorAll(
      "nav[data-component-type='NavBar'] a",
    ) as NodeListOf<HTMLAnchorElement>;
    expect(anchors.length).toBe(2);
    expect(anchors[0]?.getAttribute("href")).toBe("/home");
    expect(anchors[0]?.getAttribute("data-internal-page-slug")).toBe("home");
    // Empty label falls back to the live page name.
    expect(anchors[0]?.textContent).toBe("Home");
    // Non-empty label overrides the page name.
    expect(anchors[1]?.textContent).toBe("Custom");
    expect(anchors[1]?.getAttribute("data-internal-page-slug")).toBe("about");
  });

  it("silently skips a kind: page link whose pageSlug doesn't match any static page", () => {
    const config = makeConfigWithPages([{ slug: "home", name: "Home" }]);
    const { container } = renderWithConfig(
      <NavBar
        node={makeNode({
          links: [
            { kind: "page", pageSlug: "home", label: "Home" },
            { kind: "page", pageSlug: "missing", label: "Gone" },
          ],
        })}
        cssStyle={{}}
      />,
      config,
    );
    const anchors = container.querySelectorAll("nav[data-component-type='NavBar'] a");
    expect(anchors.length).toBe(1);
    expect(anchors[0]?.getAttribute("href")).toBe("/home");
  });

  it("does NOT mark legacy { label, href } links with data-internal-page-slug", () => {
    const config = makeConfigWithPages([{ slug: "home", name: "Home" }]);
    const { container } = renderWithConfig(
      <NavBar
        node={makeNode({ links: [{ label: "External", href: "https://x.com" }] })}
        cssStyle={{}}
      />,
      config,
    );
    const a = container.querySelector("nav[data-component-type='NavBar'] a") as HTMLElement | null;
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("https://x.com");
    expect(a?.hasAttribute("data-internal-page-slug")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sprint 14 — visual layout knobs (linkGap, logoSize, logoMarginX) + dropdowns
// ---------------------------------------------------------------------------

describe("<NavBar> visual layout props", () => {
  it("applies linkGap to the link list <ul>", () => {
    const { container } = render(
      <NavBar
        node={makeNode({
          links: [
            { label: "A", href: "/a" },
            { label: "B", href: "/b" },
          ],
          linkGap: 40,
        })}
        cssStyle={{}}
      />,
    );
    const ul = container.querySelector("ul[data-navbar-links]") as HTMLElement | null;
    expect(ul).not.toBeNull();
    expect(ul?.style.gap).toBe("40px");
  });

  it("falls back to a 20px gap when linkGap is absent", () => {
    const { container } = render(
      <NavBar node={makeNode({ links: [{ label: "A", href: "/a" }] })} cssStyle={{}} />,
    );
    const ul = container.querySelector("ul[data-navbar-links]") as HTMLElement | null;
    expect(ul?.style.gap).toBe("20px");
  });

  it("applies logoSize as the <img> height and logoMarginX to the wrapper", () => {
    const { container } = render(
      <NavBar
        node={makeNode({
          links: [],
          logoSrc: "https://example.com/logo.png",
          logoSize: 64,
          logoMarginX: 24,
        })}
        cssStyle={{}}
      />,
    );
    const img = container.querySelector("img[data-navbar-logo]") as HTMLImageElement | null;
    expect(img?.style.height).toBe("64px");
    const wrapper = container.querySelector("span[data-navbar-logo-wrapper]") as HTMLElement | null;
    expect(wrapper?.style.marginInline).toBe("24px");
  });

  it("falls back to a 32px logo height when logoSize is absent", () => {
    const { container } = render(
      <NavBar
        node={makeNode({ links: [], logoSrc: "https://example.com/logo.png" })}
        cssStyle={{}}
      />,
    );
    const img = container.querySelector("img[data-navbar-logo]") as HTMLImageElement | null;
    expect(img?.style.height).toBe("32px");
  });
});

describe("<NavBar> dropdown menus", () => {
  it("renders a button (not an anchor) for a link with non-empty children, dropdown closed by default", () => {
    const { container } = render(
      <NavBar
        node={makeNode({
          links: [
            {
              label: "Resources",
              kind: "external",
              href: "#",
              children: [{ label: "Blog", href: "/blog" }],
            },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const trigger = container.querySelector(
      "button[data-navbar-dropdown-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    // Dropdown menu is hidden until opened.
    expect(container.querySelector("ul[data-navbar-dropdown-menu]")).toBeNull();
    // The parent's anchor element is gone — clicks toggle, they don't navigate.
    expect(container.querySelector("a[href='#']")).toBeNull();
  });

  it("opens the submenu on click and renders one menuitem anchor per child", () => {
    const { container } = render(
      <NavBar
        node={makeNode({
          links: [
            {
              label: "Resources",
              kind: "external",
              href: "#",
              children: [
                { label: "Blog", href: "/blog" },
                { label: "Docs", href: "/docs" },
              ],
            },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const trigger = container.querySelector(
      "button[data-navbar-dropdown-trigger]",
    ) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const menu = container.querySelector("ul[data-navbar-dropdown-menu]") as HTMLElement | null;
    expect(menu).not.toBeNull();
    const items = menu?.querySelectorAll("a[role='menuitem']") ?? [];
    expect(items.length).toBe(2);
    expect(items[0]?.getAttribute("href")).toBe("/blog");
    expect(items[1]?.getAttribute("href")).toBe("/docs");
  });

  it("closes the open submenu on a mousedown outside the nav", () => {
    const { container } = render(
      <div>
        <NavBar
          node={makeNode({
            links: [
              {
                label: "Resources",
                kind: "external",
                href: "#",
                children: [{ label: "Blog", href: "/blog" }],
              },
            ],
          })}
          cssStyle={{}}
        />
        <p data-testid="outside">outside</p>
      </div>,
    );
    const trigger = container.querySelector(
      "button[data-navbar-dropdown-trigger]",
    ) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(container.querySelector("ul[data-navbar-dropdown-menu]")).not.toBeNull();
    const outside = container.querySelector("[data-testid='outside']") as HTMLElement;
    fireEvent.mouseDown(outside);
    expect(container.querySelector("ul[data-navbar-dropdown-menu]")).toBeNull();
  });
});
