import { RmxTopBar } from "@/components/rmx-shell/rmx-top-bar";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("RmxTopBar", () => {
  it("renders the four left-cluster icon buttons with accessible labels", () => {
    render(<RmxTopBar />);
    for (const label of ["Home", "Open menu", "List view", "Favorites"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the Command Launch trigger", () => {
    render(<RmxTopBar />);
    expect(screen.getByRole("button", { name: "Command Launch" })).toBeInTheDocument();
  });

  it("renders the Company Code label and my-company text", () => {
    render(<RmxTopBar />);
    expect(screen.getByText("Company Code")).toBeInTheDocument();
    expect(screen.getByText("my-company")).toBeInTheDocument();
  });

  it("renders the notifications bell with the unread badge count", () => {
    render(<RmxTopBar />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByLabelText("2 unread notifications")).toHaveTextContent("2");
  });

  it("renders the WC avatar fallback", async () => {
    render(<RmxTopBar />);
    expect(await screen.findByText("WC")).toBeInTheDocument();
  });
});
