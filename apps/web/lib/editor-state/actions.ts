import { canAcceptChild } from "@/components/editor/canvas/dnd/dropTargetPolicy";
import { newComponentId } from "@/lib/site-config";
import type {
  AnimationConfig,
  CanvasConfig,
  ComponentNode,
  ComponentPosition,
  DataBinding,
  Page,
  PageKind,
  SiteConfig,
  StyleConfig,
} from "@/lib/site-config";
import { type Operation, applyOperations } from "@/lib/site-config/ops";
import { findComponentById, findComponentParentId } from "./store";
import type {
  AddPageInput,
  ComponentId,
  ComponentVisibility,
  EditorActionErrorCode,
  RenamePageInput,
  ReorderPagesInput,
} from "./types";
import { EditorActionError } from "./types";

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MAX = 60;
const NAME_MAX = 100;
const HOME_SLUG = "home";

function fail(code: EditorActionErrorCode, message: string): never {
  throw new EditorActionError(code, message);
}

function validateSlug(slug: string): void {
  if (!slug || slug.length > SLUG_MAX) {
    fail("invalid_slug", `Slug must be 1-${SLUG_MAX} characters.`);
  }
  if (!SLUG_REGEX.test(slug)) {
    fail("invalid_slug", "Slug must contain only lowercase letters, digits, and hyphens.");
  }
}

function validateName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) fail("invalid_name", "Name is required.");
  if (trimmed.length > NAME_MAX)
    fail("invalid_name", `Name must be at most ${NAME_MAX} characters.`);
}

function makeEmptySection(): ComponentNode {
  return {
    id: newComponentId("cmp"),
    type: "Section",
    // New page roots start in flow mode (default `freePlacement: undefined`).
    // AI generation expects normal block layout — defaulting to free-placement
    // caused the AI to ship overlapping / mis-sized components because it
    // doesn't reason about absolute coordinates well. Users opt into free
    // placement per-section via the toggle in the Content tab once a layout
    // is in place; the toggle's snapshot captures the existing flow layout
    // so dragging stays smooth.
    props: {},
    style: {},
    children: [],
  };
}

function makeNewPage(input: AddPageInput): Page {
  return {
    id: newComponentId("p"),
    slug: input.slug,
    name: input.name.trim(),
    kind: input.kind,
    detailDataSource: input.kind === "detail" ? input.detailDataSource : undefined,
    rootComponent: makeEmptySection(),
  };
}

function clonePages(pages: Page[]): Page[] {
  // Shallow clone is fine here -- callers never mutate page interiors.
  return pages.slice();
}

export function applyAddPage(config: SiteConfig, input: AddPageInput): SiteConfig {
  validateName(input.name);
  validateSlug(input.slug);
  if (input.kind === "detail" && !input.detailDataSource) {
    fail(
      "missing_detail_data_source",
      "Detail pages must specify a data source (properties or units).",
    );
  }
  const conflict = config.pages.some((p) => p.kind === input.kind && p.slug === input.slug);
  if (conflict) {
    fail("slug_already_used", `Another ${input.kind} page already uses this slug.`);
  }
  return {
    ...config,
    pages: [...config.pages, makeNewPage(input)],
  };
}

export function applyRenamePage(config: SiteConfig, input: RenamePageInput): SiteConfig {
  validateName(input.name);
  validateSlug(input.slug);

  const targetIndex = config.pages.findIndex(
    (p) => p.kind === input.currentKind && p.slug === input.currentSlug,
  );
  if (targetIndex === -1) fail("page_not_found", "Page does not exist.");
  const target = config.pages[targetIndex];
  // noUncheckedIndexedAccess narrows; ensured by findIndex above.
  if (!target) fail("page_not_found", "Page does not exist.");

  const isHome = target.slug === HOME_SLUG;
  if (isHome && input.slug !== HOME_SLUG) {
    fail("home_page_locked", "The home page slug is fixed.");
  }

  if (input.slug !== target.slug) {
    const conflict = config.pages.some(
      (p, i) => i !== targetIndex && p.kind === target.kind && p.slug === input.slug,
    );
    if (conflict) {
      fail("slug_already_used", `Another ${target.kind} page already uses this slug.`);
    }
  }

  const nextPages = clonePages(config.pages);
  nextPages[targetIndex] = { ...target, name: input.name.trim(), slug: input.slug };
  return { ...config, pages: nextPages };
}

