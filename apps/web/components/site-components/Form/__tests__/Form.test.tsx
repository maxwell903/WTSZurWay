import type { ComponentNode } from "@/types/site-config";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Form } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_form", type: "Form", props, style: {} };
}

function setLocation(pathname: string, search = ""): void {
  window.history.pushState({}, "", `${pathname}${search}`);
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  setLocation("/aurora-cincy/preview");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    act(() => {
      fireEvent(form, submitEvent);
    });
    expect(submitEvent.defaultPrevented).toBe(true);
  });

  it("POSTs to /api/form-submissions with the JSON shape the API expects", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, createdAt: "now" }), { status: 201 }),
    );
    setLocation("/aurora-cincy/preview", "?page=contact");
    const { container } = render(
      <Form node={makeNode({ formName: "contact_us" })} cssStyle={{}}>
        <input name="email" defaultValue="someone@example.com" />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/form-submissions",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
    expect(init?.body).toBeDefined();
    const parsed = JSON.parse(init?.body ?? "{}");
    expect(parsed).toEqual({
      siteSlug: "aurora-cincy",
      formId: "contact_us",
      pageSlug: "contact",
      submittedData: { email: "someone@example.com" },
    });
  });

  it("is a no-op in edit context — does NOT call fetch when path's second segment is 'edit'", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    setLocation("/aurora-cincy/edit");
    const { container } = render(
      <Form node={makeNode({ formName: "contact" })} cssStyle={{}}>
        <input name="email" defaultValue="x@x.com" />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swaps children for the configured success message after a 2xx response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, createdAt: "now" }), { status: 201 }),
    );
    const { container } = render(
      <Form
        node={makeNode({ formName: "contact", successMessage: "Thanks — we'll be in touch." })}
        cssStyle={{}}
      >
        <input name="email" defaultValue="x@x.com" />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Thanks — we'll be in touch.");
    });
    expect(container.querySelector("input[name='email']")).toBeNull();
  });

  it("renders the inline error message and preserves children when the API responds non-2xx", async () => {
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));
    const { container } = render(
      <Form node={makeNode({ formName: "contact" })} cssStyle={{}}>
        <input name="email" defaultValue="x@x.com" />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("couldn't submit");
    });
    expect(container.querySelector("input[name='email']")).not.toBeNull();
  });

  it("does NOT POST when formName is empty (the formId partition would be ambiguous)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    const { container } = render(
      <Form node={makeNode({ formName: "" })} cssStyle={{}}>
        <input name="email" defaultValue="x@x.com" />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it("joins multi-value FormData fields with ', ' (URLSearchParams-equivalent simplification)", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, createdAt: "now" }), { status: 201 }),
    );
    setLocation("/aurora-cincy/preview");
    const { container } = render(
      <Form node={makeNode({ formName: "topics" })} cssStyle={{}}>
        <input type="checkbox" name="topic" value="alpha" defaultChecked />
        <input type="checkbox" name="topic" value="beta" defaultChecked />
        <button type="submit">go</button>
      </Form>,
    );
    const form = container.querySelector("form[data-component-type='Form']") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });
    const init = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
    const parsed = JSON.parse(init?.body ?? "{}");
    expect(parsed.submittedData).toEqual({ topic: "alpha, beta" });
  });
});
