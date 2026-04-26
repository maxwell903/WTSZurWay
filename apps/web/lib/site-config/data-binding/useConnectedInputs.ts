"use client";

import { useEffect, useState } from "react";
import type { ConnectedInput } from "./types";

const DEBOUNCE_MS = 150;

function readControlValue(el: Element): string {
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return el.checked ? el.value : "";
    return el.value;
  }
  if (el instanceof HTMLTextAreaElement) return el.value;
  if (el instanceof HTMLSelectElement) return el.value;
  return "";
}

function selectorFor(inputId: string): string {
  // Match the first form-control descendant of the connected wrapper. The
  // Sprint 5 InputField wraps its <input>/<textarea>/<select> inside a div
  // that carries `data-component-id`, so this selector finds it without the
  // hook ever importing InputField.
  const base = `[data-component-id="${inputId}"]`;
  return `${base} input, ${base} textarea, ${base} select`;
}

function snapshotValues(connections: ConnectedInput[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const conn of connections) {
    if (typeof document === "undefined") {
      next[conn.inputId] = "";
      continue;
    }
    const el = document.querySelector(selectorFor(conn.inputId));
    next[conn.inputId] = el ? readControlValue(el) : "";
  }
  return next;
}

export function useConnectedInputs(connections: ConnectedInput[]): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Initial mount-read so callers don't have to wait for a first event.
    setValues(snapshotValues(connections));

    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const cleanups: Array<() => void> = [];

    for (const conn of connections) {
      const el = document.querySelector(selectorFor(conn.inputId));
      if (!el) continue;
      const handler = () => {
        const v = readControlValue(el);
        const existing = debounceTimers.get(conn.inputId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setValues((prev) => ({ ...prev, [conn.inputId]: v }));
        }, DEBOUNCE_MS);
        debounceTimers.set(conn.inputId, timer);
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
      cleanups.push(() => {
        el.removeEventListener("input", handler);
        el.removeEventListener("change", handler);
      });
    }

    return () => {
      for (const fn of cleanups) fn();
      for (const t of debounceTimers.values()) clearTimeout(t);
    };
  }, [connections]);

  return values;
}
