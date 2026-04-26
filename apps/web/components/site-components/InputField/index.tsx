"use client";

// Sprint 5b backfill: InputField is now a client component because of
// `defaultValueFromQueryParam` (PROJECT_SPEC.md §8.12). On mount, when the
// prop is set, the input reads `window.location.search` and uses the
// resolved value as its initial value. Sprint 10's Form will continue to
// read submitted values via FormData, which works with controlled inputs
// that have a `name` attribute.
//
// In this sprint we do NOT:
//   - Manage form-level submission state (Sprint 10 owns that).
//   - Read row context or resolve `{{ row.* }}` tokens (Sprint 9b owns that).
//   - Validate the `name` field for uniqueness within a Form (Sprint 10 enforces).
// Touching any of those here is a Deviation.

import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { z } from "zod";

const inputFieldPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().default(""),
  inputType: z
    .enum(["text", "email", "tel", "number", "textarea", "select", "checkbox"])
    .default("text"),
  placeholder: z.string().default(""),
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  // Sprint 5b backfill — PROJECT_SPEC.md §8.12.
  defaultValueFromQueryParam: z.string().optional(),
});

type InputFieldData = z.infer<typeof inputFieldPropsSchema>;

type InputFieldProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

const FALLBACK_DATA: InputFieldData = {
  name: "field",
  label: "",
  inputType: "text",
  placeholder: "",
  required: false,
  defaultValue: undefined,
  options: undefined,
  defaultValueFromQueryParam: undefined,
};

const baseControlStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
};

function isCheckboxTruthy(raw: string | undefined): boolean {
  return raw === "true" || raw === "on";
}

export function InputField({ node, cssStyle }: InputFieldProps) {
  const parsed = inputFieldPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : FALLBACK_DATA;

  const [value, setValue] = useState<string>(data.defaultValue ?? "");
  const [checked, setChecked] = useState<boolean>(isCheckboxTruthy(data.defaultValue));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!data.defaultValueFromQueryParam) return;
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(data.defaultValueFromQueryParam);
    if (queryValue !== null) {
      setValue(queryValue);
      setChecked(isCheckboxTruthy(queryValue));
    }
  }, [data.defaultValueFromQueryParam]);

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    ...cssStyle,
  };

  return (
    <div
      data-component-id={node.id}
      data-component-type="InputField"
      data-input-name={data.name}
      style={wrapperStyle}
    >
      {data.label ? (
        <label htmlFor={data.name} style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
          {data.label}
          {data.required ? " *" : null}
        </label>
      ) : null}
      {renderControl(data, value, setValue, checked, setChecked)}
    </div>
  );
}

function renderControl(
  data: InputFieldData,
  value: string,
  setValue: (next: string) => void,
  checked: boolean,
  setChecked: (next: boolean) => void,
) {
  if (data.inputType === "textarea") {
    return (
      <textarea
        name={data.name}
        placeholder={data.placeholder}
        required={data.required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        style={baseControlStyle}
      />
    );
  }
  if (data.inputType === "select") {
    return (
      <select
        name={data.name}
        required={data.required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={baseControlStyle}
      >
        {(data.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
  if (data.inputType === "checkbox") {
    return (
      <input
        type="checkbox"
        name={data.name}
        required={data.required}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        style={{ width: "16px", height: "16px" }}
      />
    );
  }
  return (
    <input
      type={data.inputType}
      name={data.name}
      placeholder={data.placeholder}
      required={data.required}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={baseControlStyle}
    />
  );
}
