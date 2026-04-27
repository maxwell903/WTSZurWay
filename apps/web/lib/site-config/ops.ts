/**
 * Operations vocabulary for the AI Edit surface (PROJECT_SPEC.md §9.4 +
 * §8.12). Each Operation is a pure (config, op) -> config' transformation;
 * `applyOperation` dispatches by `type`, `applyOperations` is a strict left
 * fold that throws on the first invalid op without partial application.
 *
 * Sprint 11 implements every op listed in `docs/planning/Claude.md`'s
 * "Operations vocabulary" subsection -- 14 Tier-1 + 8 Tier-2 + 3 §8.12
 * additions, 25 in total. The discriminated union `Operation` and the
 * accompanying Zod schema `operationSchema` are the single source of truth;
 * the route handler validates request bodies through `operationSchema`, and
 * the orchestrator's runtime parser uses the same schema.
 *
 * `OperationInvalidError` carries the offending op's `id` (when present) and
 * a plain-English reason. The endpoint catches the throw and surfaces it as
 * `AiError.kind === "operation_invalid"` per §9.6.
 */

import { canAcceptChild } from "@/components/editor/canvas/dnd/dropTargetPolicy";
import type { PaletteId } from "@/lib/setup-form/types";
import {
  ANIMATION_PRESETS,
  type AnimationConfig,
  type ComponentNode,
  type ComponentType,
  type DataBinding,
  type NavLink,
  type Page,
  type PageKind,
  type SiteConfig,
  type StyleConfig,
  componentNodeSchema,
  componentTypeSchema,
  newComponentId,
  pageKindSchema,
  paletteIdSchema,
  styleConfigSchema,
} from "@/lib/site-config";
import {
  DATA_BINDING_SOURCES,
  type DataBindingSource,
  type FilterRuleGroup,
  type SortSpec,
  filterRuleGroupSchema,
  sortSpecSchema,
} from "@/lib/site-config/data-binding/types";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export type OperationId = string;

export class OperationInvalidError extends Error {
  readonly opType: string;
  readonly opId: OperationId | undefined;

  constructor(opType: string, reason: string, opId?: OperationId) {
    const idSuffix = opId ? ` [op id: ${opId}]` : "";
    super(`${opType}: ${reason}${idSuffix}`);
    this.name = "OperationInvalidError";
    this.opType = opType;
    this.opId = opId;
  }
}

// ---------------------------------------------------------------------------
// Operation discriminated union (TS types)
// ---------------------------------------------------------------------------

type ComponentId = string;

type OpBase = { id?: OperationId };

export type AddComponentOp = OpBase & {
  type: "addComponent";
  parentId: ComponentId;
  index: number;
  component: ComponentNode;
};

export type RemoveComponentOp = OpBase & {
  type: "removeComponent";
  targetId: ComponentId;
};

export type MoveComponentOp = OpBase & {
  type: "moveComponent";
  targetId: ComponentId;
  newParentId: ComponentId;
  newIndex: number;
};

export type SetPropOp = OpBase & {
  type: "setProp";
  targetId: ComponentId;
  propPath: string;
  value: unknown;
};

export type SetStyleOp = OpBase & {
  type: "setStyle";
  targetId: ComponentId;
  stylePath: string;
  value: unknown;
};

export type SetAnimationOp = OpBase & {
  type: "setAnimation";
  targetId: ComponentId;
  on: "enter" | "hover";
  preset: string;
  duration?: number;
  delay?: number;
};

export type SetVisibilityOp = OpBase & {
  type: "setVisibility";
  targetId: ComponentId;
  visibility: "always" | "desktop" | "mobile";
};

export type SetTextOp = OpBase & {
  type: "setText";
  targetId: ComponentId;
  text: string;
};

export type BindRMFieldOp = OpBase & {
  type: "bindRMField";
  targetId: ComponentId;
  propPath: string;
  fieldExpression: string;
};

export type AddPageOp = OpBase & {
  type: "addPage";
  name: string;
  slug: string;
  atIndex?: number;
  fromTemplate?: string;
};

export type RemovePageOp = OpBase & {
  type: "removePage";
  slug: string;
  kind?: PageKind;
};

export type RenamePageOp = OpBase & {
  type: "renamePage";
  slug: string;
  kind?: PageKind;
  newName: string;
  newSlug?: string;
};

export type SetSiteSettingOp = OpBase & {
  type: "setSiteSetting";
  path: string;
  value: unknown;
};

export type SetPaletteOp = OpBase & {
  type: "setPalette";
  palette: PaletteId;
};

export type SetLinkModeOp = OpBase & {
  type: "setLinkMode";
  componentId: ComponentId;
  value: "static" | "detail";
};

export type SetDetailPageSlugOp = OpBase & {
  type: "setDetailPageSlug";
  componentId: ComponentId;
  value: string;
};

export type SetQueryParamDefaultOp = OpBase & {
  type: "setQueryParamDefault";
  componentId: ComponentId;
  value: string | null;
};

export type DuplicateComponentOp = OpBase & {
  type: "duplicateComponent";
  targetId: ComponentId;
};

export type WrapComponentOp = OpBase & {
  type: "wrapComponent";
  targetId: ComponentId;
  wrapper: {
    type: ComponentType;
    props?: Record<string, unknown>;
    style?: StyleConfig;
  };
};

export type UnwrapComponentOp = OpBase & {
  type: "unwrapComponent";
  targetId: ComponentId;
};

export type ReorderChildrenOp = OpBase & {
  type: "reorderChildren";
  parentId: ComponentId;
  newOrder: ComponentId[];
};

export type SetRepeaterDataSourceOp = OpBase & {
  type: "setRepeaterDataSource";
  targetId: ComponentId;
  dataSource: DataBindingSource;
};

export type SetRepeaterFiltersOp = OpBase & {
  type: "setRepeaterFilters";
  targetId: ComponentId;
  query: FilterRuleGroup;
};

export type SetRepeaterSortOp = OpBase & {
  type: "setRepeaterSort";
  targetId: ComponentId;
  sort: SortSpec;
};

export type ConnectInputToRepeaterOp = OpBase & {
  type: "connectInputToRepeater";
  inputId: ComponentId;
  repeaterId: ComponentId;
  field: string;
  operator: string;
};

