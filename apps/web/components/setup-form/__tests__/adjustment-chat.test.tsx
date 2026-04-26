import { OperationInvalidError } from "@/lib/site-config/ops";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdjustmentChat } from "../AdjustmentChat";

const VALID_CONFIG = {
  meta: { siteName: "Aurora", siteSlug: "aurora" },
  brand: { palette: "ocean", fontFamily: "Inter" },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "" },
  },
  pages: [
    {
      id: "p_home",
      slug: "home",
      name: "Home",
      kind: "static",
      rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children: [] },
    },
  ],
  forms: [],
};

const uploadAttachmentMock = vi.fn();
const applyOperationsMock = vi.fn();

vi.mock("@/lib/storage", () => ({
  uploadAttachment: (file: File) => uploadAttachmentMock(file),
}));

vi.mock("@/lib/site-config/ops", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/site-config/ops")>("@/lib/site-config/ops");
  return {
    ...actual,
    applyOperations: (...args: Parameters<typeof actual.applyOperations>) =>
      applyOperationsMock(...args),
  };
});

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

function mockHydrateOk() {
  fetchMock.mockResolvedValueOnce(jsonResponse(200, { versionId: "v1", config: VALID_CONFIG }));
}

beforeEach(() => {
  fetchMock.mockReset();
  uploadAttachmentMock.mockReset();
  applyOperationsMock.mockReset();
  // Default: pass-through identity for valid op application; tests override
  // when they want to simulate a throw or a config mutation.
  applyOperationsMock.mockImplementation((cfg: unknown) => cfg);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeImageFile(name: string, sizeBytes: number, type = "image/png"): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("<AdjustmentChat>", () => {
  it("hydrates by GETting /api/sites/[siteId]/working-version on mount", async () => {
    mockHydrateOk();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sites/s1/working-version", { method: "GET" });
    });
    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });
    expect(screen.getByTestId("adjustment-chat-empty")).toHaveTextContent(
      "Want to adjust something? Ask the AI.",
    );
  });

  it("disables Send while hydration is pending and Send-clicks while not idle do nothing", async () => {
    // Defer the hydrate response so the chat stays in the hydrating state.
    let resolveHydrate: (response: Response) => void = () => undefined;
    const hydratePromise = new Promise<Response>((resolve) => {
      resolveHydrate = resolve;
    });
    fetchMock.mockReturnValueOnce(hydratePromise);

    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "hydrating");
    expect(screen.getByTestId("adjustment-chat-send")).toBeDisabled();
    expect(screen.getByTestId("adjustment-chat-input")).toBeDisabled();

    // Even typing then trying to send is impossible -- the input is disabled
    // and Send is disabled.
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the hydrate call

    resolveHydrate(jsonResponse(200, { versionId: "v1", config: VALID_CONFIG }));
    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });
  });

  it("on a kind:'ok' response: applies ops, PATCHes the new config, and calls onConfigUpdated", async () => {
    mockHydrateOk();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { kind: "ok", summary: "Updated headline", operations: [] }),
    );
    fetchMock.mockResolvedValueOnce(noContentResponse());

    const onConfigUpdated = vi.fn();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={onConfigUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "change the headline" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai-edit",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/sites/s1/working-version",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    await waitFor(() => {
      expect(onConfigUpdated).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("adjustment-chat-turn-summary")).toHaveTextContent(
      "Updated headline",
    );

    // POST body shape (siteId, currentVersionId, prompt; no selection/history).
    const editCall = fetchMock.mock.calls.find((c) => c[0] === "/api/ai-edit");
    const editInit = editCall?.[1] as RequestInit | undefined;
    const editBody = JSON.parse(editInit?.body as string);
    expect(editBody).toEqual({
      siteId: "s1",
      currentVersionId: "v1",
      prompt: "change the headline",
    });

    // PATCH body shape (full config wrapped in { config }).
    const patchCall = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/sites/s1/working-version" && (c[1] as RequestInit).method === "PATCH",
    );
    const patchBody = JSON.parse((patchCall?.[1] as RequestInit).body as string);
    expect(patchBody).toEqual({ config: VALID_CONFIG });
  });

  it("on a kind:'clarify' response: appends the question and does NOT PATCH or notify", async () => {
    mockHydrateOk();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { kind: "clarify", question: "Which page do you mean?" }),
    );

    const onConfigUpdated = vi.fn();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={onConfigUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "make it better" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat-turn-clarify")).toHaveTextContent(
        "Which page do you mean?",
      );
    });

    // No PATCH was issued.
    const patchCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);
    expect(onConfigUpdated).not.toHaveBeenCalled();
    expect(applyOperationsMock).not.toHaveBeenCalled();
  });

  it("on an { error } response: shows the §9.6 copy keyed on the AiError kind and does NOT PATCH", async () => {
    mockHydrateOk();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, { error: { kind: "over_quota", message: "Demo edit limit reached." } }),
    );

    const onConfigUpdated = vi.fn();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={onConfigUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      const errorTurn = screen.getByTestId("adjustment-chat-turn-error");
      expect(errorTurn).toHaveAttribute("data-error-kind", "over_quota");
      expect(errorTurn).toHaveTextContent(/Service unavailable/);
    });

    const patchCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);
    expect(onConfigUpdated).not.toHaveBeenCalled();
  });

  it("rejects a non-image attachment with the §DoD-12 'Only image files' copy", async () => {
    mockHydrateOk();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    const txt = new File([new Blob(["hello"], { type: "text/plain" })], "notes.txt", {
      type: "text/plain",
    });
    const input = screen.getByTestId("adjustment-chat-file-input") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [txt], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat-attachment-error")).toHaveTextContent(
        "Only image files are supported.",
      );
    });
    expect(uploadAttachmentMock).not.toHaveBeenCalled();
  });

  it("rejects an oversize image with the §DoD-12 '5 MB or smaller' copy", async () => {
    mockHydrateOk();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    const big = makeImageFile("huge.png", 6 * 1024 * 1024, "image/png");
    const input = screen.getByTestId("adjustment-chat-file-input") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat-attachment-error")).toHaveTextContent(
        "Each image must be 5 MB or smaller.",
      );
    });
    expect(uploadAttachmentMock).not.toHaveBeenCalled();
  });

  it("rejects the 5th attachment with the §DoD-12 'up to 4 images' copy", async () => {
    mockHydrateOk();
    uploadAttachmentMock.mockImplementation(async (file: File) => ({
      url: `https://cdn.example.com/${file.name}`,
      path: file.name,
    }));

    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    const input = screen.getByTestId("adjustment-chat-file-input") as HTMLInputElement;

    // Upload 4 images one by one (mirrors the smoke-test step 14).
    for (let i = 0; i < 4; i++) {
      const file = makeImageFile(`a-${i}.png`, 1024, "image/png");
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      await waitFor(() => {
        expect(screen.getByTestId(`adjustment-chat-attachment-${i}`)).toBeInTheDocument();
      });
    }

    // 5th attempt is rejected.
    const fifth = makeImageFile("a-5.png", 1024, "image/png");
    Object.defineProperty(input, "files", { value: [fifth], configurable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat-attachment-error")).toHaveTextContent(
        "You can attach up to 4 images per message.",
      );
    });
    expect(uploadAttachmentMock).toHaveBeenCalledTimes(4);
  });

  it("an OperationInvalidError thrown by applyOperations yields the operation_invalid copy and does NOT PATCH", async () => {
    mockHydrateOk();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { kind: "ok", summary: "Should not apply", operations: [] }),
    );
    applyOperationsMock.mockImplementation(() => {
      throw new OperationInvalidError("setText", "Target not found", "op_1");
    });

    const onConfigUpdated = vi.fn();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={onConfigUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "change something" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      const errorTurn = screen.getByTestId("adjustment-chat-turn-error");
      expect(errorTurn).toHaveAttribute("data-error-kind", "operation_invalid");
      expect(errorTurn).toHaveTextContent(/wouldn't work/);
    });

    const patchCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);
    expect(onConfigUpdated).not.toHaveBeenCalled();
  });

  it("a PATCH 500 response yields the auth_error copy and does NOT call onConfigUpdated", async () => {
    mockHydrateOk();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { kind: "ok", summary: "Headline updated", operations: [] }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { category: "server_error", message: "boom" }),
    );

    const onConfigUpdated = vi.fn();
    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={onConfigUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "make change" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      const errorTurn = screen.getByTestId("adjustment-chat-turn-error");
      expect(errorTurn).toHaveAttribute("data-error-kind", "auth_error");
      expect(errorTurn).toHaveTextContent(/Service unavailable/);
    });
    expect(onConfigUpdated).not.toHaveBeenCalled();
  });

  it("a thrown fetch on the ai-edit POST yields the network_error copy", async () => {
    mockHydrateOk();
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));

    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute("data-chat-state", "idle");
    });

    fireEvent.change(screen.getByTestId("adjustment-chat-input"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByTestId("adjustment-chat-send"));

    await waitFor(() => {
      const errorTurn = screen.getByTestId("adjustment-chat-turn-error");
      expect(errorTurn).toHaveAttribute("data-error-kind", "network_error");
      expect(errorTurn).toHaveTextContent(/We couldn't reach our AI service/);
    });
  });

  it("hydration 404 surfaces the not_found copy and keeps Send disabled forever", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { category: "not_found", message: "no row" }),
    );

    render(<AdjustmentChat siteId="s1" versionId="v1" onConfigUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("adjustment-chat")).toHaveAttribute(
        "data-chat-state",
        "hydrate-error",
      );
    });
    expect(screen.getByTestId("adjustment-chat-hydrate-error")).toHaveTextContent(
      /Couldn't load your site preview/,
    );
    expect(screen.getByTestId("adjustment-chat-send")).toBeDisabled();
    expect(screen.getByTestId("adjustment-chat-input")).toBeDisabled();
  });
});