export function applyDeletePage(config: SiteConfig, slug: string, kind: PageKind): SiteConfig {
  if (slug === HOME_SLUG && kind === "static") {
    fail("home_page_locked", "The home page cannot be deleted.");
  }
  const idx = config.pages.findIndex((p) => p.slug === slug && p.kind === kind);
  if (idx === -1) fail("page_not_found", "Page does not exist.");
  const nextPages = clonePages(config.pages);
  nextPages.splice(idx, 1);
  return { ...config, pages: nextPages };
}

export function applyReorderPages(config: SiteConfig, input: ReorderPagesInput): SiteConfig {
  const idx = config.pages.findIndex((p) => p.slug === input.slug && p.kind === input.kind);
  if (idx === -1) fail("page_not_found", "Page does not exist.");
  const target = config.pages[idx];
  if (!target) fail("page_not_found", "Page does not exist.");

  const isHome = target.slug === HOME_SLUG && target.kind === "static";
  if (isHome) fail("home_page_locked", "The home page is locked at the top of the list.");

  const swapWith = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= config.pages.length) {
    fail("out_of_bounds", "Cannot move page beyond the list bounds.");
  }
  // The home page is always at position 0; never let another page swap into 0.
  if (swapWith === 0 && config.pages[0]?.slug === HOME_SLUG) {
    fail("home_page_locked", "The home page must remain at the top of the list.");
  }

  const nextPages = clonePages(config.pages);
  const tmp = nextPages[swapWith];
  if (!tmp) fail("out_of_bounds", "Cannot move page beyond the list bounds.");
  nextPages[swapWith] = target;
  nextPages[idx] = tmp;
  return { ...config, pages: nextPages };
}

export function applySetSiteName(config: SiteConfig, name: string): SiteConfig {
  const trimmed = name.trim().slice(0, NAME_MAX);
  return {
    ...config,
    meta: { ...config.meta, siteName: trimmed },
  };
}

export function applySetPalette(
  config: SiteConfig,
  paletteId: SiteConfig["brand"]["palette"],
): SiteConfig {
  return {
    ...config,
    brand: { ...config.brand, palette: paletteId },
  };
}

export function applySetFontFamily(config: SiteConfig, fontFamily: string): SiteConfig {
  return {
    ...config,
    brand: { ...config.brand, fontFamily },
  };
}

// Shallow-merges a partial canvas patch into `global.canvas`. Each input in
// the Site tab's Canvas section calls this with just the field it owns, so
// changing one control never clobbers another. Passing `undefined` for a key
// preserves the existing stored value (use a sentinel via `setSiteSetting` if
// a true "clear" is ever needed; resolveCanvas() then falls back to default).
export function applyMergeCanvasConfig(
  config: SiteConfig,
  patch: Partial<CanvasConfig>,
): SiteConfig {
  const current = config.global.canvas ?? {};
  const next: CanvasConfig = { ...current };
  for (const [key, value] of Object.entries(patch) as [keyof CanvasConfig, unknown][]) {
    if (value === undefined) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return {
    ...config,
    global: { ...config.global, canvas: next },
  };
}

// ---------------------------------------------------------------------------
// Component-level mutators (Sprint 8)
//
// All five rebuild the path from the page's rootComponent down to the
// modified node via depth-first walk + structural sharing. Sibling subtrees
// keep their object identity so the memoized ComponentRenderer skips
// re-rendering them.
// ---------------------------------------------------------------------------

type NodeMutator = (node: ComponentNode) => ComponentNode;

function mapNodeById(
  node: ComponentNode,
  id: ComponentId,
  transform: NodeMutator,
): { node: ComponentNode; found: boolean } {
  if (node.id === id) {
    return { node: transform(node), found: true };
  }
  if (!node.children || node.children.length === 0) {
    return { node, found: false };
  }
  let foundAt = -1;
  let updatedChild: ComponentNode | null = null;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const res = mapNodeById(child, id, transform);
    if (res.found) {
      foundAt = i;
      updatedChild = res.node;
      break;
    }
  }
  if (foundAt === -1 || updatedChild === null) {
    return { node, found: false };
  }
  const nextChildren = node.children.slice();
  nextChildren[foundAt] = updatedChild;
  return { node: { ...node, children: nextChildren }, found: true };
}

