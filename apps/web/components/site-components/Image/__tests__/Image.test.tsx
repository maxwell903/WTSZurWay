import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Image } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_image", type: "Image", props, style: {} };
}

describe("<Image>", () => {
  it("renders a plain <img> with the supplied src and alt", () => {
    const { container } = render(
      <Image
        node={makeNode({ src: "https://example.test/a.png", alt: "Aurora hero" })}
        cssStyle={{}}
      />,
    );
    const el = container.querySelector("img");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("src")).toBe("https://example.test/a.png");
    expect(el?.getAttribute("alt")).toBe("Aurora hero");
  });

  it("applies object-fit from the fit prop", () => {
    const { container } = render(
      <Image node={makeNode({ src: "x.png", alt: "x", fit: "contain" })} cssStyle={{}} />,
    );
    expect(container.querySelector("img")?.style.objectFit).toBe("contain");
  });

  it("defaults fit to 'cover' on missing/invalid props", () => {
    const { container } = render(
      <Image node={makeNode({ src: "x.png", fit: "stretchy" })} cssStyle={{}} />,
    );
    expect(container.querySelector("img")?.style.objectFit).toBe("cover");
  });
});
