import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
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

function renderControl(data: InputFieldData) {
  if (data.inputType === "textarea") {
    return (
      <textarea
        name={data.name}
        placeholder={data.placeholder}
        required={data.required}
        defaultValue={data.defaultValue}
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
        defaultValue={data.defaultValue}
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
        defaultChecked={data.defaultValue === "true" || data.defaultValue === "on"}
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
      defaultValue={data.defaultValue}
      style={baseControlStyle}
    />
  );
}

export function InputField({ node, cssStyle }: InputFieldProps) {
  const parsed = inputFieldPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : FALLBACK_DATA;

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
      {renderControl(data)}
    </div>
  );
}
