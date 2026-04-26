"use client";

import { type ReactNode, createContext } from "react";

// Discriminated union — consumers narrow on `kind` rather than truthiness of
// `row`, which keeps `null` rows (a valid row that happens to be `null`)
// distinguishable from "no row in scope". `kind` is the only field allowed
// to be null when nothing is provided.
export type RowProvided = { row: unknown; kind: "repeater" | "detail" } | { row: null; kind: null };

const NO_ROW: RowProvided = { row: null, kind: null };

export const RowContext = createContext<RowProvided>(NO_ROW);

export type RowContextProviderProps = {
  row: unknown;
  kind: "repeater" | "detail";
  children: ReactNode;
};

export function RowContextProvider({ row, kind, children }: RowContextProviderProps) {
  // `row === undefined` is treated as "no row" so callers don't have to
  // branch in the JSX. This keeps the empty-state path clean: a Repeater
  // can wrap a fallback in a provider without polluting descendants.
  const value: RowProvided = row === undefined ? NO_ROW : { row, kind };
  return <RowContext.Provider value={value}>{children}</RowContext.Provider>;
}
