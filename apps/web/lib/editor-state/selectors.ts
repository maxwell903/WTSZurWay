import type { ComponentNode, Page, PaletteId, SiteConfig } from "@/lib/site-config";
import { findComponentById, findComponentTrail } from "./store";
import type { EditorState } from "./types";

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
