import { AddPageDialog } from "@/components/editor/sidebar/pages-tab/AddPageDialog";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
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

describe("<AddPageDialog>", () => {
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

  it("hides the data-source dropdown until kind = Detail is selected", () => {
    render(<AddPageDialog open={true} onOpenChange={() => {}} />);
    expect(screen.queryByTestId("add-page-data-source")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("add-page-kind-detail"));
    expect(screen.getByTestId("add-page-data-source")).toBeInTheDocument();
  });

  it("blocks Submit when the slug conflicts with an existing same-kind page", () => {
    // Pre-populate a "properties" static page in the store.
    useEditorStore.getState().addPage({ name: "Properties", slug: "properties", kind: "static" });
    render(<AddPageDialog open={true} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByTestId("add-page-name"), { target: { value: "Dup" } });
    fireEvent.change(screen.getByTestId("add-page-slug"), { target: { value: "properties" } });
    expect(screen.getByTestId("add-page-slug-conflict")).toBeInTheDocument();
    expect(screen.getByTestId("add-page-submit")).toBeDisabled();
  });

  it("allows the U2 same-slug coexistence (static + detail) with no conflict", () => {
    useEditorStore.getState().addPage({ name: "Units", slug: "units", kind: "static" });
    render(<AddPageDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByTestId("add-page-kind-detail"));
    fireEvent.change(screen.getByTestId("add-page-name"), { target: { value: "Unit Detail" } });
    fireEvent.change(screen.getByTestId("add-page-slug"), { target: { value: "units" } });
    expect(screen.queryByTestId("add-page-slug-conflict")).not.toBeInTheDocument();
    expect(screen.getByTestId("add-page-submit")).not.toBeDisabled();
  });

  it("submits a valid static page and closes the dialog", () => {
    const onOpenChange = vi.fn();
    render(<AddPageDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByTestId("add-page-name"), { target: { value: "Properties" } });
    fireEvent.change(screen.getByTestId("add-page-slug"), { target: { value: "properties" } });
    fireEvent.click(screen.getByTestId("add-page-submit"));
    const pages = useEditorStore.getState().draftConfig.pages;
    expect(pages.find((p) => p.slug === "properties")).toBeDefined();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
