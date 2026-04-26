"use client";

// SetupExperience -- Element 1's client coordinator. Owns the panel state
// for the preview iframe, mounts the setup form, and on form submit posts
// to /api/generate-initial-site. Replaces the bare <SetupForm /> on
// /setup so Save triggers a generation and updates the preview panel.
//
// State machine (PanelState):
//   empty -> generating (POST starts) -> generated (200) | error (4xx/5xx)
//   error -> generating (Retry click) -> generated | error
//
// The retry path simply re-runs the last submitted payload. We stash the
// last payload in a ref so the user doesn't have to re-fill the form on
// transient failures.

import type { AiError } from "@/lib/ai/errors";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { useRef, useState } from "react";
import { PreviewPanel, type PanelState } from "./PreviewPanel";
import { SetupForm } from "./setup-form";

export function SetupExperience() {
  const [panelState, setPanelState] = useState<PanelState>({ kind: "empty" });
  const lastPayload = useRef<SetupFormValues | null>(null);

  const submit = async (values: SetupFormValues) => {
    lastPayload.current = values;
    setPanelState({ kind: "generating" });
    try {
      const response = await fetch("/api/generate-initial-site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = extractError(body);
        setPanelState({ kind: "error", error });
        return;
      }
      const ok = body as {
        siteId?: string;
        slug?: string;
        versionId?: string;
        previewUrl?: string;
      } | null;
      if (!ok || !ok.previewUrl || !ok.slug) {
        setPanelState({
          kind: "error",
          error: {
            kind: "invalid_output",
            message: "Unexpected response shape from /api/generate-initial-site",
          },
        });
        return;
      }
      setPanelState({
        kind: "generated",
        previewUrl: ok.previewUrl,
        siteSlug: ok.slug,
      });
    } catch (e) {
      setPanelState({
        kind: "error",
        error: {
          kind: "network_error",
          message: e instanceof Error ? e.message : "Network request failed",
        },
      });
    }
  };

  const retry = () => {
    if (!lastPayload.current) return;
    void submit(lastPayload.current);
  };

  return (
    <>
      <SetupForm onValid={(values) => void submit(values)} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-10">
        <PreviewPanel state={panelState} onRetry={retry} />
      </div>
    </>
  );
}

function extractError(body: unknown): AiError {
  // The API route returns { error: AiError } on failure. Fall back to a
  // generic auth_error if the shape is unexpected so the UI never crashes
  // on an undefined error.kind.
  if (body && typeof body === "object" && "error" in body) {
    const candidate = (body as { error: unknown }).error;
    if (
      candidate &&
      typeof candidate === "object" &&
      "kind" in candidate &&
      "message" in candidate
    ) {
      return candidate as AiError;
    }
  }
  return {
    kind: "auth_error",
    message: "Service unavailable, please try again later.",
  };
}
