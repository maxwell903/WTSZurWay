"use client";

import { Sparkles } from "lucide-react";
import { DeployButton } from "./DeployButton";
import { PageSelector } from "./PageSelector";
import { PreviewToggle } from "./PreviewToggle";
import { SaveIndicator } from "./SaveIndicator";
import { ShowComponentTypesToggle } from "./ShowComponentTypesToggle";
import { SiteNameInput } from "./SiteNameInput";

export function TopBar() {
  return (
    <header
      data-testid="editor-topbar"
      className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Sparkles className="h-4 w-4 text-orange-400" />
        Orion&apos;s Belt
      </div>
      <div className="ml-2 flex items-center gap-2">
        <SiteNameInput />
        <PageSelector />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <SaveIndicator />
        <ShowComponentTypesToggle />
        <PreviewToggle />
        <DeployButton />
      </div>
    </header>
  );
}
