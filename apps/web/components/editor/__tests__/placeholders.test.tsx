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

  // Sprint 11 (2026-04-26) — the right sidebar is now the AI chat shell, not
  // the Sprint 6 placeholder. The Sprint 6 placeholder copy was removed by
  // the authorized RightSidebar hand-off; per CLAUDE.md §15.9 this assertion
  // is rewritten to a behavior-preserving "renders without crashing" check.
  it("Right sidebar renders the Sprint 11 AI chat shell", () => {
    render(<RightSidebar />);
    expect(screen.getByTestId("right-sidebar")).toBeInTheDocument();
  });

  it("Deploy button fires a toast and does not navigate", () => {
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    expect(toastMock).toHaveBeenCalledWith("Deploy is coming in a later sprint.");
  });
});
