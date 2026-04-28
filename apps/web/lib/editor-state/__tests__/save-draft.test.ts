// @vitest-environment jsdom

import type { SiteConfig } from "@/lib/site-config";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveDraft } from "../save-draft";
import { __resetEditorStoreForTests, useEditorStore } from "../store";

function makeFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "Test Site", siteSlug: "test-site" },
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
          children: [],
        },
      },
    ],
    forms: [],
  };
}

function hydrate(): void {
  useEditorStore.getState().hydrate({
    siteId: "site-1",
    siteSlug: "test-site",
    workingVersionId: "v1",
    initialConfig: makeFixtureConfig(),
  });
}

describe("useSaveDraft", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("PATCHes the working version with the current draftConfig and flips saveState to saved", async () => {
    hydrate();
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const { result } = renderHook(() => useSaveDraft({ fetcher }));

    act(() => {
      useEditorStore.getState().setSiteName("Aurora Demo");
    });
    expect(useEditorStore.getState().saveState).toBe("dirty");
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => {
      await result.current();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const firstCall = fetcher.mock.calls[0];
    if (!firstCall) throw new Error("fetcher not called");
    const [url, init] = firstCall;
    expect(url).toBe("/api/sites/site-1/working-version");
    expect(init?.method).toBe("PATCH");
    const body = JSON.parse(String(init?.body));
    expect(body.config.meta.siteName).toBe("Aurora Demo");

    expect(useEditorStore.getState().saveState).toBe("saved");
    expect(useEditorStore.getState().lastSavedAt).toBeGreaterThan(0);
  });

  it("flips saveState to error on a non-2xx response", async () => {
    hydrate();
    const fetcher = vi.fn<typeof fetch>(async () => new Response("nope", { status: 500 }));
    const { result } = renderHook(() => useSaveDraft({ fetcher }));

    act(() => {
      useEditorStore.getState().setSiteName("X");
    });

    await act(async () => {
      await result.current();
    });

    expect(useEditorStore.getState().saveState).toBe("error");
    expect(useEditorStore.getState().saveError).toMatch(/500/);
  });

  it("ignores re-entrant calls while a save is in flight", async () => {
    hydrate();
    const responses: Array<(res: Response) => void> = [];
    const fetcher = vi.fn<typeof fetch>(() => {
      return new Promise<Response>((resolve) => {
        responses.push(resolve);
      });
    });
    const { result } = renderHook(() => useSaveDraft({ fetcher }));

    act(() => {
      useEditorStore.getState().setSiteName("First");
    });

    let firstSave: Promise<void> | undefined;
    act(() => {
      firstSave = result.current();
    });
    expect(useEditorStore.getState().saveState).toBe("saving");
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Re-entrant click while saving — should be a no-op.
    await act(async () => {
      await result.current();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      responses[0]?.(new Response(null, { status: 204 }));
      await firstSave;
    });

    expect(useEditorStore.getState().saveState).toBe("saved");
  });

  it("does nothing when siteId is empty (store not yet hydrated)", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const { result } = renderHook(() => useSaveDraft({ fetcher }));

    await act(async () => {
      await result.current();
    });

    expect(fetcher).not.toHaveBeenCalled();
  });
});
