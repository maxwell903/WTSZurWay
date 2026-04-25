import type { ComponentNode } from "@/types/site-config";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_heading", type: "Heading", props, style: {} };
}

describe("<Heading>", () => {
  it("renders the supplied text inside an <h2> by default", () => {
    render(<Heading node={makeNode({ text: "Hello world" })} cssStyle={{}} />);
    const el = screen.getByRole("heading", { level: 2 });
    expect(el.textContent).toBe("Hello world");
  });

  it("respects the level prop and renders <h1> through <h6>", () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      const { container, unmount } = render(
        <Heading node={makeNode({ text: "T", level })} cssStyle={{}} />,
      );
      expect(container.querySelector(`h${level}`)).not.toBeNull();
      unmount();
    }
  });

  it("falls back to defaults when props are invalid", () => {
    const { container } = render(
      <Heading node={makeNode({ text: 42, level: 7 })} cssStyle={{ color: "rgb(255, 0, 0)" }} />,
    );
    const el = container.querySelector("h2");
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe("");
    expect(el?.style.color).toBe("rgb(255, 0, 0)");
  });
});
