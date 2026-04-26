"use client";

// Sprint 10 — wires the public-facing Form to POST to
// /api/form-submissions per PROJECT_SPEC.md §8.10. Edit context (URL path
// like /{slug}/edit) is detected purely from window.location.pathname; the
// renderer has no mode context and adding one is Sprint 3 / Sprint 6
// territory per the Sprint 10 CLAUDE.md hint. Real preview happens at
// /{slug}/preview (Sprint 4); the in-editor preview toggle keeps the URL
// at /edit so the form is also a no-op there by design.

import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, type FormEvent, type ReactNode, useState } from "react";
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

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const SUBMISSION_ENDPOINT = "/api/form-submissions";
const DEFAULT_SUCCESS_MESSAGE = "Thank you.";
const ERROR_MESSAGE = "We couldn't submit your form. Please try again.";

export function Form({ node, cssStyle, children }: FormProps) {
  const parsed = formPropsSchema.safeParse(node.props);
  const formName = parsed.success ? parsed.data.formName : "form";
  const successMessage = parsed.success ? parsed.data.successMessage : DEFAULT_SUCCESS_MESSAGE;

  const [state, setState] = useState<SubmissionState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (typeof window === "undefined") return;

    const segments = window.location.pathname.split("/");
    if (segments[2] === "edit") return;

    const rawFormName = readString(node.props.formName);
    if (!rawFormName) {
      // formName is the form_id partition for the submissions table. A blank
      // formName would silently merge submissions across forms — bail with a
      // visible warning instead.
      console.warn("[Form] Skipping submission: missing or empty formName.");
      return;
    }

    const submittedData = readFormData(event.currentTarget);
    const { siteSlug, pageSlug } = parseLocationContext(segments);

    setState({ status: "submitting" });

    try {
      const res = await fetch(SUBMISSION_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteSlug, formId: rawFormName, pageSlug, submittedData }),
      });
      if (!res.ok) {
        setState({ status: "error", message: ERROR_MESSAGE });
        return;
      }
      setState({ status: "success", message: successMessage });
    } catch {
      setState({ status: "error", message: ERROR_MESSAGE });
    }
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
      {state.status === "success" ? (
        <output data-form-success>{state.message}</output>
      ) : (
        <>
          {children}
          {state.status === "error" ? (
            <div data-form-error role="alert" style={{ marginTop: "8px", color: "#b91c1c" }}>
              {state.message}
            </div>
          ) : null}
        </>
      )}
    </form>
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseLocationContext(segments: string[]): { siteSlug: string; pageSlug: string | null } {
  const siteSlug = segments[1] ?? "";
  // /{slug}/preview reads the active page from `?page=...`, defaulting to "home".
  if (segments[2] === "preview") {
    const page = new URLSearchParams(window.location.search).get("page");
    return { siteSlug, pageSlug: page && page.length > 0 ? page : "home" };
  }
  const trailing = segments.slice(2).filter((s) => s.length > 0);
  return { siteSlug, pageSlug: trailing.length > 0 ? trailing.join("/") : null };
}

function readFormData(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const accumulator = new Map<string, string[]>();
  for (const [key, value] of data.entries()) {
    // The demo doesn't ship file upload (PROJECT_SPEC.md §17). Skip Files
    // explicitly so they don't leak into submitted_data as serialized blobs.
    if (value instanceof File) continue;
    const stringValue = typeof value === "string" ? value : String(value);
    const existing = accumulator.get(key);
    if (existing) existing.push(stringValue);
    else accumulator.set(key, [stringValue]);
  }
  const out: Record<string, string> = {};
  for (const [key, values] of accumulator) {
    out[key] = values.length > 1 ? values.join(", ") : (values[0] ?? "");
  }
  return out;
}
