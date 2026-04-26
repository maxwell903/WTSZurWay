"use client";

import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import {
  type SelectOptionEntry,
  SelectOptionsEditor,
} from "@/components/editor/edit-panels/controls/SelectOptionsEditor";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const INPUT_TYPE_OPTIONS = ["text", "email", "tel", "number", "textarea", "select", "checkbox"].map(
  (v) => ({ label: v, value: v }),
);

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readBool(props: Record<string, unknown>, key: string): boolean {
  return props[key] === true;
}

function readOptions(props: Record<string, unknown>): SelectOptionEntry[] {
  if (!Array.isArray(props.options)) return [];
  return props.options
    .filter((opt): opt is SelectOptionEntry => {
      if (!opt || typeof opt !== "object") return false;
      const o = opt as Record<string, unknown>;
      return typeof o.label === "string" && typeof o.value === "string";
    })
    .map((opt) => ({ label: opt.label, value: opt.value }));
}

export type InputFieldEditPanelProps = { node: ComponentNode };

export function InputFieldEditPanel({ node }: InputFieldEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  const inputType = readString(node.props, "inputType", "text");
  const isSelect = inputType === "select";

  return (
    <div data-component-edit-panel="InputField" className="space-y-3">
      <TextInput
        id="input-name"
        label="Name (required)"
        value={readString(node.props, "name")}
        placeholder="field_key"
        testId="input-name"
        onChange={(next) => writePartial({ name: next })}
      />
      <TextInput
        id="input-label"
        label="Label"
        value={readString(node.props, "label")}
        testId="input-label"
        onChange={(next) => writePartial({ label: next })}
      />
      <SelectInput
        id="input-type"
        label="Input type"
        value={inputType}
        options={INPUT_TYPE_OPTIONS}
        testId="input-type"
        onChange={(next) => writePartial({ inputType: next })}
      />
      <TextInput
        id="input-placeholder"
        label="Placeholder"
        value={readString(node.props, "placeholder")}
        testId="input-placeholder"
        onChange={(next) => writePartial({ placeholder: next })}
      />
      <SwitchInput
        id="input-required"
        label="Required"
        value={readBool(node.props, "required")}
        testId="input-required"
        onChange={(next) => writePartial({ required: next })}
      />
      <TextInput
        id="input-default-value"
        label="Default value"
        value={readString(node.props, "defaultValue")}
        testId="input-default-value"
        onChange={(next) => writePartial({ defaultValue: next === "" ? undefined : next })}
      />
      {isSelect ? (
        <SelectOptionsEditor
          id="input-options"
          value={readOptions(node.props)}
          testId="input-options"
          onChange={(next) => writePartial({ options: next })}
        />
      ) : null}
      <TextInput
        id="input-default-from-query"
        label="Default from query parameter"
        value={readString(node.props, "defaultValueFromQueryParam")}
        helper="Reads `?<param>` from the current URL on render."
        testId="input-default-from-query"
        onChange={(next) =>
          writePartial({ defaultValueFromQueryParam: next === "" ? undefined : next })
        }
      />
    </div>
  );
}
