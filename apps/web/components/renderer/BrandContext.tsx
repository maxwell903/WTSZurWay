"use client";

import type { SiteConfig } from "@/lib/site-config";
import { type ReactNode, createContext, useContext, useMemo } from "react";

// Read-only brand slice surfaced to leaf components that need to resolve a
// brand-owned asset at render time (notably <Logo> resolving source="primary"
// / "secondary" against brand.primaryLogoUrl / secondaryLogoUrl).
//
// Kept separate from SiteConfigContext so that the brand subtree can be
// memoized independently — most components don't care about brand and don't
// need to re-render when palette or fontFamily changes.
export type BrandContextValue = SiteConfig["brand"];

const BrandContext = createContext<BrandContextValue | null>(null);

export type BrandProviderProps = {
  brand: BrandContextValue;
  children: ReactNode;
};

export function BrandProvider({ brand, children }: BrandProviderProps) {
  const value = useMemo<BrandContextValue>(() => brand, [brand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

// Returns null when not inside a BrandProvider — consumers should treat null
// as "no brand available, fall back to placeholder / default behavior". This
// matches the convention used by useSiteConfigContext.
export function useBrand(): BrandContextValue | null {
  return useContext(BrandContext);
}
