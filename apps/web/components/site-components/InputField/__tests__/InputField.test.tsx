import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InputField } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_input", type: "InputField", props, style: {} };
}

describe("<InputField>", () => {
  it("renders a labeled <input> by default given a minimal valid node", () => {
    const { container } = render(
      <InputField
        node={makeNode({ name: "email", label: "Email", inputType: "email" })}
        cssStyle={{}}
      />,
    );
    const wrapper = container.querySelector(
      "[data-component-type='InputField']",
    ) as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("data-input-name")).toBe("email");
    expect(wrapper?.querySelector("label")?.textContent).toContain("Email");
    const input = wrapper?.querySelector("input") as HTMLInputElement | null;
    expect(input?.getAttribute("type")).toBe("email");
    expect(input?.getAttribute("name")).toBe("email");
  });

  it("applies the supplied cssStyle to its root wrapper", () => {
    const { container } = render(
      <InputField
        node={makeNode({ name: "topic", inputType: "textarea" })}
        cssStyle={{ marginBottom: "16px" }}
      />,
    );
    const wrapper = container.querySelector(
      "[data-component-type='InputField']",
    ) as HTMLElement | null;
    expect(wrapper?.style.marginBottom).toBe("16px");
    expect(wrapper?.querySelector("textarea")).not.toBeNull();
  });

  it("falls back to defaults when given malformed props (missing name, unknown inputType)", () => {
    const { container } = render(
      <InputField node={makeNode({ inputType: "magic", required: "yes" })} cssStyle={{}} />,
    );
    const wrapper = container.querySelector(
      "[data-component-type='InputField']",
    ) as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("input[type='text']")).not.toBeNull();
  });

  it("renders a <select> with options when inputType=select", () => {
    const { container } = render(
      <InputField
        node={makeNode({
          name: "size",
          inputType: "select",
          options: [
            { label: "Small", value: "s" },
            { label: "Large", value: "l" },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    expect(select?.querySelectorAll("option").length).toBe(2);
  });
});
