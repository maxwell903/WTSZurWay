import { RmxSubBar } from "@/components/rmx-shell/rmx-sub-bar";
import { RmxTopBar } from "@/components/rmx-shell/rmx-top-bar";
import type { ReactNode } from "react";

export function RmxShell({
  subBarTitle,
  children,
}: {
  subBarTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <RmxTopBar />
      <RmxSubBar title={subBarTitle} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