export type Operation =
  | AddComponentOp
  | RemoveComponentOp
  | MoveComponentOp
  | SetPropOp
  | SetStyleOp
  | SetAnimationOp
  | SetVisibilityOp
  | SetTextOp
  | BindRMFieldOp
  | AddPageOp
  | RemovePageOp
  | RenamePageOp
  | SetSiteSettingOp
  | SetPaletteOp
  | SetLinkModeOp
  | SetDetailPageSlugOp
  | SetQueryParamDefaultOp
  | DuplicateComponentOp
  | WrapComponentOp
  | UnwrapComponentOp
  | ReorderChildrenOp
  | SetRepeaterDataSourceOp
  | SetRepeaterFiltersOp
  | SetRepeaterSortOp
  | ConnectInputToRepeaterOp;

export type OperationType = Operation["type"];

export const OPERATION_TYPES = [
  "addComponent",
  "removeComponent",
  "moveComponent",
  "setProp",
  "setStyle",
  "setAnimation",
  "setVisibility",
  "setText",
  "bindRMField",
  "addPage",
  "removePage",
  "renamePage",
  "setSiteSetting",
  "setPalette",
  "setLinkMode",
  "setDetailPageSlug",
  "setQueryParamDefault",
  "duplicateComponent",
  "wrapComponent",
  "unwrapComponent",
  "reorderChildren",
  "setRepeaterDataSource",
  "setRepeaterFilters",
  "setRepeaterSort",
  "connectInputToRepeater",
] as const satisfies readonly OperationType[];

// ---------------------------------------------------------------------------
// Zod schemas (one per variant + the discriminated union)
// ---------------------------------------------------------------------------

const idField = z.string().optional();
const componentIdField = z.string().min(1);
const slugField = z.string().min(1);
const visibilityEnum = z.enum(["always", "desktop", "mobile"]);
const animationOnEnum = z.enum(["enter", "hover"]);
const linkModeEnum = z.enum(["static", "detail"]);
const dataSourceEnum = z.enum(DATA_BINDING_SOURCES);

const wrapperSchema = z.object({
  type: componentTypeSchema,
  props: z.record(z.string(), z.unknown()).optional(),
  style: styleConfigSchema.optional(),
});

const addComponentSchema = z.object({
  id: idField,
  type: z.literal("addComponent"),
  parentId: componentIdField,
  index: z.number().int().nonnegative(),
  component: componentNodeSchema,
});

const removeComponentSchema = z.object({
  id: idField,
  type: z.literal("removeComponent"),
  targetId: componentIdField,
});

const moveComponentSchema = z.object({
  id: idField,
  type: z.literal("moveComponent"),
  targetId: componentIdField,
  newParentId: componentIdField,
  newIndex: z.number().int().nonnegative(),
});

const setPropSchema = z.object({
  id: idField,
  type: z.literal("setProp"),
  targetId: componentIdField,
  propPath: z.string().min(1),
  value: z.unknown(),
});

const setStyleSchema = z.object({
  id: idField,
  type: z.literal("setStyle"),
  targetId: componentIdField,
  stylePath: z.string().min(1),
  value: z.unknown(),
});

const setAnimationSchema = z.object({
  id: idField,
  type: z.literal("setAnimation"),
  targetId: componentIdField,
  on: animationOnEnum,
  preset: z.string().min(1),
  duration: z.number().nonnegative().optional(),
  delay: z.number().nonnegative().optional(),
});

const setVisibilitySchema = z.object({
  id: idField,
  type: z.literal("setVisibility"),
  targetId: componentIdField,
  visibility: visibilityEnum,
});

const setTextSchema = z.object({
  id: idField,
  type: z.literal("setText"),
  targetId: componentIdField,
  text: z.string(),
});

const bindRMFieldSchema = z.object({
  id: idField,
  type: z.literal("bindRMField"),
  targetId: componentIdField,
  propPath: z.string().min(1),
  fieldExpression: z.string().min(1),
});

const addPageSchema = z.object({
  id: idField,
  type: z.literal("addPage"),
  name: z.string().min(1),
  slug: slugField,
  atIndex: z.number().int().nonnegative().optional(),
  fromTemplate: z.string().optional(),
});

const removePageSchema = z.object({
  id: idField,
  type: z.literal("removePage"),
  slug: slugField,
  kind: pageKindSchema.optional(),
});

const renamePageSchema = z.object({
  id: idField,
  type: z.literal("renamePage"),
  slug: slugField,
  kind: pageKindSchema.optional(),
  newName: z.string().min(1),
  newSlug: slugField.optional(),
});

const setSiteSettingSchema = z.object({
  id: idField,
  type: z.literal("setSiteSetting"),
  path: z.string().min(1),
  value: z.unknown(),
});

const setPaletteSchema = z.object({
  id: idField,
  type: z.literal("setPalette"),
  palette: paletteIdSchema,
});

const setLinkModeSchema = z.object({
  id: idField,
  type: z.literal("setLinkMode"),
  componentId: componentIdField,
  value: linkModeEnum,
});

const setDetailPageSlugSchema = z.object({
  id: idField,
  type: z.literal("setDetailPageSlug"),
  componentId: componentIdField,
  value: slugField,
});

const setQueryParamDefaultSchema = z.object({
  id: idField,
  type: z.literal("setQueryParamDefault"),
  componentId: componentIdField,
  value: z.string().nullable(),
});

const duplicateComponentSchema = z.object({
  id: idField,
  type: z.literal("duplicateComponent"),
  targetId: componentIdField,
});

const wrapComponentSchema = z.object({
  id: idField,
  type: z.literal("wrapComponent"),
  targetId: componentIdField,
  wrapper: wrapperSchema,
});

const unwrapComponentSchema = z.object({
  id: idField,
  type: z.literal("unwrapComponent"),
  targetId: componentIdField,
});

const reorderChildrenSchema = z.object({
  id: idField,
  type: z.literal("reorderChildren"),
  parentId: componentIdField,
  newOrder: z.array(componentIdField),
});

const setRepeaterDataSourceSchema = z.object({
  id: idField,
  type: z.literal("setRepeaterDataSource"),
  targetId: componentIdField,
  dataSource: dataSourceEnum,
});

