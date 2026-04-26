import { useEditorStore } from "@/lib/editor-state";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before any module-level `const`, which is required because
// vi.mock is hoisted ABOVE imports -- the sonner factory below reads
// toastSuccess/toastError as direct values during DeployButton's import-time
// evaluation, so plain `const`s would still be in TDZ.
const { toastSuccess, toastError, toastBase } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastBase: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastBase(...args), {
    success: toastSuccess,
    error: toastError,
  }),
  Toaster: () => null,
}));

import { DeployButton } from "../DeployButton";

const fetchMock = vi.fn();
const writeText = vi.fn();

type SaveStateLike = "idle" | "dirty" | "saving" | "saved" | "error";

function hydrateStore(overrides: {
  siteId?: string;
  siteSlug?: string;
  saveState?: SaveStateLike;
}) {
  useEditorStore.setState({
    siteId: overrides.siteId ?? "site-1",
    siteSlug: overrides.siteSlug ?? "aurora",
    saveState: overrides.saveState ?? "saved",
    workingVersionId: "v_working",
    saveError: null,
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("DeployButton", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    fetchMock.mockReset();
    writeText.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastBase.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an enabled button when saveState is 'saved'", () => {
    hydrateStore({ saveState: "saved" });
    render(<DeployButton />);
    expect(screen.getByTestId("deploy-button")).not.toBeDisabled();
  });

  it.each([
    ["dirty", "Saving…"],
    ["saving", "Save in progress…"],
    ["error", "Save failed; cannot deploy"],
  ] as const)(
    "renders disabled when saveState is '%s' with the right title hint",
    (state, hint) => {
      hydrateStore({ saveState: state });
      render(<DeployButton />);
      const button = screen.getByTestId("deploy-button");
      expect(button).toBeDisabled();
      expect(button.getAttribute("title")).toBe(hint);
    },
  );

  it("opens the confirmation dialog when clicked", async () => {
    hydrateStore({ saveState: "saved" });
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("POSTs to /api/sites/{siteId}/deploy when Confirm is clicked", async () => {
    hydrateStore({ siteId: "site-abc", saveState: "saved" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ versionId: "v1", deployedUrl: "https://www.aurora.com" }, 200),
    );
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("deploy-confirm-button"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sites/site-abc/deploy",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fires toast.success with the deployedUrl and a Copy action on a 200 response", async () => {
    hydrateStore({ saveState: "saved" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ versionId: "v1", deployedUrl: "https://www.aurora.com" }, 200),
    );
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("deploy-confirm-button"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [message, opts] = toastSuccess.mock.calls[0] as [string, { action: { label: string } }];
    expect(message).toContain("Deployed.");
    expect(message).toContain("https://www.aurora.com");
    expect(opts.action.label).toBe("Copy");
  });

  it("writes the deployedUrl to navigator.clipboard when the Copy action is clicked", async () => {
    hydrateStore({ saveState: "saved" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ versionId: "v1", deployedUrl: "https://www.aurora.com" }, 200),
    );
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("deploy-confirm-button"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [, opts] = toastSuccess.mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    opts.action.onClick();
    expect(writeText).toHaveBeenCalledWith("https://www.aurora.com");
  });

  it("fires toast.error when the response is a 4xx with an AiError body", async () => {
    hydrateStore({ saveState: "saved" });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { kind: "invalid_output", message: "Working config failed schema validation." } },
        400,
      ),
    );
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("deploy-confirm-button"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const [message] = toastError.mock.calls[0] as [string];
    expect(message).toContain("Deploy failed");
    expect(message).toContain("schema validation");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows 'Deploying…' and disables the button while the request is in flight", async () => {
    hydrateStore({ saveState: "saved" });
    let resolveFetch!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchMock.mockReturnValueOnce(pending);
    render(<DeployButton />);
    fireEvent.click(screen.getByTestId("deploy-button"));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("deploy-confirm-button"));

    await waitFor(() => {
      const button = screen.getByTestId("deploy-button");
      expect(button).toBeDisabled();
      expect(button.textContent).toContain("Deploying");
    });

    resolveFetch(jsonResponse({ versionId: "v1", deployedUrl: "https://www.aurora.com" }, 200));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });
});