function applyMapToConfig(config: SiteConfig, id: ComponentId, transform: NodeMutator): SiteConfig {
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const res = mapNodeById(page.rootComponent, id, transform);
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  fail("component_not_found", `Component "${id}" not found in any page.`);
}

export function applySetComponentProps(
  config: SiteConfig,
  id: ComponentId,
  props: Record<string, unknown>,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => ({ ...node, props }));
}

export function applySetComponentStyle(
  config: SiteConfig,
  id: ComponentId,
  style: StyleConfig,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => ({ ...node, style }));
}

export function applySetComponentPosition(
  config: SiteConfig,
  id: ComponentId,
  position: ComponentPosition,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => ({
    ...node,
    position: { x: position.x, y: position.y },
  }));
}

export type SnapshotRect = { x: number; y: number; width: number; height: number };
export type SnapshotRects = Record<string, SnapshotRect>;

// Pure mutation: given a section id and a map of child-id → rect, write
// `position` onto each direct child whose rect was supplied. Width/height
// are populated from the rect only when `style.width`/`style.height` are
// unset, so explicit user-set sizes are preserved.
//
// `force=true` (Recapture from EditPanel) overwrites an existing position;
// without it, children that already have `position` set are skipped so the
// initial snapshot is idempotent across toggle on/off cycles.
export function applySnapshotChildPositions(
  config: SiteConfig,
  sectionId: ComponentId,
  rects: SnapshotRects,
  options: { force?: boolean } = {},
): SiteConfig {
  if (Object.keys(rects).length === 0) return config;
  const force = options.force === true;
  return applyMapToConfig(config, sectionId, (section) => {
    const children = section.children ?? [];
    let touched = false;
    const nextChildren = children.map((child) => {
      const rect = rects[child.id];
      if (rect === undefined) return child;
      if (!force && child.position !== undefined) return child;
      touched = true;
      const nextStyle = { ...child.style };
      if (nextStyle.width === undefined) nextStyle.width = `${Math.round(rect.width)}px`;
      if (nextStyle.height === undefined) nextStyle.height = `${Math.round(rect.height)}px`;
      return {
        ...child,
        position: { x: Math.round(rect.x), y: Math.round(rect.y) },
        style: nextStyle,
      };
    });
    if (!touched) return section;
    return { ...section, children: nextChildren };
  });
}

export function applySetComponentAnimation(
  config: SiteConfig,
  id: ComponentId,
  animation: AnimationConfig | undefined,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    if (animation === undefined) {
      const { animation: _omit, ...rest } = node;
      return rest;
    }
    return { ...node, animation };
  });
}

export function applySetComponentVisibility(
  config: SiteConfig,
  id: ComponentId,
  visibility: ComponentVisibility | undefined,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    if (visibility === undefined) {
      const { visibility: _omit, ...rest } = node;
      return rest;
    }
    return { ...node, visibility };
  });
}

// Sprint 9 — Repeater data binding mutator. Same depth-first walk +
// structural-sharing pattern as the other Sprint 8 component-level mutators
// (PROJECT_SPEC.md §11). Passing `undefined` removes the field entirely so
// configs round-trip cleanly through the schema.
export function applySetComponentDataBinding(
  config: SiteConfig,
  id: ComponentId,
  dataBinding: DataBinding | undefined,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    if (dataBinding === undefined) {
      const { dataBinding: _omit, ...rest } = node;
      return rest;
    }
    return { ...node, dataBinding };
  });
}

