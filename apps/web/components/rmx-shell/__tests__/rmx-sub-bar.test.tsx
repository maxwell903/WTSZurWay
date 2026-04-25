import { RmxSubBar } from "@/components/rmx-shell/rmx-sub-bar";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("RmxSubBar", () => {
  it("renders the title in a heading", () => {
    render(<RmxSubBar title="Add Website Template" />);
    expect(
      screen.getByRole("heading", { name: "Add Website Template", level: 1 }),
    ).toBeInTheDocument();
  });

  it("exposes a help button on the right", () => {
    render(<RmxSubBar title="anything" />);
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });
});
