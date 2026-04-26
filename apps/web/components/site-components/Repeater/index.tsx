"use client";

// Sprint 9: the Repeater is the central data-binding mechanic
// (PROJECT_SPEC.md §8.9). It fetches rows for `node.dataBinding.source`
// via TanStack Query, applies filters / connected-input live rules / sort
// / limit, and renders the template child once per row inside a
// `RowContextProvider` so descendant `{{ row.* }}` tokens resolve.
// Sprint 9b extends `RowContextProvider` to detail pages without rewriting
// either side of this contract.

import { ComponentRenderer } from "@/components/renderer/ComponentRenderer";
import { RowContextProvider } from "@/lib/row-context";
import {
  DATA_BINDING_SOURCES,
  type DataBindingSource,
  type FilterRuleGroup,
  applyFilters,
  applyLimit,
  applySort,
  dataBindingQueryKey,
  fetchSource,
  filterRuleGroupSchema,
  useConnectedInputs,
} from "@/lib/site-config/data-binding";
import type { ComponentNode, DataBinding } from "@/types/site-config";
import { useQuery } from "@tanstack/react-query";
import { type CSSProperties, Children, type ReactNode, useMemo } from "react";

type RepeaterProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

const SKELETON_COUNT = 3;

const skeletonStyle: CSSProperties = {
  background: "#e5e7eb",
  borderRadius: "8px",
  height: "120px",
  width: "100%",
  marginBottom: "12px",
};

const errorMessageStyle: CSSProperties = {
  padding: "12px",
  color: "#7f1d1d",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  fontSize: "13px",
};

function isRecognizedSource(source: string): source is DataBindingSource {
  return (DATA_BINDING_SOURCES as readonly string[]).includes(source);
}

function rowKey(row: unknown, idx: number): string {
  if (row !== null && typeof row === "object" && "id" in row) {
    const id = (row as { id: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return `r-${id}`;
  }
  try {
    return `r-${JSON.stringify(row).slice(0, 64)}-${idx}`;
  } catch {
    return `r-idx-${idx}`;
  }
}

function withSyntheticConnectedInputRules(
  binding: DataBinding,
  connectedInputValues: Record<string, string>,
): FilterRuleGroup {
  const baseGroup =
    binding.filters !== undefined
      ? filterRuleGroupSchema.safeParse(binding.filters).data
      : undefined;

  // Connected inputs become synthetic AND rules joined to the user's
  // explicit filter group. Empty input values are skipped — an empty
  // contains/= rule would otherwise wipe out the entire result set.
  const synthetic = (binding.connectedInputs ?? [])
    .filter((c) => {
      const v = connectedInputValues[c.inputId];
      return typeof v === "string" && v.length > 0;
    })
    .map((c) => ({
      field: c.field,
      operator: c.operator,
      value: connectedInputValues[c.inputId] ?? "",
    }));

  if (synthetic.length === 0) {
    return baseGroup ?? { combinator: "and", rules: [] };
  }
  if (!baseGroup) {
    return { combinator: "and", rules: synthetic };
  }
  return {
    combinator: "and",
    rules: [...synthetic, baseGroup],
  };
}

export function Repeater({ node, cssStyle, children }: RepeaterProps) {
  const binding = node.dataBinding;
  const sourceIsValid = binding !== undefined && isRecognizedSource(binding.source);

  const childArray = Children.toArray(children);
  const templateElement = childArray[0] ?? null;

  const connections = useMemo(() => binding?.connectedInputs ?? [], [binding?.connectedInputs]);
  const connectedInputValues = useConnectedInputs(connections);

  const queryKey = useMemo(
    () =>
      sourceIsValid && binding ? dataBindingQueryKey(binding, connectedInputValues) : ["disabled"],
    [sourceIsValid, binding, connectedInputValues],
  );

  const query = useQuery<unknown[]>({
    queryKey,
    queryFn: async () => {
      if (!sourceIsValid || !binding) return [];
      return fetchSource(binding.source);
    },
    enabled: sourceIsValid,
  });

  const wrapperProps = {
    "data-component-id": node.id,
    "data-component-type": "Repeater",
    style: cssStyle,
  };

  if (!sourceIsValid || !binding) {
    return <div {...wrapperProps} />;
  }

  if (query.isLoading) {
    return (
      <div {...wrapperProps}>
        <div aria-hidden="true">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders never reorder
              key={`sk-${i}`}
              data-repeater-skeleton="true"
              style={skeletonStyle}
            />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div {...wrapperProps}>
        <div role="alert" style={errorMessageStyle}>
          Couldn&apos;t load data
        </div>
      </div>
    );
  }

  const rawRows = query.data ?? [];

  // For company source, we always iterate exactly once (single-row list)
  // — filters and sort don't apply meaningfully but running them is safe.
  const filterGroup = withSyntheticConnectedInputRules(binding, connectedInputValues);
  const filtered = applyFilters(rawRows, filterGroup);
  const sorted = applySort(filtered, binding.sort);
  const limited = applyLimit(sorted, binding.limit);

  if (limited.length === 0) {
    if (binding.emptyState) {
      // Empty state renders OUTSIDE any RowContextProvider — empty-state
      // messages cannot reference per-row data.
      return (
        <div {...wrapperProps}>
          <ComponentRenderer node={binding.emptyState} mode="preview" />
        </div>
      );
    }
    return <div {...wrapperProps} />;
  }

  return (
    <div {...wrapperProps}>
      {limited.map((row, idx) => (
        <RowContextProvider key={rowKey(row, idx)} row={row} kind="repeater">
          {templateElement}
        </RowContextProvider>
      ))}
    </div>
  );
}
