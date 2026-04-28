"use client";

import { BetweenDropZone } from "@/components/editor/canvas/dnd/BetweenDropZone";
import { EmptyContainerOverlay } from "@/components/editor/canvas/dnd/EmptyContainerOverlay";
import { getChildrenPolicy } from "@/components/editor/canvas/dnd/dropTargetPolicy";
import { componentRegistry } from "@/components/site-components/registry";
import { useRow } from "@/lib/row-context";
import { styleConfigToCss } from "@/lib/site-config";
import { resolveTokens } from "@/lib/token-resolver";
import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, type ReactNode, memo, useMemo } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { type ContextMenuMeta, EditModeWrapper } from "./EditModeWrapper";

// In edit mode, every component is wrapped in an `<EditModeWrapper>` (a plain
// `<div>`) before being inserted into its parent. Without help, that wrapper
// is `display: block` with no flex / width / height of its own, so the
// parent's flex container sees a block-level wrapper instead of the
// component itself — and the component's own `flex: …` / `width: …` styling
// no longer reaches the parent. Result: Columns with `flex: span` stack
// vertically inside a flex `Row` instead of laying out side-by-side. Preview
// mode is unaffected because there's no wrapper.
//
// `computeWrapperPassthroughStyle` extracts the *layout-affecting* subset of
// the node's effective style and hands it back so `<EditModeWrapper>` can
// apply it to its own div. The inner component still applies the same
// values to its own root element — duplication is intentional and
// idempotent for `flex`, `width`, and `height` (margin is deliberately NOT
// passed through because that would double-apply on the wrapper *and*
// inside it).
function computeWrapperPassthroughStyle(node: ComponentNode): CSSProperties {
  const out: CSSProperties = {};
  const cssStyle = styleConfigToCss(node.style);
  if (cssStyle.width !== undefined) out.width = cssStyle.width;
  if (cssStyle.height !== undefined) out.height = cssStyle.height;
  // Margin needs to live on the OUTER (wrapper) element so the wrapper
  // outline tracks the visible component when the user drags the W/N edge
  // (which compensates by writing negative margin-left / margin-top to
  // anchor the opposite edge). The inner component must NOT also receive
  // these values — see `stripMarginFromCss` below — or it would
  // double-apply.
  if (cssStyle.marginTop !== undefined) out.marginTop = cssStyle.marginTop;
  if (cssStyle.marginRight !== undefined) out.marginRight = cssStyle.marginRight;
  if (cssStyle.marginBottom !== undefined) out.marginBottom = cssStyle.marginBottom;
  if (cssStyle.marginLeft !== undefined) out.marginLeft = cssStyle.marginLeft;
  // Column's own `flex` value depends on whether an explicit width is set
  // (see `Column/index.tsx`): `flex: 0 0 <width>` when width is explicit,
  // otherwise `flex: <span>` for legacy proportional sharing. The wrapper
  // MUST mirror that exactly, otherwise the wrapper grows to its flex-grow
  // share inside a flex Row in edit mode while preview renders the inner
  // at its literal pixel width — making edit and preview disagree on
  // layout (cards visually fill the Row in edit, then collapse + overlap
  // in preview).
  if (node.type === "Column") {
    if (cssStyle.width !== undefined) {
      out.flex = `0 0 ${cssStyle.width}`;
    } else {
      const span = (node.props as { span?: unknown }).span;
      if (typeof span === "number") out.flex = span;
    }
  }
  return out;
}

// In edit mode, margin is applied on the EditModeWrapper (per
// `computeWrapperPassthroughStyle`) so the wrapper outline matches the
// visible component. The inner component must therefore render without
// margin to prevent double-application. Width and height are intentionally
// duplicated on both wrapper and inner because they are idempotent (the
// inner box ends up the same size either way).
function stripMarginFromCss(css: CSSProperties): CSSProperties {
  if (
    css.marginTop === undefined &&
    css.marginRight === undefined &&
    css.marginBottom === undefined &&
    css.marginLeft === undefined &&
    css.margin === undefined
  ) {
    return css;
  }
  const {
    marginTop: _t,
    marginRight: _r,
    marginBottom: _b,
    marginLeft: _l,
    margin: _m,
    ...rest
  } = css;
  return rest;
}

