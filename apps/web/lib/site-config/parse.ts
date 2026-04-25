import type { z } from "zod";
import { type SiteConfig, siteConfigSchema } from "./schema";

export function parseSiteConfig(input: unknown): SiteConfig {
  return siteConfigSchema.parse(input);
}

export type SafeParseSiteConfigResult =
  | { success: true; data: SiteConfig }
  | { success: false; error: z.ZodError };

export function safeParseSiteConfig(input: unknown): SafeParseSiteConfigResult {
  const result = siteConfigSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
