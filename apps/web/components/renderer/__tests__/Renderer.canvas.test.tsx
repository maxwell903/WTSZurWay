import { Renderer } from "@/components/renderer/Renderer";
import { CANVAS_DEFAULTS } from "@/lib/site-config/canvas";
import type { ComponentNode, SiteConfig } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function navBarNode(id: string): ComponentNode {
  return {
    id,
    type: "NavBar",
    props: { links: [], logoPlacement: "left", sticky: false },
    style: {},
  };
}

function footerNode(id: string): ComponentNode {
  return {
    id,
    type: "Footer",
    props: { columns: [], copyright: "" },
    style: {},
  };
}

function headingNode(id: string, text: string): ComponentNode {
  return {
    id,
    type: "Heading",
    props: { text, level: 1 },
    style: {},
  };
}

function makeConfig(
  children: ComponentNode[],
  canvas?: SiteConfig["global"]["canvas"],
): SiteConfig {
  return {
    meta: { siteName: "T", siteSlug: "t" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
      ...(canvas ? { canvas } : {}),
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children },
      },
    ],
    forms: [],
  };
}

describe("Renderer canvas wrapping", () => {
  it("wraps the rendered tree in a [data-canvas] container with default styles", () => {
    const config = makeConfig([headingNode("h", "Hello")]);
    const { container } = render(<Renderer config={config} page="home" mode="preview" />);
    const canvases = container.querySelectorAll("[data-canvas]");
    expect(canvases.length).toBe(1);
    const canvas = canvases[0] as HTMLElement;
    expect(canvas.style.maxWidth).toBe(`${CANVAS_DEFAULTS.maxWidth}px`);
    expect(canvas.style.marginInline).toBe("auto");
    // Default vertical padding is set as a single paddingBlock string.
    expect(canvas.style.paddingBlock).toContain(`${CANVAS_DEFAULTS.verticalPadding.top}px`);
  });

  it("contains the entire page tree (root Section, NavBar, Footer) inside [data-canvas] — DOM is unchanged, no partitioning", () => {
    const config = makeConfig([navBarNode("nav"), headingNode("h", "Body"), footerNode("foot")]);
    const { container } = render(<Renderer config={config} page="home" mode="preview" />);
    const canvas = container.querySelector("[data-canvas]");
    expect(canvas).not.toBeNull();
    // All three component types live inside the canvas in the DOM. NavBar
    // and Footer are constrained to canvas max-width along with everything
    // else — the canvas is purely additive, not partitioning.
    expect(canvas?.querySelector('[data-component-type="NavBar"]')).not.toBeNull();
    expect(canvas?.querySelector('[data-component-type="Footer"]')).not.toBeNull();
    // The root Section is rendered through ComponentRenderer normally — its
    // data-component-id and data-component-type land on the actual <section>.
    expect(canvas?.querySelector('[data-component-id="cmp_root"]')).not.toBeNull();
  });

  it("preserves EditModeWrapper around the root Section in edit mode", () => {
    const config = makeConfig([navBarNode("nav"), headingNode("h", "Body"), footerNode("foot")]);
    const { container } = render(<Renderer config={config} page="home" mode="edit" />);
    // The root + NavBar + Heading + Footer all get [data-edit-id] wrappers.
    expect(container.querySelector("[data-edit-id='cmp_root']")).not.toBeNull();
    expect(container.querySelector("[data-edit-id='nav']")).not.toBeNull();
    expect(container.querySelector("[data-edit-id='foot']")).not.toBeNull();
  });

  it("applies user canvas overrides (maxWidth, sidePadding, borderRadius)", () => {
    const config = makeConfig([headingNode("h", "Body")], {
      maxWidth: 800,
      sidePadding: 40,
      borderRadius: 12,
    });
    const { container } = render(<Renderer config={config} page="home" mode="preview" />);
    const canvas = container.querySelector("[data-canvas]") as HTMLElement | null;
    expect(canvas).not.toBeNull();
    expect(canvas?.style.maxWidth).toBe("800px");
    expect(canvas?.style.paddingInline).toBe("40px");
    expect(canvas?.style.borderRadius).toBe("12px");
  });

  it("renders with empty pages (no children) without crashing", () => {
    const config = makeConfig([]);
    const { container } = render(<Renderer config={config} page="home" mode="preview" />);
    expect(container.querySelector("[data-canvas]")).not.toBeNull();
  });
});