// Read the parent container's effective `gap` (in px) for use by interleaved
// BetweenDropZones. Each BZ absorbs one of its two surrounding gaps via
// negative margin so the cumulative inter-card spacing in edit mode matches
// preview mode exactly. Components without a flex `gap` (Section in normal
// block layout, Form, etc.) return 0 and BetweenDropZone applies no
// compensation.
function readParentGap(node: ComponentNode): number {
  // Row and Column both expose a numeric `gap` prop with sane defaults.
  if (node.type === "Row") {
    const g = (node.props as { gap?: unknown }).gap;
    return typeof g === "number" ? g : 16;
  }
  if (node.type === "Column") {
    const g = (node.props as { gap?: unknown }).gap;
    return typeof g === "number" ? g : 8;
  }
  // Other "many"-policy parents (Section block layout, Form, FlowGroup)
  // either don't use CSS gap or don't double-count; treat as 0.
  return 0;
}

export type Mode = "edit" | "preview" | "public";

export type ComponentRendererProps = {
  node: ComponentNode;
  mode: Mode;
  selection?: string[];
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string, meta: ContextMenuMeta) => void;
};

// Sprint 9: opt-in token resolver. When no row is in scope (`useRow()`
// returns `null`), `resolveProps` is a no-op and `node` keeps its identity
// so the memoized renderer skips work on static pages — the Sprint 5
// shell behavior is preserved verbatim. Sprint 9b extends this to detail
// pages by adding another `RowContextProvider` insertion point upstream.

// 2026-04-26 deviation (DECISIONS.md): when the entire prop string is exactly
// one `{{ row.path }}` token, replace the prop with the *raw* row value
// instead of stringifying it. UnitCard / PropertyCard's numeric props
// (z.number()) would otherwise reject the resolver's string output and the
// whole card would fall back to defaults. The token-resolver module's
// public `(string) => string` contract is unchanged.
const WHOLE_TOKEN_RE = /^\s*\{\{\s*([^{}|]+?)\s*\}\}\s*$/;

function lookupRowPath(row: unknown, expr: string): { found: boolean; value: unknown } {
  const segments = expr.split(".").filter((s) => s.length > 0);
  if (segments.length === 0 || segments[0] !== "row") return { found: false, value: undefined };
  let cur: unknown = row;
  for (const seg of segments.slice(1)) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    if (typeof cur !== "object") return { found: false, value: undefined };
    if (!(seg in (cur as Record<string, unknown>))) return { found: false, value: undefined };
    cur = (cur as Record<string, unknown>)[seg];
  }
  return { found: true, value: cur };
}

function resolveStringProp(value: string, row: unknown): unknown {
  const wholeTokenMatch = value.match(WHOLE_TOKEN_RE);
  if (wholeTokenMatch?.[1]) {
    const expr = wholeTokenMatch[1].trim();
    const lookup = lookupRowPath(row, expr);
    // Only short-circuit when the path resolves AND the value is non-string;
    // a resolved string falls through to `resolveTokens` so behavior stays
    // identical for already-string props (preserves the `money` formatter
    // case `"{{ row.rent | money }}"` which contains a pipe and won't match
    // WHOLE_TOKEN_RE anyway).
    if (lookup.found && typeof lookup.value !== "string") {
      return lookup.value;
    }
  }
  return resolveTokens(value, row);
}

function resolveValue(value: unknown, row: unknown, depth: number): unknown {
  if (typeof value === "string") return resolveStringProp(value, row);
  if (depth >= 1) return value;
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, row, depth + 1));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveValue(v, row, depth + 1);
    }
    return out;
  }
  return value;
}

function resolveProps(props: Record<string, unknown>, row: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = resolveValue(v, row, 0);
  }
  return out;
}

