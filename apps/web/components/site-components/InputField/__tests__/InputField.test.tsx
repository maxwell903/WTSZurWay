import type { ComponentNode } from "@/types/site-config";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InputField } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_input", type: "InputField", props, style: {} };
}

const ORIGINAL_URL = "/";

function setQuery(query: string) {
  window.history.pushState({}, "", query);
}

afterEach(() => {
  window.history.pushState({}, "", ORIGINAL_URL);
});

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

  // Sprint 5b backfill — PROJECT_SPEC.md §8.12 query-param hydration.

  it("hydrates from the URL when defaultValueFromQueryParam matches a query param", async () => {
    setQuery("/?propertyId=4");
    const { findByDisplayValue } = render(
      <InputField
        node={makeNode({
          name: "propertyId",
          inputType: "text",
          defaultValueFromQueryParam: "propertyId",
        })}
        cssStyle={{}}
      />,
    );
    expect(await findByDisplayValue("4")).toBeInTheDocument();
  });

  it("falls back to defaultValue when the named query param is absent", async () => {
    setQuery("/");
    const { findByDisplayValue } = render(
      <InputField
        node={makeNode({
          name: "propertyId",
          inputType: "text",
          defaultValue: "fallback",
          defaultValueFromQueryParam: "propertyId",
        })}
        cssStyle={{}}
      />,
    );
    expect(await findByDisplayValue("fallback")).toBeInTheDocument();
  });

  it("behaves identically to the pre-backfill version when defaultValueFromQueryParam is unset", () => {
    setQuery("/?propertyId=ignored");
    const { container } = render(
      <InputField
        node={makeNode({ name: "topic", label: "Topic", inputType: "text" })}
        cssStyle={{}}
      />,
    );
    const wrapper = container.querySelector(
      "[data-component-type='InputField']",
    ) as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("data-input-name")).toBe("topic");
    const input = wrapper?.querySelector("input") as HTMLInputElement | null;
    // No query-param binding → URL is not read → input stays empty (no defaultValue set).
    expect(input?.value).toBe("");
  });

  it("updates the displayed value as the user types (controlled-state sanity)", () => {
    const { container } = render(
      <InputField node={makeNode({ name: "fullName", inputType: "text" })} cssStyle={{}} />,
    );
    const input = container.querySelector(
      "input[data-input-name],input",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(input.value).toBe("Jane");
    fireEvent.change(input, { target: { value: "Janet" } });
    expect(input.value).toBe("Janet");
  });
});
