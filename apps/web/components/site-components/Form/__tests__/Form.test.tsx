import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentNode } from "@/types/site-config";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Form } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_form", type: "Form", props, style: {} };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const FORM_SOURCE_PATH = join(HERE, "..", "index.tsx");
const FORM_SOURCE = readFileSync(FORM_SOURCE_PATH, "utf8");

describe("<Form>", () => {
  it("renders a <form noValidate> with the user's children given a minimal valid node", () => {
    const { container } = render(
      <Form node={makeNode({ formName: "contact" })} cssStyle={{}}>
        <input name="email" />
      </Form>,
    );
    const form = container.querySelector(
      "form[data-component-type='Form']",
    ) as HTMLFormElement | null;
    expect(form).not.toBeNull();
    expect(form?.noValidate).toBe(true);
    expect(form?.getAttribute("data-form-name")).toBe("contact");
    expect(form?.querySelector("input[name='email']")).not.toBeNull();
  });

  it("applies the supplied cssStyle to its root <form> element", () => {
    const { container } = render(
      <Form node={makeNode({ formName: "contact" })} cssStyle={{ padding: "16px" }}>
        <span />
      </Form>,
    );
    const form = container.querySelector(
      "form[data-component-type='Form']",
    ) as HTMLFormElement | null;
    expect(form?.style.padding).toBe("16px");
  });

  it("falls back to a default name when formName is missing", () => {
    const { container } = render(
      <Form node={makeNode({})} cssStyle={{}}>
        <span />
      </Form>,
    );
    const form = container.querySelector(
      "form[data-component-type='Form']",
    ) as HTMLFormElement | null;
    expect(form?.getAttribute("data-form-name")).toBe("form");
  });

  it("calls event.preventDefault() on submit so the preview never navigates", () => {
    const { container } = render(
      <Form node={makeNode({ formName: "contact" })} cssStyle={{}}>
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, submitEvent);
    expect(submitEvent.defaultPrevented).toBe(true);
  });

  it("does not import fetch or reference the submission endpoint (Sprint 5 invariant)", () => {
    expect(FORM_SOURCE).not.toContain("/api/form-submissions");
    expect(FORM_SOURCE).not.toMatch(/\bfetch\s*\(/);
  });
});