const setRepeaterFiltersSchema = z.object({
  id: idField,
  type: z.literal("setRepeaterFilters"),
  targetId: componentIdField,
  query: filterRuleGroupSchema,
});

const setRepeaterSortSchema = z.object({
  id: idField,
  type: z.literal("setRepeaterSort"),
  targetId: componentIdField,
  sort: sortSpecSchema,
});

const connectInputToRepeaterSchema = z.object({
  id: idField,
  type: z.literal("connectInputToRepeater"),
  inputId: componentIdField,
  repeaterId: componentIdField,
  field: z.string().min(1),
  operator: z.string().min(1),
});

export const operationSchema: z.ZodType<Operation> = z.discriminatedUnion("type", [
  addComponentSchema,
  removeComponentSchema,
  moveComponentSchema,
  setPropSchema,
  setStyleSchema,
  setAnimationSchema,
  setVisibilitySchema,
  setTextSchema,
  bindRMFieldSchema,
  addPageSchema,
  removePageSchema,
  renamePageSchema,
  setSiteSettingSchema,
  setPaletteSchema,
  setLinkModeSchema,
  setDetailPageSlugSchema,
  setQueryParamDefaultSchema,
  duplicateComponentSchema,
  wrapComponentSchema,
  unwrapComponentSchema,
  reorderChildrenSchema,
  setRepeaterDataSourceSchema,
  setRepeaterFiltersSchema,
  setRepeaterSortSchema,
  connectInputToRepeaterSchema,
]) as unknown as z.ZodType<Operation>;

// ---------------------------------------------------------------------------
// Tree helpers (depth-first walk + structural sharing)
// ---------------------------------------------------------------------------

type NodeTransform = (node: ComponentNode) => ComponentNode;

function findNodeInSubtree(node: ComponentNode, id: ComponentId): ComponentNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNodeInSubtree(child, id);
    if (found) return found;
  }
  return null;
}

function findNodeAcrossPages(config: SiteConfig, id: ComponentId): ComponentNode | null {
  for (const page of config.pages) {
    const found = findNodeInSubtree(page.rootComponent, id);
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

function mapNodeById(
  node: ComponentNode,
  id: ComponentId,
  transform: NodeTransform,
): { node: ComponentNode; found: boolean } {
  if (node.id === id) {
    return { node: transform(node), found: true };
  }
  if (!node.children || node.children.length === 0) {
    return { node, found: false };
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const res = mapNodeById(child, id, transform);
    if (res.found) {
      const nextChildren = node.children.slice();
      nextChildren[i] = res.node;
      return { node: { ...node, children: nextChildren }, found: true };
    }
  }
  return { node, found: false };
}

function applyMapToConfig(
  config: SiteConfig,
  opType: string,
  opId: OperationId | undefined,
  id: ComponentId,
  transform: NodeTransform,
): SiteConfig {
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const res = mapNodeById(page.rootComponent, id, transform);
    if (res.found) {
      const nextPages = config.pages.slice();
      nextPages[i] = { ...page, rootComponent: res.node };
      return { ...config, pages: nextPages };
    }
  }
  throw new OperationInvalidError(opType, `Component "${id}" not found in any page.`, opId);
}

function removeChildById(
  node: ComponentNode,
  id: ComponentId,
): { node: ComponentNode; found: boolean; removed?: ComponentNode } {
  if (!node.children || node.children.length === 0) {
    return { node, found: false };
  }
  const directIdx = node.children.findIndex((c) => c.id === id);
  if (directIdx !== -1) {
    const removed = node.children[directIdx];
    const nextChildren = node.children.slice();
    nextChildren.splice(directIdx, 1);
    return { node: { ...node, children: nextChildren }, found: true, removed };
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const res = removeChildById(child, id);
    if (res.found) {
      const nextChildren = node.children.slice();
      nextChildren[i] = res.node;
      return { node: { ...node, children: nextChildren }, found: true, removed: res.removed };
    }
  }
  return { node, found: false };
}

function freshenIds(node: ComponentNode): ComponentNode {
  return {
    ...node,
    id: newComponentId("cmp"),
    children: node.children?.map((c) => freshenIds(c)),
  };
}

// ---------------------------------------------------------------------------
// Path-based prop / style mutation
// ---------------------------------------------------------------------------

function splitPath(path: string, opType: string, opId: OperationId | undefined): string[] {
  const segments = path.split(".");
  if (segments.some((s) => s === "")) {
    throw new OperationInvalidError(opType, `Path "${path}" has an empty segment.`, opId);
  }
  return segments;
}

function setAtPath(
  target: unknown,
  path: readonly string[],
  value: unknown,
  opType: string,
  opId: OperationId | undefined,
): unknown {
  if (path.length === 0) return value;
  const head = path[0];
  if (head === undefined) {
    throw new OperationInvalidError(opType, "Empty path segment.", opId);
  }
  const rest = path.slice(1);

  if (Array.isArray(target)) {
    const idx = Number(head);
    if (!Number.isInteger(idx) || idx < 0) {
      throw new OperationInvalidError(
        opType,
        `Array index "${head}" is not a non-negative integer.`,
        opId,
      );
    }
    if (idx > target.length) {
      throw new OperationInvalidError(
        opType,
        `Array index ${idx} is out of range (length ${target.length}).`,
        opId,
      );
    }
    if (rest.length > 0 && idx === target.length) {
      throw new OperationInvalidError(
        opType,
        `Cannot traverse into a non-existent array slot at index ${idx}.`,
        opId,
      );
    }
    const next = target.slice();
    next[idx] = setAtPath(target[idx], rest, value, opType, opId);
    return next;
  }

  if (target === null || target === undefined) {
    if (rest.length > 0) {
      throw new OperationInvalidError(
        opType,
        `Path traversal failed: intermediate at "${head}" does not exist.`,
        opId,
      );
    }
    return { [head]: value };
  }

  if (typeof target !== "object") {
    throw new OperationInvalidError(
      opType,
      `Path traversal failed: intermediate at "${head}" is a primitive.`,
      opId,
    );
  }

  const obj = target as Record<string, unknown>;
  return { ...obj, [head]: setAtPath(obj[head], rest, value, opType, opId) };
}

// ---------------------------------------------------------------------------
// Slug + name validators (mirrors actions.ts -- inlined to keep this module
// independent of editor-state)
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MAX = 60;
const NAME_MAX = 100;
const HOME_SLUG = "home";

function validateSlug(slug: string, opType: string, opId: OperationId | undefined): void {
  if (!slug || slug.length > SLUG_MAX) {
    throw new OperationInvalidError(opType, `Slug must be 1-${SLUG_MAX} characters.`, opId);
  }
  if (!SLUG_REGEX.test(slug)) {
    throw new OperationInvalidError(
      opType,
      "Slug must contain only lowercase letters, digits, and hyphens.",
      opId,
    );
  }
}

function validateName(name: string, opType: string, opId: OperationId | undefined): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new OperationInvalidError(opType, "Name is required.", opId);
  }
  if (trimmed.length > NAME_MAX) {
    throw new OperationInvalidError(opType, `Name must be at most ${NAME_MAX} characters.`, opId);
  }
  return trimmed;
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

