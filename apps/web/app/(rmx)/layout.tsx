"use client";

// Layout owns the per-page sub-bar title via context (the "recommended" approach
// from CLAUDE.md notes). Pages call `<SetSubBarTitle title="..." />` to publish
// their title; the inner component reads it and forwards it to <RmxShell>.
// Trade-off accepted: a brief default-title flash on first paint when navigating
// between (rmx) pages — fine for this app, no SSR'd-correct-title requirement.

import { RmxShell } from "@/components/rmx-shell/rmx-shell";
import { SubBarProvider, useSubBarTitleValue } from "@/components/rmx-shell/sub-bar-context";
import type { ReactNode } from "react";

function ShellWithDynamicTitle({ children }: { children: ReactNode }) {
  const title = useSubBarTitleValue();
  return <RmxShell subBarTitle={title}>{children}</RmxShell>;
}

export default function RmxLayout({ children }: { children: ReactNode }) {
  return (
    <SubBarProvider>
      <ShellWithDynamicTitle>{children}</ShellWithDynamicTitle>
    </SubBarProvider>
  );
}
