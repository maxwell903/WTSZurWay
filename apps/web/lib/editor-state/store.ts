import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import {
  OperationInvalidError,
  applyGlobalNavBarLocked,
  buildAutoPopulatedNavLinks,
  findLockedNavBar,
  isFirstNavBar,
  isGlobalNavBarLocked,
  syncLockedNavBars,
} from "@/lib/site-config/ops";
import { type StateCreator, create } from "zustand";
import {
  applyAddComponentChild,
  applyAddPage,
  applyAddSiblingHorizontal,
  applyAddSiblingHorizontalMove,
  applyCommitAiEditOperations,
  applyDeletePage,
  applyMoveComponent,
  applyRemoveComponent,
  applyRenamePage,
  applyReorderChildren,
  applyReorderPages,
  applyResizeWithCascade,
  applySetComponentAnimation,
  applySetComponentDataBinding,
  applySetComponentDimension,
  applySetComponentProps,
  applySetComponentSpan,
  applySetComponentStyle,
  applySetComponentVisibility,
  applySetFontFamily,
  applySetPalette,
  applySetSiteName,
  applyWrapInFlowGroup,
  applyWrapInFlowGroupMove,
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

const creator: StateCreator<EditorStore> = (set) => ({
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
  leftSidebarMode: "primary",
  elementEditTab: "content",
  saveState: "idle",
  lastSavedAt: null,
  saveError: null,
  // Phase 6 Task 6.1 — transient; defaults ON each editor load (no persistence).
  showComponentTypes: true,

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
      leftSidebarMode: "primary",
      elementEditTab: "content",
      saveState: "idle",
      lastSavedAt: null,
      saveError: null,
    }),

  selectComponent: (id) => set({ selectedComponentId: id }),
  setHoveredComponent: (id) => set({ hoveredComponentId: id }),
  setCurrentPageSlug: (slug) =>
    set({
      currentPageSlug: slug,
      selectedComponentId: null,
      hoveredComponentId: null,
      leftSidebarMode: "primary",
      elementEditTab: "content",
    }),
  setPreviewMode: (preview) =>
    set(
      preview
        ? {
            previewMode: true,
            selectedComponentId: null,
            leftSidebarMode: "primary",
            elementEditTab: "content",
          }
        : { previewMode: false },
    ),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),

  enterElementEditMode: (id) =>
    set({
      selectedComponentId: id,
      leftSidebarMode: "element-edit",
      elementEditTab: "content",
    }),
  exitElementEditMode: () =>
    set({
      selectedComponentId: null,
      leftSidebarMode: "primary",
      elementEditTab: "content",
    }),
  setElementEditTab: (tab) => set({ elementEditTab: tab }),

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

  setComponentProps: (id, props) =>
    set((state) => ({
      draftConfig: syncLockedNavBars(applySetComponentProps(state.draftConfig, id, props), id),
      saveState: "dirty",
    })),

  setComponentStyle: (id, style) =>
    set((state) => ({
      draftConfig: syncLockedNavBars(applySetComponentStyle(state.draftConfig, id, style), id),
      saveState: "dirty",
    })),

  setComponentAnimation: (id, animation) =>
    set((state) => ({
      draftConfig: syncLockedNavBars(
        applySetComponentAnimation(state.draftConfig, id, animation),
        id,
      ),
      saveState: "dirty",
    })),

  setComponentVisibility: (id, visibility) =>
    set((state) => ({
      draftConfig: applySetComponentVisibility(state.draftConfig, id, visibility),
      saveState: "dirty",
    })),

  // Sprint 9 — see DECISIONS.md "2026-04-26 — Sprint 9 — `setComponentDataBinding` wire-up touches store.ts".
  setComponentDataBinding: (id, dataBinding) =>
    set((state) => ({
      draftConfig: applySetComponentDataBinding(state.draftConfig, id, dataBinding),
      saveState: "dirty",
    })),

  // Sprint 11 — AI Edit Accept folds the proposed Operation[] into the
  // working draftConfig. OperationInvalidError surfaces via saveError +
  // saveState: "error" so the chat can show a §9.6-shaped message.
  commitAiEditOperations: (operations) =>
    set((state) => {
      try {
        const next = applyCommitAiEditOperations(state.draftConfig, operations);
        return { draftConfig: next, saveState: "dirty", saveError: null };
      } catch (e) {
        const message =
          e instanceof OperationInvalidError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to apply AI Edit operations.";
        return { saveState: "error", saveError: message };
      }
    }),

  removeComponent: (id) =>
    set((state) => {
      const next = applyRemoveComponent(state.draftConfig, id);
      const wasSelected = state.selectedComponentId === id;
      return {
        draftConfig: next,
        selectedComponentId: wasSelected ? null : state.selectedComponentId,
        saveState: "dirty",
      };
    }),

  // -------- Sprint 7: drag-and-drop and resize --------
  addComponentChild: (parentId, index, node) =>
    set((state) => {
      // NavBar insertion logic (Sprint 13):
      //   1. The first NavBar in the site has its `links` auto-populated
      //      with one "page" entry per static page.
      //   2. Any subsequent NavBar dropped while the site-wide lock is on
      //      adopts the existing locked NavBar's props/style/animation so
      //      it appears identical out of the gate.
      //   3. With the lock off (or no existing locked NavBar), the node
      //      is inserted unchanged.
      let nodeToInsert = node;
      if (node.type === "NavBar") {
        if (isFirstNavBar(state.draftConfig)) {
          nodeToInsert = {
            ...node,
            props: {
              ...node.props,
              links: buildAutoPopulatedNavLinks(state.draftConfig),
              overrideShared: false,
            },
          };
        } else if (isGlobalNavBarLocked(state.draftConfig)) {
          const source = findLockedNavBar(state.draftConfig, node.id);
          if (source) {
            nodeToInsert = {
              ...node,
              props: { ...source.props, overrideShared: false },
              style: source.style,
              animation: source.animation,
            };
          }
        }
      }
      const next = applyAddComponentChild(state.draftConfig, parentId, index, nodeToInsert);
      // The new node becomes the selection so the user immediately sees
      // what they dropped (Sprint 7 CLAUDE.md DoD).
      return {
        draftConfig: next,
        selectedComponentId: nodeToInsert.id,
        saveState: "dirty",
      };
    }),

  moveComponent: (targetId, newParentId, newIndex) =>
    set((state) => {
      const next = applyMoveComponent(state.draftConfig, targetId, newParentId, newIndex);
      // The moved node retains its id; selectedComponentId naturally
      // persists when it pointed at the moved node.
      return {
        draftConfig: next,
        saveState: "dirty",
      };
    }),

  reorderChildren: (parentId, newOrder) =>
    set((state) => ({
      draftConfig: applyReorderChildren(state.draftConfig, parentId, newOrder),
      saveState: "dirty",
    })),

  setComponentSpan: (id, span) =>
    set((state) => ({
      draftConfig: applySetComponentSpan(state.draftConfig, id, span),
      saveState: "dirty",
    })),

  setComponentDimension: (id, axis, value) =>
    set((state) => ({
      draftConfig: syncLockedNavBars(
        applySetComponentDimension(state.draftConfig, id, axis, value),
        id,
      ),
      saveState: "dirty",
    })),

  setComponentDimensionWithCascade: (id, axis, value) =>
    set((state) => ({
      draftConfig: syncLockedNavBars(
        applyResizeWithCascade(state.draftConfig, id, axis, value),
        id,
      ),
      saveState: "dirty",
    })),

  // Phase 5 Task 5.4 — wrap a new sibling next to an existing target in a FlowGroup.
  // Selects the new sibling so the user immediately sees what they placed.
  wrapInFlowGroup: (targetId, newSibling, side) =>
    set((state) => ({
      draftConfig: applyWrapInFlowGroup(state.draftConfig, targetId, newSibling, side),
      selectedComponentId: newSibling.id,
      saveState: "dirty",
    })),

  // Phase 5 Task 5.4 — move an existing dragged node to a FlowGroup position next to target.
  // Does not change selection (the dragged node was already selected before the drag).
  wrapInFlowGroupMove: (draggedId, targetId, side) =>
    set((state) => ({
      draftConfig: applyWrapInFlowGroupMove(state.draftConfig, draggedId, targetId, side),
      saveState: "dirty",
    })),

  // Side-edge horizontal sibling actions (replaces FlowGroup wrap for drop handler).
  // Selects the new sibling so the user immediately sees what they dropped.
  addSiblingHorizontal: (targetId, newSibling, direction) =>
    set((state) => ({
      draftConfig: applyAddSiblingHorizontal(state.draftConfig, targetId, newSibling, direction),
      selectedComponentId: newSibling.id,
      saveState: "dirty",
    })),

  // Does not change selection (the dragged node was already selected before the drag).
  addSiblingHorizontalMove: (draggedId, targetId, direction) =>
    set((state) => ({
      draftConfig: applyAddSiblingHorizontalMove(state.draftConfig, draggedId, targetId, direction),
      saveState: "dirty",
    })),

  // Phase 6 Task 6.1 — flip the canvas-wide component type overlay (transient, not persisted).
  toggleShowComponentTypes: () =>
    set((state) => ({ showComponentTypes: !state.showComponentTypes })),

  // Sprint 13 — site-wide NavBar lock. When flipping ON, the helper picks a
  // canonical NavBar and replicates its content/style to every other NavBar
  // not in override mode so they all align immediately.
  setGlobalNavBarLocked: (value) =>
    set((state) => ({
      draftConfig: applyGlobalNavBarLocked(state.draftConfig, value),
      saveState: "dirty",
    })),

  // Sprint 13 — per-NavBar override toggle.
  //   value=true : the NavBar opts out of the locked group; future edits to
  //                other locked NavBars no longer affect it.
  //   value=false: the NavBar rejoins the locked group. If another locked
  //                NavBar exists, this node adopts that source's
  //                props/style/animation so it lines up immediately;
  //                otherwise it stays as-is and becomes the new canonical.
  setNavBarOverrideShared: (id, value) =>
    set((state) => {
      const config = state.draftConfig;
      // Locate the target so we can preserve its existing props alongside
      // the new flag (otherwise applySetComponentProps would clobber them).
      let target: ComponentNode | null = null;
      for (const page of config.pages) {
        target = findComponentById(page.rootComponent, id);
        if (target) break;
      }
      if (!target) return {};
      let next = applySetComponentProps(config, id, { ...target.props, overrideShared: value });
      if (value === false && isGlobalNavBarLocked(next)) {
        const source = findLockedNavBar(next, id);
        if (source) {
          next = applySetComponentProps(next, id, { ...source.props, overrideShared: false });
          next = applySetComponentStyle(next, id, source.style);
          next = applySetComponentAnimation(next, id, source.animation);
        }
      }
      return { draftConfig: next, saveState: "dirty" };
    }),
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
    leftSidebarMode: "primary",
    elementEditTab: "content",
    saveState: "idle",
    lastSavedAt: null,
    saveError: null,
    showComponentTypes: true,
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

export function findComponentParentId(root: ComponentNode | undefined, id: string): string | null {
  if (!root || !root.children) return null;
  for (const child of root.children) {
    if (child.id === id) return root.id;
    const deeper = findComponentParentId(child, id);
    if (deeper !== null) return deeper;
  }
  return null;
}