// ---------------------------------------------------------------------------
// Per-op apply functions
// ---------------------------------------------------------------------------

function applyAddComponent(config: SiteConfig, op: AddComponentOp): SiteConfig {
  if (findNodeAcrossPages(config, op.component.id) !== null) {
    throw new OperationInvalidError(
      op.type,
      `Component id "${op.component.id}" already exists in the config.`,
      op.id,
    );
  }
  return applyMapToConfig(config, op.type, op.id, op.parentId, (parent) => {
    if (!canAcceptChild(parent, op.component.type)) {
      throw new OperationInvalidError(
        op.type,
        `Component "${parent.type}" cannot accept a child of type "${op.component.type}".`,
        op.id,
      );
    }
    const children = (parent.children ?? []).slice();
    const safeIndex = Math.max(0, Math.min(op.index, children.length));
    children.splice(safeIndex, 0, op.component);
    return { ...parent, children };
  });
}

function applyRemoveComponent(config: SiteConfig, op: RemoveComponentOp): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === op.targetId) {
      throw new OperationInvalidError(
        op.type,
        `The page root "${op.targetId}" cannot be removed via removeComponent; use removePage.`,
        op.id,
      );
    }
  }
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const res = removeChildById(page.rootComponent, op.targetId);
    if (res.found) {
      const nextPages = config.pages.slice();
      nextPages[i] = { ...page, rootComponent: res.node };
      return { ...config, pages: nextPages };
    }
  }
  throw new OperationInvalidError(
    op.type,
    `Component "${op.targetId}" not found in any page.`,
    op.id,
  );
}

function applyMoveComponent(config: SiteConfig, op: MoveComponentOp): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === op.targetId) {
      throw new OperationInvalidError(op.type, "The page root cannot be moved.", op.id);
    }
  }
  const target = findNodeAcrossPages(config, op.targetId);
  if (!target) {
    throw new OperationInvalidError(
      op.type,
      `Component "${op.targetId}" not found in any page.`,
      op.id,
    );
  }
  const newParent = findNodeAcrossPages(config, op.newParentId);
  if (!newParent) {
    throw new OperationInvalidError(
      op.type,
      `Component "${op.newParentId}" not found in any page.`,
      op.id,
    );
  }
  if (isInSubtree(target, op.newParentId)) {
    throw new OperationInvalidError(
      op.type,
      "Cannot move a component into one of its own descendants.",
      op.id,
    );
  }
  if (!canAcceptChild(newParent, target.type)) {
    throw new OperationInvalidError(
      op.type,
      `Component "${newParent.type}" cannot accept a child of type "${target.type}".`,
      op.id,
    );
  }
  // Remove + re-insert. The two helpers below already structurally share.
  const removed = applyRemoveComponent(config, {
    type: "removeComponent",
    targetId: op.targetId,
    id: op.id,
  });
  return applyAddComponent(removed, {
    type: "addComponent",
    parentId: op.newParentId,
    index: op.newIndex,
    component: target,
    id: op.id,
  });
}

function applySetProp(config: SiteConfig, op: SetPropOp): SiteConfig {
  const segments = splitPath(op.propPath, op.type, op.id);
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    const nextProps = setAtPath(node.props, segments, op.value, op.type, op.id);
    if (nextProps === null || typeof nextProps !== "object" || Array.isArray(nextProps)) {
      throw new OperationInvalidError(
        op.type,
        "setProp must produce an object at the props root.",
        op.id,
      );
    }
    return { ...node, props: nextProps as Record<string, unknown> };
  });
}

function applySetStyle(config: SiteConfig, op: SetStyleOp): SiteConfig {
  const segments = splitPath(op.stylePath, op.type, op.id);
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    const nextStyle = setAtPath(node.style, segments, op.value, op.type, op.id);
    if (nextStyle === null || typeof nextStyle !== "object" || Array.isArray(nextStyle)) {
      throw new OperationInvalidError(
        op.type,
        "setStyle must produce an object at the style root.",
        op.id,
      );
    }
    return { ...node, style: nextStyle as StyleConfig };
  });
}

function applySetAnimation(config: SiteConfig, op: SetAnimationOp): SiteConfig {
  if (!ANIMATION_PRESETS.includes(op.preset as (typeof ANIMATION_PRESETS)[number])) {
    throw new OperationInvalidError(
      op.type,
      `Animation preset "${op.preset}" is not registered (allowed: ${ANIMATION_PRESETS.join(", ")}).`,
      op.id,
    );
  }
  const presetField: keyof AnimationConfig = op.on === "enter" ? "onEnter" : "onHover";
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    const next: AnimationConfig = {
      ...(node.animation ?? {}),
      [presetField]: op.preset,
    };
    if (op.duration !== undefined) next.duration = op.duration;
    if (op.delay !== undefined) next.delay = op.delay;
    return { ...node, animation: next };
  });
}

function applySetVisibility(config: SiteConfig, op: SetVisibilityOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => ({
    ...node,
    visibility: op.visibility,
  }));
}

function applySetText(config: SiteConfig, op: SetTextOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    if (node.type === "Heading" || node.type === "Paragraph") {
      return { ...node, props: { ...node.props, text: op.text } };
    }
    if (node.type === "Button") {
      return { ...node, props: { ...node.props, label: op.text } };
    }
    throw new OperationInvalidError(
      op.type,
      `setText only applies to Heading, Paragraph, or Button; got "${node.type}".`,
      op.id,
    );
  });
}

