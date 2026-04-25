import { RmxShell } from "@/components/rmx-shell/rmx-shell";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("RmxShell", () => {
  it("composes the top bar, the sub bar with the given title, and renders children", () => {
    render(
      <RmxShell subBarTitle="My Title">
        <p>page body content</p>
      </RmxShell>,
    );

    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Title", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("page body content")).toBeInTheDocument();
  });
});
