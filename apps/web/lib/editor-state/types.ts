import type {
  ComponentNode,
  DetailDataSource,
  Page,
  PageKind,
  PaletteId,
  SiteConfig,
} from "@/lib/site-config";

export type ComponentId = string;

export type LeftSidebarTab = "site" | "pages" | "add" | "data";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type EditorHydrateInput = {
  siteId: string;
  siteSlug: string;
  workingVersionId: string;
  initialConfig: SiteConfig;
};

export type AddPageInput = {
  name: string;
  slug: string;
  kind: PageKind;
  detailDataSource?: DetailDataSource;
};

export type RenamePageInput = {
  currentSlug: string;
  currentKind: PageKind;
  name: string;
  slug: string;
};

export type ReorderPagesInput = {
  slug: string;
  kind: PageKind;
  direction: "up" | "down";
};

export type EditorState = {
  siteId: string;
  siteSlug: string;
  workingVersionId: string;
  draftConfig: SiteConfig;
  currentPageSlug: string;
  selectedComponentId: ComponentId | null;
  hoveredComponentId: ComponentId | null;
  previewMode: boolean;
  leftSidebarTab: LeftSidebarTab;
  saveState: SaveState;
  lastSavedAt: number | null;
  saveError: string | null;
};

export type EditorActions = {
  hydrate: (input: EditorHydrateInput) => void;
  selectComponent: (id: ComponentId | null) => void;
  setHoveredComponent: (id: ComponentId | null) => void;
  setCurrentPageSlug: (slug: string) => void;
  setPreviewMode: (preview: boolean) => void;
  setLeftSidebarTab: (tab: LeftSidebarTab) => void;
  setSiteName: (name: string) => void;
  setPalette: (id: PaletteId) => void;
  setFontFamily: (font: string) => void;
  addPage: (input: AddPageInput) => void;
  renamePage: (input: RenamePageInput) => void;
  deletePage: (slug: string, kind: PageKind) => void;
  reorderPages: (input: ReorderPagesInput) => void;
  markSaving: () => void;
  markSaved: (at: number) => void;
  markError: (message: string) => void;
};

export type EditorStore = EditorState & EditorActions;

export type EditorActionErrorCode =
  | "home_page_locked"
  | "slug_already_used"
  | "invalid_slug"
  | "invalid_name"
  | "missing_detail_data_source"
  | "page_not_found"
  | "out_of_bounds";

export class EditorActionError extends Error {
  readonly code: EditorActionErrorCode;
  constructor(code: EditorActionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EditorActionError";
  }
}

export type { ComponentNode, Page, SiteConfig };
