import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { type StateCreator, create } from "zustand";
import {
  applyAddPage,
  applyDeletePage,
  applyRenamePage,
  applyReorderPages,
  applySetFontFamily,
  applySetPalette,
  applySetSiteName,
} from "./actions";
import type { EditorStore } from "./types";

const EMPTY_CONFIG: SiteConfig = {
  meta: { siteName: "", siteSlug: "" },
  brand: { palette: "ocean", fontFamily: "Inter" },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "" },
  },
  pages: [],
  forms: [],
};

const creator: StateCreator<EditorStore> = (set, get) => ({
  // -------- state --------
  siteId: "",
  siteSlug: "",
  workingVersionId: "",
  draftConfig: EMPTY_CONFIG,
  currentPageSlug: "home",
  selectedComponentId: null,
  hoveredComponentId: null,
  previewMode: false,
  leftSidebarTab: "pages",
  saveState: "idle",
  lastSavedAt: null,
  saveError: null,

  // -------- non-mutating actions --------
  hydrate: (input) =>
    set({
      siteId: input.siteId,
      siteSlug: input.siteSlug,
      workingVersionId: input.workingVersionId,
      draftConfig: input.initialConfig,
      currentPageSlug: input.initialConfig.pages[0]?.slug ?? "home",
      selectedComponentId: null,
      hoveredComponentId: null,
      previewMode: false,
      leftSidebarTab: "pages",
      saveState: "idle",
      lastSavedAt: null,
      saveError: null,
    }),

  selectComponent: (id) => set({ selectedComponentId: id }),
  setHoveredComponent: (id) => set({ hoveredComponentId: id }),
  setCurrentPageSlug: (slug) =>
    set({ currentPageSlug: slug, selectedComponentId: null, hoveredComponentId: null }),
  setPreviewMode: (preview) =>
    set({ previewMode: preview, selectedComponentId: preview ? null : get().selectedComponentId }),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),

  markSaving: () => set({ saveState: "saving", saveError: null }),
  markSaved: (at) => set({ saveState: "saved", lastSavedAt: at, saveError: null }),
  markError: (message) => set({ saveState: "error", saveError: message }),

  // -------- mutating actions: flip saveState to "dirty" --------
  setSiteName: (name) =>
    set((state) => ({
      draftConfig: applySetSiteName(state.draftConfig, name),
      saveState: "dirty",
    })),

  setPalette: (id) =>
    set((state) => ({
      draftConfig: applySetPalette(state.draftConfig, id),
      saveState: "dirty",
    })),

  setFontFamily: (font) =>
    set((state) => ({
      draftConfig: applySetFontFamily(state.draftConfig, font),
      saveState: "dirty",
    })),

  addPage: (input) =>
    set((state) => ({
      draftConfig: applyAddPage(state.draftConfig, input),
      currentPageSlug: input.slug,
      selectedComponentId: null,
      saveState: "dirty",
    })),

  renamePage: (input) =>
    set((state) => {
      const next = applyRenamePage(state.draftConfig, input);
      const pageWasCurrent =
        state.currentPageSlug === input.currentSlug && input.currentKind === "static";
      return {
        draftConfig: next,
        currentPageSlug: pageWasCurrent ? input.slug : state.currentPageSlug,
        saveState: "dirty",
      };
    }),

  deletePage: (slug, kind) =>
    set((state) => {
      const next = applyDeletePage(state.draftConfig, slug, kind);
      const wasCurrent = state.currentPageSlug === slug && kind === "static";
      return {
        draftConfig: next,
        currentPageSlug: wasCurrent ? "home" : state.currentPageSlug,
        selectedComponentId: wasCurrent ? null : state.selectedComponentId,
        saveState: "dirty",
      };
    }),

  reorderPages: (input) =>
    set((state) => ({
      draftConfig: applyReorderPages(state.draftConfig, input),
      saveState: "dirty",
    })),
});

// Sprint 6: zustand devtools middleware was deferred -- the conditional-wrap
// pattern produces a non-trivially-conflicting StateCreator union type that's
// not worth the pre-Sprint-7 hack. Future sprints can opt into devtools per
// store under their own deviation.
export const useEditorStore = create<EditorStore>()(creator);

// Test helper -- vitest tests reset the store between cases. Not exported
// from the public barrel.
export function __resetEditorStoreForTests(): void {
  useEditorStore.setState({
    siteId: "",
    siteSlug: "",
    workingVersionId: "",
    draftConfig: EMPTY_CONFIG,
    currentPageSlug: "home",
    selectedComponentId: null,
    hoveredComponentId: null,
    previewMode: false,
    leftSidebarTab: "pages",
    saveState: "idle",
    lastSavedAt: null,
    saveError: null,
  });
}

// Helpers used by selectors -- exported for unit-test reach.
export function findComponentById(
  root: ComponentNode | undefined,
  id: string,
): ComponentNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findComponentById(child, id);
    if (found) return found;
  }
  return null;
}

export function findComponentTrail(root: ComponentNode | undefined, id: string): ComponentNode[] {
  if (!root) return [];
  if (root.id === id) return [root];
  if (!root.children) return [];
  for (const child of root.children) {
    const trail = findComponentTrail(child, id);
    if (trail.length > 0) return [root, ...trail];
  }
  return [];
}
