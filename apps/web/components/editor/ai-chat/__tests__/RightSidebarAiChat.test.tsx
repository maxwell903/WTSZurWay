import { RightSidebarAiChat } from "@/components/editor/ai-chat/RightSidebarAiChat";
import { useEditorStore } from "@/lib/editor-state";
import { __resetEditorStoreForTests } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeConfig(): SiteConfig {
  return {
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
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_hero",
              type: "HeroBanner",
              props: { heading: "Welcome", subheading: "" },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RightSidebarAiChat", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "11111111-1111-4111-8111-111111111111",
      siteSlug: "aurora",
      workingVersionId: "22222222-2222-4222-8222-222222222222",
      initialConfig: makeConfig(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function sendPrompt(prompt: string) {
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: prompt } });
    fireEvent.click(screen.getByLabelText("Send"));
    // Allow microtasks to drain so fetch promise resolves.
    await waitFor(() => {
      // no-op assertion -- we just want a tick.
      expect(ta).toBeInTheDocument();
    });
  }

  it("send -> ok response renders Accept/Discard; Accept commits the operations", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        kind: "ok",
        summary: "Update the hero headline",
        operations: [
          { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Hello" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("change the hero");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-ok")).toBeInTheDocument();
    });

    expect(screen.getByTestId("accept-button")).toBeInTheDocument();
    expect(screen.getByTestId("discard-button")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("accept-button"));

    await waitFor(() => {
      expect(screen.getByTestId("applied-tag")).toBeInTheDocument();
    });
    // The store's draftConfig was mutated by the real commitAiEditOperations.
    const root = useEditorStore.getState().draftConfig.pages[0]?.rootComponent;
    const hero = root?.children?.find((c) => c.id === "cmp_hero");
    expect(hero?.props.heading).toBe("Hello");
  });

  it("Discard mutes the buttons without mutating the store", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        kind: "ok",
        summary: "x",
        operations: [{ type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "X" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("y");
    await waitFor(() => {
      expect(screen.getByTestId("assistant-ok")).toBeInTheDocument();
    });

    const before = useEditorStore.getState().draftConfig;
    fireEvent.click(screen.getByTestId("discard-button"));
    await waitFor(() => {
      expect(screen.getByTestId("discarded-tag")).toBeInTheDocument();
    });
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });

  it("clarify response renders the question without Accept/Discard", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ kind: "clarify", question: "Which heading do you mean?" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("fix it");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-clarify").textContent).toMatch(/which heading/i);
    });
    expect(screen.queryByTestId("accept-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("discard-button")).not.toBeInTheDocument();
  });

  it("network_error renders the §9.6 copy + Retry button", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { kind: "network_error", message: "ECONNREFUSED" } }, 502),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("anything");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("assistant-error").textContent).toMatch(
      /We couldn't reach our AI service/i,
    );
    expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    expect(screen.getByTestId("copy-details-button")).toBeInTheDocument();
  });

  it("Retry on network_error re-sends the last prompt", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { kind: "network_error", message: "ECONNREFUSED" } }, 502),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        kind: "ok",
        summary: "Update",
        operations: [{ type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Hi" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("retry-me");
    await waitFor(() => expect(screen.getByTestId("retry-button")).toBeInTheDocument());

    act(() => {
      fireEvent.click(screen.getByTestId("retry-button"));
    });
    await waitFor(() => expect(screen.getByTestId("assistant-ok")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetch rejection (no network) surfaces as a network_error message", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("offline");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("assistant-error").getAttribute("data-error-kind")).toBe(
      "network_error",
    );
  });

  // ----- Sprint 14 DoD-16(h) -----

  it("Sprint 14: assistant turn renders the [fixture] badge in dev mode when x-ai-source: fixture is present", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            kind: "ok",
            summary: "Update the hero headline",
            operations: [],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json", "x-ai-source": "fixture" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<RightSidebarAiChat />);
    await sendPrompt("change the hero");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-ok")).toBeInTheDocument();
    });
    expect(screen.getByTestId("ai-chat-turn-ai-source")).toHaveTextContent("[fixture]");
    vi.unstubAllEnvs();
  });
});
