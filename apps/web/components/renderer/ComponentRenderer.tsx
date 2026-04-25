"use client";

import { componentRegistry } from "@/components/site-components/registry";
import { styleConfigToCss } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import { memo, useMemo } from "react";
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

function ComponentRendererInner({
  node,
  mode,
  selection,
  onSelect,
  onContextMenu,
}: ComponentRendererProps) {
  const cssStyle = useMemo(() => styleConfigToCss(node.style), [node.style]);

  const entry = componentRegistry[node.type];
  if (!entry) {
    // noUncheckedIndexedAccess narrows the lookup to | undefined; in practice
    // ComponentType is the registry's key so this is unreachable when the
    // config has been validated through siteConfigSchema first.
    throw new Error(`Unknown component type: ${String(node.type)}`);
  }
  const Component = entry.Component;

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

  const rendered = (
    <Component node={node} cssStyle={cssStyle}>
      {childElements}
    </Component>
  );

  const isSelected = selection?.includes(node.id) ?? false;

  const wrapped =
    mode === "edit" ? (
      <EditModeWrapper
        id={node.id}
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