function applyBindRMField(config: SiteConfig, op: BindRMFieldOp): SiteConfig {
  const segments = splitPath(op.propPath, op.type, op.id);
  const tokenized = `{{ ${op.fieldExpression} }}`;
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    const nextProps = setAtPath(node.props, segments, tokenized, op.type, op.id);
    if (nextProps === null || typeof nextProps !== "object" || Array.isArray(nextProps)) {
      throw new OperationInvalidError(
        op.type,
        "bindRMField must produce an object at the props root.",
        op.id,
      );
    }
    return { ...node, props: nextProps as Record<string, unknown> };
  });
}

function applyAddPage(config: SiteConfig, op: AddPageOp): SiteConfig {
  const trimmedName = validateName(op.name, op.type, op.id);
  validateSlug(op.slug, op.type, op.id);
  // §9.4: addComponent does NOT create detail pages -- always static.
  const conflict = config.pages.some((p) => p.kind === "static" && p.slug === op.slug);
  if (conflict) {
    throw new OperationInvalidError(
      op.type,
      `Another static page already uses the slug "${op.slug}".`,
      op.id,
    );
  }
  const newPage: Page = {
    id: newComponentId("p"),
    slug: op.slug,
    name: trimmedName,
    kind: "static",
    rootComponent: makeEmptySection(),
  };
  const nextPages = config.pages.slice();
  if (op.atIndex !== undefined) {
    const safeIndex = Math.max(0, Math.min(op.atIndex, nextPages.length));
    nextPages.splice(safeIndex, 0, newPage);
  } else {
    nextPages.push(newPage);
  }
  return { ...config, pages: nextPages };
}

function applyRemovePage(config: SiteConfig, op: RemovePageOp): SiteConfig {
  const kind: PageKind = op.kind ?? "static";
  if (op.slug === HOME_SLUG && kind === "static") {
    throw new OperationInvalidError(op.type, "The home page cannot be removed.", op.id);
  }
  const idx = config.pages.findIndex((p) => p.slug === op.slug && p.kind === kind);
  if (idx === -1) {
    throw new OperationInvalidError(op.type, `No ${kind} page with slug "${op.slug}".`, op.id);
  }
  const nextPages = config.pages.slice();
  nextPages.splice(idx, 1);
  return { ...config, pages: nextPages };
}

function applyRenamePage(config: SiteConfig, op: RenamePageOp): SiteConfig {
  const kind: PageKind = op.kind ?? "static";
  const trimmedName = validateName(op.newName, op.type, op.id);
  if (op.newSlug !== undefined) validateSlug(op.newSlug, op.type, op.id);
  const idx = config.pages.findIndex((p) => p.slug === op.slug && p.kind === kind);
  if (idx === -1) {
    throw new OperationInvalidError(op.type, `No ${kind} page with slug "${op.slug}".`, op.id);
  }
  const target = config.pages[idx];
  if (!target) {
    throw new OperationInvalidError(op.type, `No ${kind} page with slug "${op.slug}".`, op.id);
  }
  const isHome = target.slug === HOME_SLUG && target.kind === "static";
  if (isHome && op.newSlug !== undefined && op.newSlug !== HOME_SLUG) {
    throw new OperationInvalidError(op.type, "The home page slug is fixed.", op.id);
  }
  const newSlug = op.newSlug ?? target.slug;
  if (newSlug !== target.slug) {
    const conflict = config.pages.some(
      (p, i) => i !== idx && p.kind === target.kind && p.slug === newSlug,
    );
    if (conflict) {
      throw new OperationInvalidError(
        op.type,
        `Another ${target.kind} page already uses slug "${newSlug}".`,
        op.id,
      );
    }
  }
  const nextPages = config.pages.slice();
  nextPages[idx] = { ...target, name: trimmedName, slug: newSlug };
  return { ...config, pages: nextPages };
}

const SITE_SETTING_ROOTS = ["meta", "brand", "global"] as const;
type SiteSettingRoot = (typeof SITE_SETTING_ROOTS)[number];

function applySetSiteSetting(config: SiteConfig, op: SetSiteSettingOp): SiteConfig {
  const segments = splitPath(op.path, op.type, op.id);
  const root = segments[0];
  if (root === undefined || !(SITE_SETTING_ROOTS as readonly string[]).includes(root)) {
    throw new OperationInvalidError(
      op.type,
      `setSiteSetting path must start with one of ${SITE_SETTING_ROOTS.join(", ")}; got "${root ?? ""}".`,
      op.id,
    );
  }
  const key = root as SiteSettingRoot;
  const nextSubtree = setAtPath(config[key], segments.slice(1), op.value, op.type, op.id);
  if (nextSubtree === null || typeof nextSubtree !== "object" || Array.isArray(nextSubtree)) {
    throw new OperationInvalidError(
      op.type,
      `setSiteSetting must produce an object at "${key}".`,
      op.id,
    );
  }
  if (key === "meta") {
    return { ...config, meta: nextSubtree as SiteConfig["meta"] };
  }
  if (key === "brand") {
    return { ...config, brand: nextSubtree as SiteConfig["brand"] };
  }
  return { ...config, global: nextSubtree as SiteConfig["global"] };
}

function applySetPalette(config: SiteConfig, op: SetPaletteOp): SiteConfig {
  return { ...config, brand: { ...config.brand, palette: op.palette } };
}

function applySetLinkMode(config: SiteConfig, op: SetLinkModeOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.componentId, (node) => {
    if (node.type !== "Button") {
      throw new OperationInvalidError(
        op.type,
        `setLinkMode only applies to Button; got "${node.type}".`,
        op.id,
      );
    }
    return { ...node, props: { ...node.props, linkMode: op.value } };
  });
}

function applySetDetailPageSlug(config: SiteConfig, op: SetDetailPageSlugOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.componentId, (node) => {
    if (node.type !== "Button") {
      throw new OperationInvalidError(
        op.type,
        `setDetailPageSlug only applies to Button; got "${node.type}".`,
        op.id,
      );
    }
    if (node.props.linkMode !== "detail") {
      throw new OperationInvalidError(
        op.type,
        'setDetailPageSlug requires the Button\'s linkMode to be "detail".',
        op.id,
      );
    }
    return { ...node, props: { ...node.props, detailPageSlug: op.value } };
  });
}

