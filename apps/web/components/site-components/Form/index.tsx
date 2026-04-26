"use client";

// Sprint 5 ships the Form SHELL only. PROJECT_SPEC.md §8.10 describes
// the full submission behavior (POST to the submission endpoint, Data tab
// listing). Sprint 10 owns that work.
//
// In this sprint:
//   - We render <form noValidate> with the user's children.
//   - The submit handler calls event.preventDefault() so preview is safe.
//   - We do NOT POST anywhere.
//   - We do NOT call any HTTP client.
//
// Touching any of those in this sprint is a Deviation.
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { z } from "zod";

const formPropsSchema = z.object({
  formName: z.string().min(1),
  submitLabel: z.string().default("Submit"),
  successMessage: z.string().default("Thank you."),
});

type FormProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

export function Form({ node, cssStyle, children }: FormProps) {
  const parsed = formPropsSchema.safeParse(node.props);
  const formName = parsed.success ? parsed.data.formName : "form";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      data-component-id={node.id}
      data-component-type="Form"
      data-form-name={formName}
      noValidate
      onSubmit={handleSubmit}
      style={cssStyle}
    >
      {children}
    </form>
  );
}
