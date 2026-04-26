import { RenamePageDialog } from "@/components/editor/sidebar/pages-tab/RenamePageDialog";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { Page, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  Toaster: () => null,
}));

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
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {}, children: [] },
      },
    ],
    forms: [],
  };
}

describe("<RenamePageDialog>", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("disables the slug input for the home page with a tooltip", () => {
    const homePage = useEditorStore.getState().draftConfig.pages[0] as Page;
    render(<RenamePageDialog page={homePage} onClose={() => {}} />);
    const slugInput = screen.getByTestId("rename-page-slug") as HTMLInputElement;
    expect(slugInput.disabled).toBe(true);
    expect(slugInput.title).toBe("The home page slug is fixed.");
  });

  it("allows renaming the home page's display name (slug stays disabled)", () => {
    const homePage = useEditorStore.getState().draftConfig.pages[0] as Page;
    const onClose = vi.fn();
    render(<RenamePageDialog page={homePage} onClose={onClose} />);
    fireEvent.change(screen.getByTestId("rename-page-name"), { target: { value: "Welcome" } });
    fireEvent.click(screen.getByTestId("rename-page-submit"));
    const homeAfter = useEditorStore.getState().draftConfig.pages[0];
    expect(homeAfter?.name).toBe("Welcome");
    expect(homeAfter?.slug).toBe("home");
    expect(onClose).toHaveBeenCalled();
  });
});
