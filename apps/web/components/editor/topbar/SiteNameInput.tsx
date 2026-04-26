"use client";

import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/lib/editor-state";
import { useEffect, useRef, useState } from "react";

const MAX_SITE_NAME = 100;

export function SiteNameInput() {
  const siteName = useEditorStore((s) => s.draftConfig.meta.siteName);
  const setSiteName = useEditorStore((s) => s.setSiteName);
  const [draft, setDraft] = useState(siteName);
  const lastCommittedRef = useRef(siteName);

  // Keep the draft in sync if external mutations land (palette switch, etc.).
  useEffect(() => {
    if (lastCommittedRef.current !== siteName) {
      lastCommittedRef.current = siteName;
      setDraft(siteName);
    }
  }, [siteName]);

  const commit = () => {
    const trimmed = draft.trim().slice(0, MAX_SITE_NAME);
    if (trimmed === siteName) return;
    lastCommittedRef.current = trimmed;
    setSiteName(trimmed);
  };

  return (
    <Input
      data-testid="topbar-site-name"
      aria-label="Site name"
      className="h-9 max-w-[260px] border-zinc-700 bg-transparent text-sm text-zinc-100"
      value={draft}
      maxLength={MAX_SITE_NAME}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(siteName);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