// Sprint 11 — folder for AI Edit Accept. Delegates to `applyOperations` from
// `@/lib/site-config/ops`, which is the single source of truth for diff
// semantics. The store-level wrapper catches OperationInvalidError and flips
// saveState to "error"; this helper itself is a thin passthrough so unit
// tests can exercise the fold without touching the store.
export function applyCommitAiEditOperations(
  config: SiteConfig,
  operations: readonly Operation[],
): SiteConfig {
  return applyOperations(config, operations);
}

function removeChildById(
  node: ComponentNode,
  id: ComponentId,
): { node: ComponentNode; found: boolean } {
  if (!node.children || node.children.length === 0) {
    return { node, found: false };
  }
  const directIdx = node.children.findIndex((c) => c.id === id);
  if (directIdx !== -1) {
    const nextChildren = node.children.slice();
    nextChildren.splice(directIdx, 1);
    return { node: { ...node, children: nextChildren }, found: true };
  }
  let foundAt = -1;
  let updatedChild: ComponentNode | null = null;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const res = removeChildById(child, id);
    if (res.found) {
      foundAt = i;
      updatedChild = res.node;
      break;
    }
  }
  if (foundAt === -1 || updatedChild === null) {
    return { node, found: false };
  }
  const nextChildren = node.children.slice();
  nextChildren[foundAt] = updatedChild;
  return { node: { ...node, children: nextChildren }, found: true };
}

export function applyRemoveComponent(config: SiteConfig, id: ComponentId): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === id) {
      fail(
        "page_root_locked",
        "The page root cannot be deleted; switch to the Pages tab to delete the page itself.",
      );
    }
  }
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const res = removeChildById(page.rootComponent, id);
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return dissolveStaleFlowGroups({ ...config, pages: nextPages });
  }
  fail("component_not_found", `Component "${id}" not found in any page.`);
}

// ---------------------------------------------------------------------------
// Sprint 7 -- drag-and-drop and resize tree mutators
//
// Same depth-first walk + structural-sharing pattern as the Sprint 8
// component-level mutators. Children policy is checked here against the
// component registry (the single source of truth — Sprint 7 CLAUDE.md
// forbids duplicating the policy outside the registry meta).
// `dropTargetPolicy.ts` exposes the same `canAcceptChild` for UI consumers
// (DropZoneIndicator, DndCanvasProvider) so Sprint 7's two call sites
// stay aligned via the registry.
// ---------------------------------------------------------------------------

function findNodeById(node: ComponentNode, id: ComponentId): ComponentNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function findNodeAcrossPages(config: SiteConfig, id: ComponentId): ComponentNode | null {
  for (const page of config.pages) {
    const found = findNodeById(page.rootComponent, id);
    if (found) return found;
  }
  return null;
}

function isInSubtree(root: ComponentNode, id: ComponentId): boolean {
  if (root.id === id) return true;
  for (const child of root.children ?? []) {
    if (isInSubtree(child, id)) return true;
  }
  return false;
}

// Free-placement helpers. A Section is in free-placement mode when its
// `props.freePlacement === true` (or the legacy `fitToContents === true`).
// The default-position helper places a new child at (0, lowest existing
// child's bottom + 16) so AI / palette inserts append below the visual
// stack without overlapping existing content.
function isFreePlacementSection(node: ComponentNode): boolean {
  if (node.type !== "Section") return false;
  const props = node.props as { freePlacement?: unknown; fitToContents?: unknown };
  return props.freePlacement === true || props.fitToContents === true;
}

