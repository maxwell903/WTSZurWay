import type {
  AnimationConfig,
  CanvasConfig,
  ComponentNode,
  DataBinding,
  DetailDataSource,
  Page,
  PageKind,
  PaletteId,
  SiteConfig,
  StyleConfig,
} from "@/lib/site-config";
import type { Operation } from "@/lib/site-config/ops";

export type ComponentId = string;

export type LeftSidebarTab = "site" | "pages" | "add" | "data";

export type LeftSidebarMode = "primary" | "element-edit";

export type ElementEditTab = "content" | "style" | "animation" | "visibility" | "advanced";

export type ComponentVisibility = "always" | "desktop" | "mobile";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

// Rich-text editing scope. Layered on top of `selectedComponentId` (does not
// replace it). `null` means the toolbar is not active.
//   - "single":   the user right-clicked a single text-bearing component;
//                 a TipTap editor is mounted on (id, propKey).
//   - "broadcast": the user double-right-clicked a parent; every text-bearing
//                  descendant is highlighted and toolbar actions transform
//                  every doc in `ids` at once. No editor is mounted.
export type TextEditingScope =
  | { mode: "single"; id: ComponentId; propKey: string }
  | { mode: "broadcast"; rootId: ComponentId; ids: ComponentId[] };

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
  leftSidebarMode: LeftSidebarMode;
  elementEditTab: ElementEditTab;
  saveState: SaveState;
  lastSavedAt: number | null;
  saveError: string | null;
  // Phase 6 Task 6.1 — transient toggle, defaults ON each editor load (no persistence).
  showComponentTypes: boolean;
  // Rich-text Phase 1 — null when the floating rich-text toolbar is closed.
  textEditingScope: TextEditingScope | null;
};

export type EditorActions = {
  hydrate: (input: EditorHydrateInput) => void;
  selectComponent: (id: ComponentId | null) => void;
  deselectAll: () => void;
  setHoveredComponent: (id: ComponentId | null) => void;
  setCurrentPageSlug: (slug: string) => void;
  setPreviewMode: (preview: boolean) => void;
  setLeftSidebarTab: (tab: LeftSidebarTab) => void;
  setSiteName: (name: string) => void;
  setPalette: (id: PaletteId) => void;
  setFontFamily: (font: string) => void;
  setCanvasConfig: (patch: Partial<CanvasConfig>) => void;
  addPage: (input: AddPageInput) => void;
  renamePage: (input: RenamePageInput) => void;
  deletePage: (slug: string, kind: PageKind) => void;
  reorderPages: (input: ReorderPagesInput) => void;
  enterElementEditMode: (id: ComponentId) => void;
  exitElementEditMode: () => void;
  setElementEditTab: (tab: ElementEditTab) => void;
  setComponentProps: (id: ComponentId, props: Record<string, unknown>) => void;
  setComponentStyle: (id: ComponentId, style: StyleConfig) => void;
  setComponentAnimation: (id: ComponentId, animation: AnimationConfig | undefined) => void;
  setComponentVisibility: (id: ComponentId, visibility: ComponentVisibility | undefined) => void;
  // Sprint 9 — Repeater data binding mutator.
  setComponentDataBinding: (id: ComponentId, dataBinding: DataBinding | undefined) => void;
  // Sprint 11 — AI Edit Accept folds an Operation[] into draftConfig.
  commitAiEditOperations: (operations: readonly Operation[]) => void;
  removeComponent: (id: ComponentId) => void;
  // Sprint 7 — drag-and-drop and resize mutators.
  addComponentChild: (parentId: ComponentId, index: number, node: ComponentNode) => void;
  moveComponent: (targetId: ComponentId, newParentId: ComponentId, newIndex: number) => void;
  reorderChildren: (parentId: ComponentId, newOrder: ComponentId[]) => void;
  setComponentSpan: (
    id: ComponentId,
    span: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
  ) => void;
  setComponentDimension: (
    id: ComponentId,
    axis: "width" | "height",
    value: string | undefined,
  ) => void;
  setComponentDimensionWithCascade: (
    id: ComponentId,
    axis: "width" | "height",
    value: string,
  ) => void;
  // Phase 5 Task 5.4 — FlowGroup wrap (add new sibling) and wrap-move (drag existing node).
  wrapInFlowGroup: (
    targetId: ComponentId,
    newSibling: ComponentNode,
    side: "left" | "right",
  ) => void;
  wrapInFlowGroupMove: (
    draggedId: ComponentId,
    targetId: ComponentId,
    side: "left" | "right",
  ) => void;
  // Side-edge horizontal sibling actions (replaces FlowGroup wrap intent for drop handler).
  // Inserts new/dragged node as a sibling at the target's parent, sets both to width:50%.
  addSiblingHorizontal: (
    targetId: ComponentId,
    newSibling: ComponentNode,
    direction: "left" | "right",
  ) => void;
  addSiblingHorizontalMove: (
    draggedId: ComponentId,
    targetId: ComponentId,
    direction: "left" | "right",
  ) => void;
  markSaving: () => void;
  markSaved: (at: number) => void;
  markError: (message: string) => void;
  // Phase 6 Task 6.1 — toggle the canvas-wide component type overlay.
  toggleShowComponentTypes: () => void;
  // Sprint 13 — site-wide NavBar lock + per-instance override.
  setGlobalNavBarLocked: (value: boolean) => void;
  setNavBarOverrideShared: (id: ComponentId, value: boolean) => void;
  // Rich-text Phase 1.
  enterTextEditing: (id: ComponentId, propKey: string) => void;
  enterBroadcastTextEditing: (rootId: ComponentId, ids: ComponentId[]) => void;
  exitTextEditing: () => void;
};

export type EditorStore = EditorState & EditorActions;

export type EditorActionErrorCode =
  | "home_page_locked"
  | "slug_already_used"
  | "invalid_slug"
  | "invalid_name"
  | "missing_detail_data_source"
  | "page_not_found"
  | "out_of_bounds"
  | "component_not_found"
  | "page_root_locked"
  // Sprint 7 — drag-and-drop and resize error codes.
  | "invalid_drop_target"
  | "reorder_mismatch"
  | "invalid_resize_target";

export class EditorActionError extends Error {
  readonly code: EditorActionErrorCode;
  constructor(code: EditorActionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EditorActionError";
  }
}

export type { ComponentNode, Page, SiteConfig };
