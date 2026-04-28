"use client";

// Sprint 9 (PROJECT_SPEC.md §8.9): the Repeater Content tab. Six sections —
// Data Source, Filters, Connected Inputs, Sort, Limit, Empty State — each
// driving a single `setComponentDataBinding` call so the topbar Save action
// picks up the change on the next user click.

import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { Label } from "@/components/ui/label";
import { selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import type { ComponentNode, DataBinding } from "@/lib/site-config";
import {
  type ConnectedInput,
  type DataBindingSource,
  type FilterRuleGroup,
  filterRuleGroupSchema,
} from "@/lib/site-config/data-binding";
import { useMemo } from "react";
import { type Field, QueryBuilder, type RuleGroupType } from "react-querybuilder";

const SOURCE_OPTIONS: { label: string; value: DataBindingSource }[] = [
  { label: "Properties", value: "properties" },
  { label: "Units", value: "units" },
  { label: "Units with Property", value: "units_with_property" },
  { label: "Company (single row)", value: "company" },
];

// Camel-case field lists per §15.3 boundary translation. The keys match the
// runtime Unit / Property / Company shapes returned by `lib/rm-api/`. The
// `units_with_property` join (see `data-binding/fetchSource.ts`) adds the
// `property_*` flat-prefixed fields to the unit row.
const FIELDS_BY_SOURCE: Record<DataBindingSource, Field[]> = {
  properties: [
    { name: "id", label: "ID", inputType: "number" },
    { name: "name", label: "Name" },
    { name: "shortName", label: "Short Name" },
    { name: "propertyType", label: "Property Type" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "postalCode", label: "Postal Code" },
    { name: "email", label: "Email" },
    { name: "primaryPhone", label: "Primary Phone" },
  ],
  units: [
    { name: "id", label: "ID", inputType: "number" },
    { name: "propertyId", label: "Property ID", inputType: "number" },
    { name: "unitName", label: "Unit Name" },
    { name: "squareFootage", label: "Square Footage", inputType: "number" },
    { name: "bedrooms", label: "Bedrooms", inputType: "number" },
    { name: "bathrooms", label: "Bathrooms", inputType: "number" },
    { name: "currentMarketRent", label: "Current Market Rent", inputType: "number" },
    { name: "isAvailable", label: "Is Available" },
    { name: "availableDate", label: "Available Date" },
    { name: "description", label: "Description" },
  ],
  units_with_property: [
    { name: "id", label: "Unit ID", inputType: "number" },
    { name: "unitName", label: "Unit Name" },
    { name: "bedrooms", label: "Bedrooms", inputType: "number" },
    { name: "bathrooms", label: "Bathrooms", inputType: "number" },
    { name: "currentMarketRent", label: "Current Market Rent", inputType: "number" },
    { name: "squareFootage", label: "Square Footage", inputType: "number" },
    { name: "isAvailable", label: "Is Available" },
    { name: "property_name", label: "Property Name" },
    { name: "property_city", label: "Property City" },
    { name: "property_state", label: "Property State" },
    { name: "property_propertyType", label: "Property Type" },
  ],
  company: [
    { name: "id", label: "ID", inputType: "number" },
    { name: "name", label: "Company Name" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
  ],
};

const CONNECTED_INPUT_OPERATORS = [
  { label: "equals", value: "=" },
  { label: "not equals", value: "!=" },
  { label: "contains", value: "contains" },
  { label: "begins with", value: "beginsWith" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
];

const SORT_DIRECTION_OPTIONS = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

function findInputFields(node: ComponentNode | undefined): ComponentNode[] {
  if (!node) return [];
  const out: ComponentNode[] = [];
  const walk = (n: ComponentNode) => {
    if (n.type === "InputField") out.push(n);
    n.children?.forEach(walk);
  };
  walk(node);
  return out;
}

function inputFieldLabel(node: ComponentNode): string {
  const props = node.props as { label?: unknown; name?: unknown };
  if (typeof props.label === "string" && props.label.length > 0) return props.label;
  if (typeof props.name === "string" && props.name.length > 0) return props.name;
  return node.id;
}

function readEmptyStateText(emptyState: ComponentNode | undefined): string {
  if (!emptyState) return "";
  const props = emptyState.props as { text?: unknown };
  return typeof props.text === "string" ? props.text : "";
}

function makeEmptyStateNode(parentId: string, text: string): ComponentNode | undefined {
  if (!text) return undefined;
  return {
    id: `${parentId}-empty`,
    type: "Paragraph",
    props: { text },
    style: {},
  };
}

function readFilterGroup(filters: unknown): RuleGroupType {
  const parsed = filterRuleGroupSchema.safeParse(filters);
  if (parsed.success) {
    // FilterRuleGroup is structurally compatible with RuleGroupType — both
    // carry { combinator, rules } with the same rule shape.
    return parsed.data as unknown as RuleGroupType;
  }
  return { combinator: "and", rules: [] };
}

export type RepeaterEditPanelProps = { node: ComponentNode };

export function RepeaterEditPanel({ node }: RepeaterEditPanelProps) {
  const setComponentDataBinding = useEditorStore((s) => s.setComponentDataBinding);
  const currentPage = useEditorStore(selectCurrentPage);

  const binding: DataBinding | undefined = node.dataBinding;
  const source: DataBindingSource = binding?.source ?? "units";

  const inputFields = useMemo(
    () => findInputFields(currentPage?.rootComponent),
    [currentPage?.rootComponent],
  );

  const fields = FIELDS_BY_SOURCE[source];
  const fieldOptions = fields.map((f) => ({ label: f.label ?? f.name, value: f.name }));

  const sortField = binding?.sort?.field ?? "";
  const sortDirection = binding?.sort?.direction ?? "asc";
  const limit = binding?.limit;
  const emptyStateText = readEmptyStateText(binding?.emptyState);
  const connectedInputs: ConnectedInput[] = binding?.connectedInputs ?? [];

  const writeBinding = (patch: Partial<DataBinding>) => {
    const next: DataBinding = {
      source,
      ...binding,
      ...patch,
    };
    setComponentDataBinding(node.id, next);
  };

  const handleSourceChange = (nextSource: string) => {
    writeBinding({ source: nextSource as DataBindingSource });
  };

  const handleFiltersChange = (q: RuleGroupType) => {
    const cleaned: FilterRuleGroup = q as unknown as FilterRuleGroup;
    writeBinding({ filters: cleaned });
  };

  const handleConnectedInputsChange = (next: ConnectedInput[]) => {
    writeBinding({ connectedInputs: next });
  };

  const handleSortChange = (next: { field?: string; direction?: "asc" | "desc" }) => {
    const newField = next.field ?? sortField;
    const newDirection = next.direction ?? sortDirection;
    if (!newField) {
      writeBinding({ sort: undefined });
      return;
    }
    writeBinding({ sort: { field: newField, direction: newDirection } });
  };

  const handleLimitChange = (next: number | undefined) => {
    writeBinding({ limit: next });
  };

  const handleEmptyStateText = (text: string) => {
    writeBinding({ emptyState: makeEmptyStateNode(node.id, text) });
  };

  const filterQuery = readFilterGroup(binding?.filters);

  return (
    <div data-component-edit-panel="Repeater" className="space-y-4">
      <SelectInput
        id="rep-source"
        label="Data Source"
        value={source}
        options={SOURCE_OPTIONS}
        onChange={handleSourceChange}
        testId="repeater-source"
      />

      {source !== "company" ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-300">Filters</Label>
          <div data-testid="repeater-filters" className="rounded-md border border-zinc-700 p-2">
            <QueryBuilder fields={fields} query={filterQuery} onQueryChange={handleFiltersChange} />
          </div>
        </div>
      ) : null}

      <ConnectedInputsEditor
        inputFields={inputFields}
        fieldOptions={fieldOptions}
        connections={connectedInputs}
        onChange={handleConnectedInputsChange}
        sourceIsSingleRow={source === "company"}
      />

      <div className="grid grid-cols-2 gap-2" data-testid="repeater-sort">
        <SelectInput
          id="rep-sort-field"
          label="Sort field"
          value={sortField}
          options={[{ label: "(none)", value: "" }, ...fieldOptions]}
          onChange={(next) => handleSortChange({ field: next })}
        />
        <SelectInput
          id="rep-sort-direction"
          label="Direction"
          value={sortDirection}
          options={SORT_DIRECTION_OPTIONS}
          onChange={(next) => handleSortChange({ direction: next as "asc" | "desc" })}
          disabled={!sortField}
        />
      </div>

      <NumberInput
        id="rep-limit"
        label="Limit"
        value={limit}
        onChange={handleLimitChange}
        min={0}
        testId="repeater-limit"
      />

      <TextInput
        id="rep-empty"
        label="Empty-state message"
        value={emptyStateText}
        onChange={handleEmptyStateText}
        placeholder="No results match."
        helper="Shown to visitors when the configured filters / connected inputs return no rows."
        testId="repeater-empty-state"
      />
    </div>
  );
}

type ConnectedInputsEditorProps = {
  inputFields: ComponentNode[];
  fieldOptions: { label: string; value: string }[];
  connections: ConnectedInput[];
  onChange: (next: ConnectedInput[]) => void;
  sourceIsSingleRow: boolean;
};

function ConnectedInputsEditor({
  inputFields,
  fieldOptions,
  connections,
  onChange,
  sourceIsSingleRow,
}: ConnectedInputsEditorProps) {
  const inputOptions = inputFields.map((f) => ({
    label: inputFieldLabel(f),
    value: f.id,
  }));

  const handleAdd = () => {
    const firstInput = inputFields[0];
    const firstField = fieldOptions[0];
    onChange([
      ...connections,
      {
        inputId: firstInput?.id ?? "",
        field: firstField?.value ?? "",
        operator: "contains",
      },
    ]);
  };

  const handleRow = (idx: number, patch: Partial<ConnectedInput>) => {
    const next = connections.slice();
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(connections.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2" data-testid="repeater-connected-inputs">
      <Label className="text-xs text-zinc-300">Connected Inputs</Label>
      {sourceIsSingleRow ? (
        <p className="text-[11px] text-zinc-500">
          Connected inputs do nothing for a <code>company</code> binding (single row).
        </p>
      ) : null}
      {connections.map((conn, idx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: connection rows have no stable id
          key={`conn-${idx}`}
          className="grid grid-cols-12 gap-1 rounded-md border border-zinc-800 p-2"
          data-testid={`repeater-connection-${idx}`}
        >
          <div className="col-span-4">
            <SelectInput
              id={`rep-conn-input-${idx}`}
              label="Input"
              value={conn.inputId}
              options={
                inputOptions.length > 0
                  ? inputOptions
                  : [{ label: "(no InputField on this page)", value: "" }]
              }
              onChange={(next) => handleRow(idx, { inputId: next })}
            />
          </div>
          <div className="col-span-4">
            <SelectInput
              id={`rep-conn-field-${idx}`}
              label="Field"
              value={conn.field}
              options={fieldOptions}
              onChange={(next) => handleRow(idx, { field: next })}
            />
          </div>
          <div className="col-span-3">
            <SelectInput
              id={`rep-conn-op-${idx}`}
              label="Operator"
              value={conn.operator}
              options={CONNECTED_INPUT_OPERATORS}
              onChange={(next) => handleRow(idx, { operator: next })}
            />
          </div>
          <div className="col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="h-9 w-9 rounded-md text-zinc-400 hover:bg-zinc-800"
              aria-label={`Remove connection ${idx + 1}`}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="text-xs font-medium text-orange-400 hover:text-orange-300"
        data-testid="repeater-connection-add"
      >
        + Add connection
      </button>
    </div>
  );
}