function defaultFreePlacementPositionFor(parent: ComponentNode): ComponentPosition {
  let lowest = 0;
  for (const c of parent.children ?? []) {
    const y = c.position?.y ?? 0;
    const hStr = c.style?.height;
    const h = typeof hStr === "string" ? Number.parseFloat(hStr) : 0;
    const bottom = y + (Number.isFinite(h) ? h : 0);
    if (bottom > lowest) lowest = bottom;
  }
  return { x: 0, y: lowest > 0 ? Math.round(lowest) + 16 : 0 };
}

export function applyAddComponentChild(
  config: SiteConfig,
  parentId: ComponentId,
  index: number,
  node: ComponentNode,
): SiteConfig {
  return applyMapToConfig(config, parentId, (parent) => {
    if (!canAcceptChild(parent, node.type)) {
      fail(
        "invalid_drop_target",
        `Component "${parent.type}" cannot accept a child of type "${node.type}".`,
      );
    }
    const childToInsert: ComponentNode =
      isFreePlacementSection(parent) && node.position === undefined
        ? { ...node, position: defaultFreePlacementPositionFor(parent) }
        : node;
    const children = (parent.children ?? []).slice();
    const safeIndex = Math.max(0, Math.min(index, children.length));
    children.splice(safeIndex, 0, childToInsert);
    return { ...parent, children };
  });
}

export function applyMoveComponent(
  config: SiteConfig,
  targetId: ComponentId,
  newParentId: ComponentId,
  newIndex: number,
): SiteConfig {
  // Page-root nodes are not movable.
  for (const page of config.pages) {
    if (page.rootComponent.id === targetId) {
      fail("page_root_locked", "The page root cannot be moved.");
    }
  }
  const target = findNodeAcrossPages(config, targetId);
  if (!target) fail("component_not_found", `Component "${targetId}" not found in any page.`);

  const newParent = findNodeAcrossPages(config, newParentId);
  if (!newParent) {
    fail("component_not_found", `Component "${newParentId}" not found in any page.`);
  }

  // A node cannot be moved into itself or any of its own descendants.
  if (isInSubtree(target, newParentId)) {
    fail("invalid_drop_target", "Cannot move a component into one of its own descendants.");
  }

  if (!canAcceptChild(newParent, target.type)) {
    fail(
      "invalid_drop_target",
      `Component "${newParent.type}" cannot accept a child of type "${target.type}".`,
    );
  }

  // Remove from current location, then re-insert under the new parent at
  // the requested index. Children policy was already validated above.
  // applyRemoveComponent already runs dissolveStaleFlowGroups; wrapping the
  // final result here handles any FlowGroup left stale by the re-insert step.
  const removed = applyRemoveComponent(config, targetId);
  return dissolveStaleFlowGroups(applyAddComponentChild(removed, newParentId, newIndex, target));
}

export function applyReorderChildren(
  config: SiteConfig,
  parentId: ComponentId,
  newOrder: ComponentId[],
): SiteConfig {
  return applyMapToConfig(config, parentId, (parent) => {
    const currentChildren = parent.children ?? [];
    const currentIds = currentChildren.map((c) => c.id);
    if (newOrder.length !== currentIds.length) {
      fail(
        "reorder_mismatch",
        `Reorder list length ${newOrder.length} does not match current children length ${currentIds.length}.`,
      );
    }
    const currentSet = new Set(currentIds);
    const seen = new Set<ComponentId>();
    for (const id of newOrder) {
      if (!currentSet.has(id)) {
        fail("reorder_mismatch", `Reorder list contains unknown id "${id}".`);
      }
      if (seen.has(id)) {
        fail("reorder_mismatch", `Reorder list contains duplicate id "${id}".`);
      }
      seen.add(id);
    }
    const lookup = new Map<ComponentId, ComponentNode>();
    for (const child of currentChildren) lookup.set(child.id, child);
    const reordered = newOrder.map((id) => {
      const child = lookup.get(id);
      // Already validated above; this branch is unreachable.
      if (!child) fail("reorder_mismatch", `Child id "${id}" missing.`);
      return child;
    });
    return { ...parent, children: reordered };
  });
}