function ComponentRendererInner({
  node,
  mode,
  selection,
  onSelect,
  onContextMenu,
}: ComponentRendererProps) {
  const cssStyle = useMemo(() => styleConfigToCss(node.style), [node.style]);
  // In edit mode, margin is applied on the EditModeWrapper (see
  // `computeWrapperPassthroughStyle`); the inner component must render
  // without margin to avoid double-application. In preview / public,
  // there's no wrapper so the inner gets the full cssStyle.
  const cssStyleForInner = useMemo(
    () => (mode === "edit" ? stripMarginFromCss(cssStyle) : cssStyle),
    [cssStyle, mode],
  );
  const { row, kind } = useRow();

  const entry = componentRegistry[node.type];
  if (!entry) {
    // noUncheckedIndexedAccess narrows the lookup to | undefined; in practice
    // ComponentType is the registry's key so this is unreachable when the
    // config has been validated through siteConfigSchema first.
    throw new Error(`Unknown component type: ${String(node.type)}`);
  }
  const Component = entry.Component;

  const resolvedNode = useMemo<ComponentNode>(() => {
    if (kind === null) return node;
    return { ...node, props: resolveProps(node.props, row) };
  }, [node, row, kind]);

  const childElements = node.children?.map((child) => (
    <ComponentRenderer
      key={child.id}
      node={child}
      mode={mode}
      selection={selection}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    />
  ));

  // In edit mode, interleave a `BetweenDropZone` at every gap between
  // children of any "many"-policy container so palette inserts and
  // cross-parent moves can target a specific index — including above the
  // first child and below the last (which is otherwise unreachable for
  // the page-root Section because its children fully cover its area).
  // Preview/public renders skip this entirely.
  //
  // When a container (policy !== "none") has zero children and we are in edit
  // mode, render `EmptyContainerOverlay` instead so the user sees a clear
  // "Drop a component here" affordance and a dnd-kit droppable target fills
  // the container's interior.
  const policy = getChildrenPolicy(node.type);
  const childCount = node.children?.length ?? 0;
  const showEmpty = mode === "edit" && policy !== "none" && childCount === 0;

  let childrenToRender: ReactNode = showEmpty ? (
    <EmptyContainerOverlay parentId={node.id} />
  ) : (
    childElements
  );
  if (!showEmpty && mode === "edit" && policy === "many") {
    const orientation: "vertical" | "horizontal" = node.type === "Row" ? "horizontal" : "vertical";
    // Gap-doubling fix: the parent (Row, Column, etc.) applies CSS `gap`
    // between every pair of adjacent flex items. Interleaving an invisible
    // BetweenDropZone turns one gap (between two cards) into two gaps
    // (card→BZ→card), making edit mode total horizontal/vertical space
    // larger than preview by `(numCards - 1) * gap` extra. Pass the
    // parent's gap value so BetweenDropZone can apply a compensating
    // negative margin and the layouts match preview exactly.
    const parentGap = readParentGap(node);
    const elements = childElements ?? [];
    const interleaved: ReactNode[] = [];
    interleaved.push(
      <BetweenDropZone
        key={`bz-${node.id}-0`}
        parentId={node.id}
        index={0}
        orientation={orientation}
        parentGap={parentGap}
      />,
    );
    elements.forEach((el, i) => {
      interleaved.push(el);
      interleaved.push(
        <BetweenDropZone
          key={`bz-${node.id}-${i + 1}`}
          parentId={node.id}
          index={i + 1}
          orientation={orientation}
          parentGap={parentGap}
        />,
      );
    });
    childrenToRender = interleaved;
  }

  const rendered = (
    <Component node={resolvedNode} cssStyle={cssStyleForInner}>
      {childrenToRender}
    </Component>
  );

  const isSelected = selection?.includes(node.id) ?? false;

  const wrapped =
    mode === "edit" ? (
      <EditModeWrapper
        id={node.id}
        type={node.type}
        mode={mode}
        selected={isSelected}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        passthroughStyle={computeWrapperPassthroughStyle(node)}
      >
        {rendered}
      </EditModeWrapper>
    ) : (
      rendered
    );

  return (
    <ComponentErrorBoundary key={node.id} id={node.id}>
      {wrapped}
    </ComponentErrorBoundary>
  );
}

export const ComponentRenderer = memo(ComponentRendererInner);
ComponentRenderer.displayName = "ComponentRenderer";
