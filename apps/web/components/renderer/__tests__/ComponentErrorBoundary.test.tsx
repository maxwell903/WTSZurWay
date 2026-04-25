import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentErrorBoundary } from "../ComponentErrorBoundary";

function Throwing(): never {
  throw new Error("boom");
}

function Safe() {
  return <span>safe</span>;
}

describe("<ComponentErrorBoundary>", () => {
  // Suppress React's own error log to keep test output clean. The boundary
  // also calls console.error itself; we silence that too.
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders children when nothing throws", () => {
    const { getByText } = render(
      <ComponentErrorBoundary id="ok">
        <Safe />
      </ComponentErrorBoundary>,
    );
    expect(getByText("safe")).toBeInTheDocument();
  });

  it("renders the recovery alert when a descendant throws", () => {
    const { getByRole } = render(
      <ComponentErrorBoundary id="bad">
        <Throwing />
      </ComponentErrorBoundary>,
    );
    expect(getByRole("alert")).toHaveTextContent("Component error — click to remove");
  });

  it("isolates the failure: sibling boundaries continue to render", () => {
    const { getByText, getByRole } = render(
      <div>
        <ComponentErrorBoundary id="bad">
          <Throwing />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary id="ok">
          <Safe />
        </ComponentErrorBoundary>
      </div>,
    );
    expect(getByRole("alert")).toBeInTheDocument();
    expect(getByText("safe")).toBeInTheDocument();
  });
});