function applySetQueryParamDefault(config: SiteConfig, op: SetQueryParamDefaultOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.componentId, (node) => {
    if (node.type !== "InputField") {
      throw new OperationInvalidError(
        op.type,
        `setQueryParamDefault only applies to InputField; got "${node.type}".`,
        op.id,
      );
    }
    if (op.value === null) {
      const { defaultValueFromQueryParam: _omit, ...rest } = node.props;
      return { ...node, props: rest };
    }
    return {
      ...node,
      props: { ...node.props, defaultValueFromQueryParam: op.value },
    };
  });
}

function applyDuplicateComponent(config: SiteConfig, op: DuplicateComponentOp): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === op.targetId) {
      throw new OperationInvalidError(op.type, "The page root cannot be duplicated.", op.id);
    }
  }
  const target = findNodeAcrossPages(config, op.targetId);
  if (!target) {
    throw new OperationInvalidError(
      op.type,
      `Component "${op.targetId}" not found in any page.`,
      op.id,
    );
  }
  const cloned = freshenIds(target);
  // Find the parent so we can insert the clone immediately after the source.
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const result = mapNodeById(page.rootComponent, op.targetId, (node) => node);
    if (!result.found) continue;
    // Walk the page tree to find the parent of targetId and splice the clone in.
    const inserted = insertSiblingAfter(page.rootComponent, op.targetId, cloned);
    if (inserted) {
      const nextPages = config.pages.slice();
      nextPages[i] = { ...page, rootComponent: inserted };
      return { ...config, pages: nextPages };
    }
  }
  throw new OperationInvalidError(
    op.type,
    `Could not locate a parent for "${op.targetId}".`,
    op.id,
  );
}

function insertSiblingAfter(
  root: ComponentNode,
  targetId: ComponentId,
  sibling: ComponentNode,
): ComponentNode | null {
  if (!root.children) return null;
  const idx = root.children.findIndex((c) => c.id === targetId);
  if (idx !== -1) {
    const nextChildren = root.children.slice();
    nextChildren.splice(idx + 1, 0, sibling);
    return { ...root, children: nextChildren };
  }
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (!child) continue;
    const updated = insertSiblingAfter(child, targetId, sibling);
    if (updated) {
      const nextChildren = root.children.slice();
      nextChildren[i] = updated;
      return { ...root, children: nextChildren };
    }
  }
  return null;
}

function applyWrapComponent(config: SiteConfig, op: WrapComponentOp): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === op.targetId) {
      throw new OperationInvalidError(op.type, "The page root cannot be wrapped.", op.id);
    }
  }
  const target = findNodeAcrossPages(config, op.targetId);
  if (!target) {
    throw new OperationInvalidError(
      op.type,
      `Component "${op.targetId}" not found in any page.`,
      op.id,
    );
  }
  const wrapperNode: ComponentNode = {
    id: newComponentId("cmp"),
    type: op.wrapper.type,
    props: op.wrapper.props ?? {},
    style: op.wrapper.style ?? {},
    children: [target],
  };
  if (!canAcceptChild(wrapperNode, target.type)) {
    throw new OperationInvalidError(
      op.type,
      `Wrapper "${op.wrapper.type}" cannot accept a child of type "${target.type}".`,
      op.id,
    );
  }
  // Replace target in its parent with the wrapperNode.
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const replaced = replaceNodeInTree(page.rootComponent, op.targetId, wrapperNode);
    if (replaced) {
      const nextPages = config.pages.slice();
      nextPages[i] = { ...page, rootComponent: replaced };
      return { ...config, pages: nextPages };
    }
  }
  throw new OperationInvalidError(
    op.type,
    `Could not relocate "${op.targetId}" while wrapping.`,
    op.id,
  );
}

function replaceNodeInTree(
  root: ComponentNode,
  targetId: ComponentId,
  replacement: ComponentNode,
): ComponentNode | null {
  if (!root.children) return null;
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (!child) continue;
    if (child.id === targetId) {
      const nextChildren = root.children.slice();
      nextChildren[i] = replacement;
      return { ...root, children: nextChildren };
    }
    const deeper = replaceNodeInTree(child, targetId, replacement);
    if (deeper) {
      const nextChildren = root.children.slice();
      nextChildren[i] = deeper;
      return { ...root, children: nextChildren };
    }
  }
  return null;
}

function spliceChildren(
  root: ComponentNode,
  targetId: ComponentId,
  newChildren: ComponentNode[],
): ComponentNode | null {
  if (!root.children) return null;
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (!child) continue;
    if (child.id === targetId) {
      const nextChildren = root.children.slice();
      nextChildren.splice(i, 1, ...newChildren);
      return { ...root, children: nextChildren };
    }
    const deeper = spliceChildren(child, targetId, newChildren);
    if (deeper) {
      const nextChildren = root.children.slice();
      nextChildren[i] = deeper;
      return { ...root, children: nextChildren };
    }
  }
  return null;
}

function applyUnwrapComponent(config: SiteConfig, op: UnwrapComponentOp): SiteConfig {
  for (const page of config.pages) {
    if (page.rootComponent.id === op.targetId) {
      throw new OperationInvalidError(op.type, "The page root cannot be unwrapped.", op.id);
    }
  }
  const target = findNodeAcrossPages(config, op.targetId);
  if (!target) {
    throw new OperationInvalidError(
      op.type,
      `Component "${op.targetId}" not found in any page.`,
      op.id,
    );
  }
  if (!target.children || target.children.length === 0) {
    throw new OperationInvalidError(
      op.type,
      `Cannot unwrap "${op.targetId}" because it has no children.`,
      op.id,
    );
  }
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const updated = spliceChildren(page.rootComponent, op.targetId, target.children);
    if (updated) {
      const nextPages = config.pages.slice();
      nextPages[i] = { ...page, rootComponent: updated };
      return { ...config, pages: nextPages };
    }
  }
  throw new OperationInvalidError(op.type, `Could not unwrap "${op.targetId}".`, op.id);
}

