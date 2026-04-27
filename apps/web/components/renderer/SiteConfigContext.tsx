"use client";

import type { Page, SiteConfig } from "@/lib/site-config";
import { type ReactNode, createContext, useContext, useMemo } from "react";

// Read-only slice of SiteConfig that components in the rendered tree may need
// at runtime — currently used by NavBar/Button to resolve a stored page slug
// to its current Page record (so renaming a page updates labels and the
// canvas click interceptor can recognize internal links).
export type SiteConfigContextValue = {
  siteSlug: string;
  pages: readonly Page[];
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export type SiteConfigProviderProps = {
  config: SiteConfig;
  children: ReactNode;
};

export function SiteConfigProvider({ config, children }: SiteConfigProviderProps) {
  const value = useMemo<SiteConfigContextValue>(
    () => ({ siteSlug: config.meta.siteSlug, pages: config.pages }),
    [config.meta.siteSlug, config.pages],
  );
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

// Returns null when not inside a SiteConfigProvider — components consuming
// this should treat null as "no lookup available, render the link as-is".
export function useSiteConfigContext(): SiteConfigContextValue | null {
  return useContext(SiteConfigContext);
}

export function useStaticPageBySlug(pageSlug: string | undefined): Page | null {
  const ctx = useSiteConfigContext();
  if (!ctx || !pageSlug) return null;
  return ctx.pages.find((p) => p.kind === "static" && p.slug === pageSlug) ?? null;
}