export function applySetComponentSpan(
  config: SiteConfig,
  id: ComponentId,
  span: number,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    if (node.type !== "Column") {
      fail(
        "invalid_resize_target",
        `setComponentSpan can only target Column components; got "${node.type}".`,
      );
    }
    return { ...node, props: { ...node.props, span } };
  });
}

export function applySetComponentDimension(
  config: SiteConfig,
  id: ComponentId,
  axis: "width" | "height",
  value: string | undefined,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    if (node.type === "Spacer") {
      fail(
        "invalid_resize_target",
        "Spacer height belongs in props, not style. Use setComponentProps instead.",
      );
    }
    const nextStyle: StyleConfig = { ...node.style, [axis]: value };
    return { ...node, style: nextStyle };
  });
}

// ---------------------------------------------------------------------------
// Phase 3 Task 3.1 -- read helper for x-axis resize drag math
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Phase 3 Task 3.2 -- cascade write helper for x-axis resize
// ---------------------------------------------------------------------------

function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d+(?:\.\d+)?)\s*px$/);
  return m?.[1] ? Number.parseFloat(m[1]) : null;
}

// Walks the direct children of `node` and clamps any px-width child that now
// overflows the new parent boundary. Only direct children are touched: deeper
// descendants are containers whose percent widths re-flow via CSS naturally.
function clampChildWidthsToPx(node: ComponentNode, parentPx: number): ComponentNode {
  if (!node.children || node.children.length === 0) return node;
  const nextChildren = node.children.map((child) => {
    const childPx = parsePx(child.style.width);
    if (childPx !== null && childPx > parentPx) {
      return { ...child, style: { ...child.style, width: `${parentPx}px` } };
    }
    return child;
  });
  return { ...node, children: nextChildren };
}

export function applyResizeWithCascade(
  config: SiteConfig,
  id: ComponentId,
  axis: "width" | "height",
  value: string,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    // Spacer dimensions live in props, not style — same guard as applySetComponentDimension.
    if (node.type === "Spacer") {
      fail(
        "invalid_resize_target",
        "Spacer height belongs in props, not style. Use setComponentProps instead.",
      );
    }
    const next: ComponentNode = { ...node, style: { ...node.style, [axis]: value } };
    if (axis !== "width") return next;
    const newPx = parsePx(value);
    // % parent — children's percent widths re-flow via CSS, no JSON clamping needed.
    if (newPx === null) return next;
    return clampChildWidthsToPx(next, newPx);
  });
}

function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d+(?:\.\d+)?)\s*%$/);
  return m?.[1] ? Number.parseFloat(m[1]) : null;
}