function applyReorderChildren(config: SiteConfig, op: ReorderChildrenOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.parentId, (parent) => {
    const currentChildren = parent.children ?? [];
    const currentIds = currentChildren.map((c) => c.id);
    if (op.newOrder.length !== currentIds.length) {
      throw new OperationInvalidError(
        op.type,
        `newOrder length ${op.newOrder.length} does not match current children length ${currentIds.length}.`,
        op.id,
      );
    }
    const currentSet = new Set(currentIds);
    const seen = new Set<ComponentId>();
    for (const id of op.newOrder) {
      if (!currentSet.has(id)) {
        throw new OperationInvalidError(op.type, `newOrder contains unknown id "${id}".`, op.id);
      }
      if (seen.has(id)) {
        throw new OperationInvalidError(op.type, `newOrder contains duplicate id "${id}".`, op.id);
      }
      seen.add(id);
    }
    const lookup = new Map<ComponentId, ComponentNode>();
    for (const child of currentChildren) lookup.set(child.id, child);
    const reordered = op.newOrder.map((id) => {
      const c = lookup.get(id);
      if (!c) {
        throw new OperationInvalidError(op.type, `Child "${id}" missing.`, op.id);
      }
      return c;
    });
    return { ...parent, children: reordered };
  });
}

function applySetRepeaterDataSource(config: SiteConfig, op: SetRepeaterDataSourceOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    if (node.type !== "Repeater") {
      throw new OperationInvalidError(
        op.type,
        `setRepeaterDataSource only applies to Repeater; got "${node.type}".`,
        op.id,
      );
    }
    const existing: Partial<DataBinding> = node.dataBinding ?? { source: op.dataSource };
    const nextBinding: DataBinding = { ...existing, source: op.dataSource };
    return { ...node, dataBinding: nextBinding };
  });
}

function applySetRepeaterFilters(config: SiteConfig, op: SetRepeaterFiltersOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    if (node.type !== "Repeater") {
      throw new OperationInvalidError(
        op.type,
        `setRepeaterFilters only applies to Repeater; got "${node.type}".`,
        op.id,
      );
    }
    if (!node.dataBinding) {
      throw new OperationInvalidError(
        op.type,
        "Repeater has no dataBinding; set the data source first.",
        op.id,
      );
    }
    return {
      ...node,
      dataBinding: { ...node.dataBinding, filters: op.query },
    };
  });
}

function applySetRepeaterSort(config: SiteConfig, op: SetRepeaterSortOp): SiteConfig {
  return applyMapToConfig(config, op.type, op.id, op.targetId, (node) => {
    if (node.type !== "Repeater") {
      throw new OperationInvalidError(
        op.type,
        `setRepeaterSort only applies to Repeater; got "${node.type}".`,
        op.id,
      );
    }
    if (!node.dataBinding) {
      throw new OperationInvalidError(
        op.type,
        "Repeater has no dataBinding; set the data source first.",
        op.id,
      );
    }
    return {
      ...node,
      dataBinding: { ...node.dataBinding, sort: op.sort },
    };
  });
}

function applyConnectInputToRepeater(config: SiteConfig, op: ConnectInputToRepeaterOp): SiteConfig {
  const inputNode = findNodeAcrossPages(config, op.inputId);
  if (!inputNode) {
    throw new OperationInvalidError(op.type, `Input "${op.inputId}" not found in any page.`, op.id);
  }
  if (inputNode.type !== "InputField") {
    throw new OperationInvalidError(
      op.type,
      `inputId must reference an InputField; got "${inputNode.type}".`,
      op.id,
    );
  }
  const repeaterNode = findNodeAcrossPages(config, op.repeaterId);
  if (!repeaterNode) {
    throw new OperationInvalidError(
      op.type,
      `Repeater "${op.repeaterId}" not found in any page.`,
      op.id,
    );
  }
  if (repeaterNode.type !== "Repeater") {
    throw new OperationInvalidError(
      op.type,
      `repeaterId must reference a Repeater; got "${repeaterNode.type}".`,
      op.id,
    );
  }
  return applyMapToConfig(config, op.type, op.id, op.repeaterId, (node) => {
    if (!node.dataBinding) {
      throw new OperationInvalidError(
        op.type,
        "Repeater has no dataBinding; set the data source first.",
        op.id,
      );
    }
    const existing = node.dataBinding.connectedInputs ?? [];
    const next = existing.concat({
      inputId: op.inputId,
      field: op.field,
      operator: op.operator,
    });
    return {
      ...node,
      dataBinding: { ...node.dataBinding, connectedInputs: next },
    };
  });
}

// ---------------------------------------------------------------------------
// First-NavBar auto-populate (used by store.addComponentChild)
// ---------------------------------------------------------------------------

function subtreeContainsType(node: ComponentNode, type: ComponentType): boolean {
  if (node.type === type) return true;
  for (const child of node.children ?? []) {
    if (subtreeContainsType(child, type)) return true;
  }
  return false;
}

export function isFirstNavBar(config: SiteConfig): boolean {
  for (const page of config.pages) {
    if (subtreeContainsType(page.rootComponent, "NavBar")) return false;
  }
  return true;
}

export function buildAutoPopulatedNavLinks(config: SiteConfig): NavLink[] {
  return config.pages
    .filter((p) => p.kind === "static")
    .map((p) => ({ kind: "page" as const, pageSlug: p.slug, label: p.name }));
}

// ---------------------------------------------------------------------------
// Locked NavBar replication (Sprint 13)
// ---------------------------------------------------------------------------

// `navBarLocked` is optional in schema for backward compat — undefined means
// "locked" (the default behavior). Readers should always go through this.
export function isGlobalNavBarLocked(config: SiteConfig): boolean {
  return config.global.navBarLocked !== false;
}

// Walk every page's tree; apply `transform` to every NavBar node and replace
// it in place. The transform receives the node and returns its replacement
// (or the same node to leave unchanged). Used by `syncLockedNavBars` and the
// `setGlobalNavBarLocked` action.
function mapAllNavBars(
  config: SiteConfig,
  transform: (node: ComponentNode) => ComponentNode,
): SiteConfig {
  function walk(node: ComponentNode): ComponentNode {
    let next = node;
    if (next.type === "NavBar") {
      next = transform(next);
    }
    if (!next.children) return next;
    let childrenChanged = false;
    const nextChildren = next.children.map((child) => {
      const w = walk(child);
      if (w !== child) childrenChanged = true;
      return w;
    });
    return childrenChanged ? { ...next, children: nextChildren } : next;
  }
  let changed = false;
  const nextPages = config.pages.map((page) => {
    const nextRoot = walk(page.rootComponent);
    if (nextRoot === page.rootComponent) return page;
    changed = true;
    return { ...page, rootComponent: nextRoot };
  });
  return changed ? { ...config, pages: nextPages } : config;
}

