import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapEmbed } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_map", type: "MapEmbed", props, style: {} };
}

describe("<MapEmbed>", () => {
  it("renders an <iframe> targeting Google Maps with the encoded address and zoom", () => {
    const { container } = render(
      <MapEmbed
        node={makeNode({ address: "Cincinnati, OH", zoom: 12, height: "240px" })}
        cssStyle={{}}
      />,
    );
    const iframe = container.querySelector(
      "iframe[data-component-type='MapEmbed']",
    ) as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://maps.google.com/maps?q=Cincinnati%2C%20OH&z=12&output=embed",
    );
    expect(iframe?.style.height).toBe("240px");
  });

  it("applies the supplied cssStyle to its root iframe element", () => {
    const { container } = render(
      <MapEmbed node={makeNode({ address: "New York, NY" })} cssStyle={{ borderRadius: "12px" }} />,
    );
    const iframe = container.querySelector(
      "iframe[data-component-type='MapEmbed']",
    ) as HTMLIFrameElement | null;
    expect(iframe?.style.borderRadius).toBe("12px");
  });

  it("falls back to the default address when given an empty string and to default props for malformed input", () => {
    const { container } = render(
      <MapEmbed node={makeNode({ address: "", zoom: 99, height: 200 })} cssStyle={{}} />,
    );
    const iframe = container.querySelector(
      "iframe[data-component-type='MapEmbed']",
    ) as HTMLIFrameElement | null;
    expect(iframe?.getAttribute("src")).toContain("q=Cincinnati");
    // 99 is out of range, so zoom falls back to 14 default.
    expect(iframe?.getAttribute("src")).toContain("z=14");
    expect(iframe?.style.height).toBe("320px");
  });
});
