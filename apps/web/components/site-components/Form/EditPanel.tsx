"use client";

import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

const HELP_COPY =
  "Drop an InputField for each value you want to collect, then a Button with type Submit at the bottom.";
const FORM_NAME_HELP_EMPTY = "Required for submissions to be saved.";
const SUCCESS_MESSAGE_HELP = "Shown after a successful submission. Defaults to 'Thank you.'";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type FormEditPanelProps = { node: ComponentNode };

export function FormEditPanel({ node }: FormEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const formName = readString(node.props.formName);
  const successMessage = readString(node.props.successMessage);

  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  return (
    <div data-component-edit-panel="Form" className="space-y-3">
      <TextInput
        id="form-name"
        label="Form Name"
        value={formName}
        onChange={(next) => writePartial({ formName: next })}
        placeholder="contact_us"
        helper={formName.trim() === "" ? FORM_NAME_HELP_EMPTY : undefined}
        testId="form-name"
      />
      <TextInput
        id="form-success-message"
        label="Success Message"
        value={successMessage}
        onChange={(next) => writePartial({ successMessage: next })}
        placeholder="Thank you."
        helper={SUCCESS_MESSAGE_HELP}
        testId="form-success-message"
      />
      <p className="text-[11px] leading-relaxed text-zinc-500">{HELP_COPY}</p>
    </div>
  );
}
