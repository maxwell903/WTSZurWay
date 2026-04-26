import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gallery } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_gallery", type: "Gallery", props, style: {} };
}

describe("<Gallery>", () => {
  it("renders one <img> per image with the configured grid columns", () => {
    const { container } = render(
      <Gallery
        node={makeNode({
          images: [
            { src: "https://placehold.co/600x400?1", alt: "one" },
            { src: "https://placehold.co/600x400?2", alt: "two" },
            { src: "https://placehold.co/600x400?3" },
          ],
          columns: 3,
          gap: 12,
        })}
        cssStyle={{}}
      />,
    );
    const root = container.querySelector("[data-component-type='Gallery']") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll("img").length).toBe(3);
    expect(root?.style.gridTemplateColumns).toBe("repeat(3, 1fr)");
    expect(root?.style.gap).toBe("12px");
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <Gallery
        node={makeNode({
          images: [{ src: "https://placehold.co/600x400" }],
        })}
        cssStyle={{ padding: "16px" }}
      />,
    );
    const root = container.querySelector("[data-component-type='Gallery']") as HTMLElement | null;
    expect(root?.style.padding).toBe("16px");
  });

  it("renders an empty wrapper marked data-empty='true' for empty images and falls back to defaults for malformed input", () => {
    const { container } = render(
      <Gallery node={makeNode({ images: [], columns: "wide", gap: -3 })} cssStyle={{}} />,
    );
    const root = container.querySelector(
      "[data-component-type='Gallery'][data-empty='true']",
    ) as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll("img").length).toBe(0);
  });
});
