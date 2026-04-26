import type { ComponentNode, Page, PaletteId, SiteConfig } from "@/lib/site-config";
import { findComponentById, findComponentParentId, findComponentTrail } from "./store";
import type { ComponentId, EditorState, ElementEditTab } from "./types";

export function selectCurrentPage(state: EditorState): Page | undefined {
  return (
    state.draftConfig.pages.find((p) => p.slug === state.currentPageSlug && p.kind === "static") ??
    state.draftConfig.pages.find((p) => p.slug === state.currentPageSlug)
  );
}

export function selectSelectedComponentNode(state: EditorState): ComponentNode | null {
  const id = state.selectedComponentId;
  if (!id) return null;
  const page = selectCurrentPage(state);
  return findComponentById(page?.rootComponent, id);
}

export function selectSelectionTrail(state: EditorState): ComponentNode[] {
  const id = state.selectedComponentId;
  if (!id) return [];
  const page = selectCurrentPage(state);
  return findComponentTrail(page?.rootComponent, id);
}

export type PagePickerEntry = {
  id: string;
  slug: string;
  name: string;
  kind: Page["kind"];
};

export function selectAllPagesForPicker(state: EditorState): PagePickerEntry[] {
  return state.draftConfig.pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    kind: p.kind,
  }));
}

export function selectPaletteId(state: EditorState): PaletteId {
  return state.draftConfig.brand.palette;
}

export function selectIsHomePage(page: Page): boolean {
  return page.slug === "home" && page.kind === "static";
}

export function selectDraftConfig(state: EditorState): SiteConfig {
  return state.draftConfig;
}

export function selectIsElementEditMode(state: EditorState): boolean {
  return state.leftSidebarMode === "element-edit";
}

export function selectElementEditTab(state: EditorState): ElementEditTab {
  return state.elementEditTab;
}

export function selectSelectedComponentParentId(state: EditorState): ComponentId | null {
  const id = state.selectedComponentId;
  if (!id) return null;
  const page = selectCurrentPage(state);
  if (!page) return null;
  // The page root has no parent within the tree.
  if (page.rootComponent.id === id) return null;
  return findComponentParentId(page.rootComponent, id);
}

export function selectDetailPages(state: EditorState): Page[] {
  return state.draftConfig.pages
    .filter((p) => p.kind === "detail")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}
