import { newComponentId } from "@/lib/site-config";
import type {
  AnimationConfig,
  ComponentNode,
  Page,
  PageKind,
  SiteConfig,
  StyleConfig,
} from "@/lib/site-config";
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
    return { ...config, pages: nextPages };
  }
  fail("component_not_found", `Component "${id}" not found in any page.`);
}
