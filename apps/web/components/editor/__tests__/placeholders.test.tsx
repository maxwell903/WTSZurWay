import { RightSidebar } from "@/components/editor/sidebar/RightSidebar";
import { DeployButton } from "@/components/editor/topbar/DeployButton";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const toastMock = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastMock(...args), {
    error: vi.fn(),
    success: vi.fn(),
  }),
  Toaster: () => null,
}));

describe("placeholder shells", () => {
  afterEach(() => {
    toastMock.mockReset();
  });

  it("Right sidebar renders the Sprint 11 placeholder copy", () => {
    render(<RightSidebar />);
    expect(
      screen.getByText(/Select a component to edit it, or chat with the AI assistant/),
    ).toBeInTheDocument();
  });

  it("Deploy button fires a toast and does not navigate", () => {
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    expect(toastMock).toHaveBeenCalledWith("Deploy is coming in a later sprint.");
  });
});