// After any mutation that touches a NavBar in the locked group, copy its
// props/style/animation to every other NavBar in the group. The source's own
// node is left untouched. NavBars with `overrideShared === true` and any
// non-NavBar nodes are skipped. If the global lock is off, this is a no-op.
export function syncLockedNavBars(config: SiteConfig, sourceNodeId: string): SiteConfig {
  if (!isGlobalNavBarLocked(config)) return config;
  let source: ComponentNode | null = null;
  for (const page of config.pages) {
    source = findNodeInSubtree(page.rootComponent, sourceNodeId);
    if (source) break;
  }
  if (!source || source.type !== "NavBar") return config;
  if (source.props.overrideShared === true) return config;
  const sourceProps = source.props;
  const sourceStyle = source.style;
  const sourceAnimation = source.animation;
  return mapAllNavBars(config, (node) => {
    if (node.id === sourceNodeId) return node;
    if (node.props.overrideShared === true) return node;
    return {
      ...node,
      props: { ...sourceProps, overrideShared: false },
      style: sourceStyle,
      animation: sourceAnimation,
    };
  });
}

// Find any NavBar that's currently in the locked group (other than `excludeId`).
// Used when toggling `overrideShared` OFF on a node — we need to adopt the
// group's content, so we copy from any locked sibling.
export function findLockedNavBar(
  config: SiteConfig,
  excludeId: string,
): ComponentNode | null {
  if (!isGlobalNavBarLocked(config)) return null;
  for (const page of config.pages) {
    const found = findLockedInSubtree(page.rootComponent, excludeId);
    if (found) return found;
  }
  return null;
}

function findLockedInSubtree(node: ComponentNode, excludeId: string): ComponentNode | null {
  if (node.type === "NavBar" && node.id !== excludeId && node.props.overrideShared !== true) {
    return node;
  }
  for (const child of node.children ?? []) {
    const f = findLockedInSubtree(child, excludeId);
    if (f) return f;
  }
  return null;
}

// When the user flips the site-wide lock ON (OFF → ON), every NavBar that
// isn't in override mode adopts a single canonical NavBar's content. The
// canonical is selected as the first NavBar found in declaration order (page
// order, depth-first). When no NavBar exists, this is a no-op.
export function applyGlobalNavBarLocked(config: SiteConfig, value: boolean): SiteConfig {
  const next: SiteConfig = { ...config, global: { ...config.global, navBarLocked: value } };
  if (!value) return next;
  // Pick canonical: first NavBar (in any page) that's not in override mode,
  // else the first NavBar at all.
  let canonical: ComponentNode | null = null;
  let anyNavBar: ComponentNode | null = null;
  for (const page of next.pages) {
    canonical = findLockableInSubtree(page.rootComponent);
    if (canonical) break;
  }
  if (!canonical) {
    for (const page of next.pages) {
      anyNavBar = findFirstNavBar(page.rootComponent);
      if (anyNavBar) break;
    }
    canonical = anyNavBar;
  }
  if (!canonical) return next;
  return syncLockedNavBars(next, canonical.id);
}

function findLockableInSubtree(node: ComponentNode): ComponentNode | null {
  if (node.type === "NavBar" && node.props.overrideShared !== true) return node;
  for (const child of node.children ?? []) {
    const f = findLockableInSubtree(child);
    if (f) return f;
  }
  return null;
}

function findFirstNavBar(node: ComponentNode): ComponentNode | null {
  if (node.type === "NavBar") return node;
  for (const child of node.children ?? []) {
    const f = findFirstNavBar(child);
    if (f) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function applyOperation(config: SiteConfig, op: Operation): SiteConfig {
  switch (op.type) {
    case "addComponent":
      return applyAddComponent(config, op);
    case "removeComponent":
      return applyRemoveComponent(config, op);
    case "moveComponent":
      return applyMoveComponent(config, op);
    case "setProp":
      return applySetProp(config, op);
    case "setStyle":
      return applySetStyle(config, op);
    case "setAnimation":
      return applySetAnimation(config, op);
    case "setVisibility":
      return applySetVisibility(config, op);
    case "setText":
      return applySetText(config, op);
    case "bindRMField":
      return applyBindRMField(config, op);
    case "addPage":
      return applyAddPage(config, op);
    case "removePage":
      return applyRemovePage(config, op);
    case "renamePage":
      return applyRenamePage(config, op);
    case "setSiteSetting":
      return applySetSiteSetting(config, op);
    case "setPalette":
      return applySetPalette(config, op);
    case "setLinkMode":
      return applySetLinkMode(config, op);
    case "setDetailPageSlug":
      return applySetDetailPageSlug(config, op);
    case "setQueryParamDefault":
      return applySetQueryParamDefault(config, op);
    case "duplicateComponent":
      return applyDuplicateComponent(config, op);
    case "wrapComponent":
      return applyWrapComponent(config, op);
    case "unwrapComponent":
      return applyUnwrapComponent(config, op);
    case "reorderChildren":
      return applyReorderChildren(config, op);
    case "setRepeaterDataSource":
      return applySetRepeaterDataSource(config, op);
    case "setRepeaterFilters":
      return applySetRepeaterFilters(config, op);
    case "setRepeaterSort":
      return applySetRepeaterSort(config, op);
    case "connectInputToRepeater":
      return applyConnectInputToRepeater(config, op);
    default: {
      const _exhaustive: never = op;
      void _exhaustive;
      throw new OperationInvalidError(
        "unknown",
        `Unknown operation type: ${JSON.stringify(op)}`,
        undefined,
      );
    }
  }
}

export function applyOperations(config: SiteConfig, operations: readonly Operation[]): SiteConfig {
  // Strict left fold. The first throw aborts; intermediate state is discarded
  // because we never mutate `config` (every per-op apply is structural-share).
  return operations.reduce((acc, op) => applyOperation(acc, op), config);
}
