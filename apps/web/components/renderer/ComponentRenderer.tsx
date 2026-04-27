"use client";

import { BetweenDropZone } from "@/components/editor/canvas/dnd/BetweenDropZone";
import { EmptyContainerOverlay } from "@/components/editor/canvas/dnd/EmptyContainerOverlay";
import { getChildrenPolicy } from "@/components/editor/canvas/dnd/dropTargetPolicy";
import { componentRegistry } from "@/components/site-components/registry";
import { useRow } from "@/lib/row-context";
import { styleConfigToCss } from "@/lib/site-config";
import { resolveTokens } from "@/lib/token-resolver";
import type { ComponentNode } from "@/types/site-config";
import { type ReactNode, memo, useMemo } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { EditModeWrapper } from "./EditModeWrapper";

export type Mode = "edit" | "preview" | "public";

export type ComponentRendererProps = {
  node: ComponentNode;
  mode: Mode;
  selection?: string[];
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string) => void;
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
    const elements = childElements ?? [];
    const interleaved: ReactNode[] = [];
    interleaved.push(
      <BetweenDropZone
        key={`bz-${node.id}-0`}
        parentId={node.id}
        index={0}
        orientation={orientation}
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
        />,
      );
    });
    childrenToRender = interleaved;
  }

  const rendered = (
    <Component node={resolvedNode} cssStyle={cssStyle}>
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