export function getMaxAllowedDimension(
  config: SiteConfig,
  id: ComponentId,
  axis: "width" | "height",
): number | null {
  for (const page of config.pages) {
    const parentId = findComponentParentId(page.rootComponent, id);
    if (!parentId) continue;
    const parent = findComponentById(page.rootComponent, parentId);
    if (!parent) continue;
    const siblings = (parent.children ?? []).filter((c) => c.id !== id);
    if (axis === "width") {
      // Sibling % widths consume parent headroom. Siblings without an
      // explicit width count as 0% (they reflow naturally to fill what's
      // left). Returns remaining headroom clamped to 0..100.
      let used = 0;
      for (const s of siblings) {
        const p = parsePercent(s.style.width);
        if (p !== null) used += p;
      }
      return Math.max(0, Math.min(100, 100 - used));
    }
    // Height is not bounded by sibling stack in current spec — return null.
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Phase 5 Task 5.2 -- FlowGroup wrap/dissolve helpers
//
// FlowGroups are horizontal sibling containers created on-the-fly when the
// user drops a component to the left or right of an existing sibling. These
// two helpers are the only write path for FlowGroup lifecycle so invariants
// are maintained in one place.
// ---------------------------------------------------------------------------

// Wraps `targetId` and `newSibling` in a fresh FlowGroup at the target's
// current parent + index. If the target's parent IS already a FlowGroup,
// inserts the new sibling at index ±1 of the target instead of double-
// wrapping. Side "left" places the new sibling BEFORE the target; "right"
// places it AFTER. Top/bottom are not handled here — those are vertical
// drops routed to applyAddComponentChild by the caller.
export function applyWrapInFlowGroup(
  config: SiteConfig,
  targetId: ComponentId,
  newSibling: ComponentNode,
  side: "left" | "right" | "top" | "bottom",
): SiteConfig {
  if (side === "top" || side === "bottom") {
    fail("invalid_drop_target", "applyWrapInFlowGroup only handles horizontal sides (left/right).");
  }
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const parentId = findComponentParentId(page.rootComponent, targetId);
    if (!parentId) continue;
    const res = mapNodeById(page.rootComponent, parentId, (parent) => {
      const children = (parent.children ?? []).slice();
      const idx = children.findIndex((c) => c.id === targetId);
      if (idx < 0) return parent;
      const target = children[idx];
      if (!target) return parent;
      // If the parent is ALREADY a FlowGroup, just insert as a sibling to
      // avoid nesting FlowGroups inside FlowGroups.
      if (parent.type === "FlowGroup") {
        const insertAt = side === "right" ? idx + 1 : idx;
        children.splice(insertAt, 0, newSibling);
        return { ...parent, children };
      }
      // Otherwise wrap the target + new sibling in a fresh FlowGroup that
      // occupies the target's former slot in the parent.
      const fg: ComponentNode = {
        id: newComponentId("cmp"),
        type: "FlowGroup",
        props: {},
        style: {},
        children: side === "right" ? [target, newSibling] : [newSibling, target],
      };
      children.splice(idx, 1, fg);
      return { ...parent, children };
    });
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  fail("component_not_found", `Component "${targetId}" not found in any page.`);
}

// Single-step "remove dragged node from its current parent, then wrap it
// with `targetId` in a FlowGroup on the given side." Implemented as a
// composition of `applyRemoveComponent` + `applyWrapInFlowGroup` so the
// caller gets one undo entry (single store transition) for what is
// logically one user action (drag onto a side overlay).
export function applyWrapInFlowGroupMove(
  config: SiteConfig,
  draggedId: ComponentId,
  targetId: ComponentId,
  side: "left" | "right",
): SiteConfig {
  // Locate the dragged node BEFORE removing it (we need its full subtree).
  const draggedNode = findNodeAcrossPages(config, draggedId);
  if (!draggedNode) {
    fail("component_not_found", `Component "${draggedId}" not found in any page.`);
  }
  const removed = applyRemoveComponent(config, draggedId);
  return applyWrapInFlowGroup(removed, targetId, draggedNode, side);
}

// ---------------------------------------------------------------------------
// Side-edge horizontal sibling helpers (replaces FlowGroup wrap intent)
//
// Drop on left/right side of a component inserts the new sibling at the
// target's parent's children list and sets BOTH the target and new sibling
// to width:50%. Section's flex-row-wrap layout (shipped earlier) makes them
// sit side-by-side automatically. Top/bottom drops continue to use
// applyAddComponentChild / applyMoveComponent directly from the provider.
// ---------------------------------------------------------------------------

// Inserts `newSibling` as a sibling of `targetId` at `targetId`'s parent
// at the given direction's index, AND sets both targetId and newSibling
// to `width: 50%`. Single store transition so undo is one step.
//
// `direction` is the side-edge drop direction: "left" places the new
// sibling BEFORE the target; "right" places it AFTER. (Top/bottom go
// through applyAddComponentChild instead — no width change.)
export function applyAddSiblingHorizontal(
  config: SiteConfig,
  targetId: ComponentId,
  newSibling: ComponentNode,
  direction: "left" | "right",
): SiteConfig {
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const parentId = findComponentParentId(page.rootComponent, targetId);
    if (!parentId) continue;
    const res = mapNodeById(page.rootComponent, parentId, (parent) => {
      const children = (parent.children ?? []).slice();
      const idx = children.findIndex((c) => c.id === targetId);
      if (idx < 0) return parent;
      const target = children[idx];
      if (!target) return parent;
      const sizedTarget: ComponentNode = {
        ...target,
        style: { ...target.style, width: "50%" },
      };
      const sizedNewSibling: ComponentNode = {
        ...newSibling,
        style: { ...newSibling.style, width: "50%" },
      };
      // Replace target with width-updated version first, then insert new sibling.
      children.splice(idx, 1, sizedTarget);
      const insertAt = direction === "right" ? idx + 1 : idx;
      children.splice(insertAt, 0, sizedNewSibling);
      return { ...parent, children };
    });
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  fail("component_not_found", `Component "${targetId}" not found in any page.`);
}

// Variant for moving an EXISTING node onto a side overlay (single undo step).
// Removes `draggedId` from its current parent first, then runs the same
// "insert sibling + set both widths to 50%" mutation against the target.
export function applyAddSiblingHorizontalMove(
  config: SiteConfig,
  draggedId: ComponentId,
  targetId: ComponentId,
  direction: "left" | "right",
): SiteConfig {
  const draggedNode = findNodeAcrossPages(config, draggedId);
  if (!draggedNode) {
    fail("component_not_found", `Component "${draggedId}" not found in any page.`);
  }
  const removed = applyRemoveComponent(config, draggedId);
  return applyAddSiblingHorizontal(removed, targetId, draggedNode, direction);
}

// After any tree mutation that could leave a FlowGroup with <=1 children,
// walk every page's tree and dissolve those wrappers in one pass. Iterates
// because dissolving one FlowGroup could leave its parent (also a FlowGroup,
// in nested cases) eligible for dissolution.
function dissolveStaleFlowGroups(config: SiteConfig): SiteConfig {
  let cur = config;
  let changed = true;
  while (changed) {
    changed = false;
    for (const page of cur.pages) {
      const stale: string[] = [];
      function walk(n: ComponentNode): void {
        if (n.type === "FlowGroup" && (n.children?.length ?? 0) <= 1) {
          stale.push(n.id);
        }
        for (const c of n.children ?? []) walk(c);
      }
      walk(page.rootComponent);
      for (const id of stale) {
        const before = cur;
        cur = applyDissolveFlowGroup(cur, id);
        if (cur !== before) changed = true;
      }
    }
  }
  return cur;
}

// If `flowGroupId` resolves to a FlowGroup with ≤1 children, removes the
// wrapper and reparents the survivor (if any) to the wrapper's parent at
// the wrapper's index. Returns the input unchanged when the FlowGroup has
// >1 children, isn't a FlowGroup, or doesn't exist — callers can use
// reference equality to detect "no work done" (structural sharing).
export function applyDissolveFlowGroup(config: SiteConfig, flowGroupId: ComponentId): SiteConfig {
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const fg = findComponentById(page.rootComponent, flowGroupId);
    // Only act on FlowGroups with ≤1 child — anything else is a no-op.
    if (!fg || fg.type !== "FlowGroup") continue;
    if ((fg.children?.length ?? 0) > 1) return config;
    const survivor = fg.children?.[0];
    const parentId = findComponentParentId(page.rootComponent, flowGroupId);
    // FlowGroup is the page root — shouldn't happen, but be defensive.
    if (!parentId) continue;
    const res = mapNodeById(page.rootComponent, parentId, (parent) => {
      const children = (parent.children ?? []).slice();
      const idx = children.findIndex((c) => c.id === flowGroupId);
      if (idx < 0) return parent;
      if (survivor) {
        // Reparent the single surviving child into the FlowGroup's slot.
        children.splice(idx, 1, survivor);
      } else {
        // Empty FlowGroup — just remove the wrapper entirely.
        children.splice(idx, 1);
      }
      return { ...parent, children };
    });
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  // FlowGroup not found in any page — no-op, preserve reference.
  return config;
}
