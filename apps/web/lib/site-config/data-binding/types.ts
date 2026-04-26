import type { DataBinding } from "@/lib/site-config";
import type { Unit } from "@/types/rm";
import { z } from "zod";

// PROJECT_SPEC.md §11 keeps the schema's `filters` as `z.unknown()` so
// AI-generated configs can land without forcing every other sprint to
// rebase. Sprint 9 narrows it here, at the runtime boundary, and only here.

export type DataBindingSource = DataBinding["source"];

export const DATA_BINDING_SOURCES = [
  "properties",
  "units",
  "units_with_property",
  "company",
] as const satisfies readonly DataBindingSource[];

export const SUPPORTED_OPERATORS = [
  "=",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "contains",
  "beginsWith",
  "endsWith",
  "in",
  "notIn",
  "null",
  "notNull",
] as const;

export type FilterOperator = (typeof SUPPORTED_OPERATORS)[number];

export type FilterRule = {
  field: string;
  operator: string;
  value?: unknown;
};

export type FilterRuleGroup = {
  combinator: "and" | "or";
  not?: boolean;
  rules: Array<FilterRule | FilterRuleGroup>;
};

export const filterRuleSchema: z.ZodType<FilterRule> = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional(),
});

export const filterRuleGroupSchema: z.ZodType<FilterRuleGroup> = z.lazy(() =>
  z.object({
    combinator: z.enum(["and", "or"]),
    not: z.boolean().optional(),
    rules: z.array(z.union([filterRuleSchema, filterRuleGroupSchema])),
  }),
);

export type ConnectedInput = {
  inputId: string;
  field: string;
  operator: string;
};

export const connectedInputSchema = z.object({
  inputId: z.string(),
  field: z.string(),
  operator: z.string(),
});

export type SortSpec = { field: string; direction: "asc" | "desc" };

export const sortSpecSchema: z.ZodType<SortSpec> = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});

// `units_with_property` is materialized as an in-memory join in
// `fetchSource.ts`. The join shape lives here (rather than in
// `fetchSource.ts`) because that file is a Next.js Server Action and
// Server-Action files may only export async functions; type aliases
// must live elsewhere. See DECISIONS.md 2026-04-26 entry
// "fetchSource is a Server Action".
export type UnitWithProperty = Unit & {
  property_name: string | null;
  property_city: string | null;
  property_state: string | null;
  property_propertyType: string | null;
  property_heroImageUrl: string | null;
  property_email: string | null;
  property_primaryPhone: string | null;
  property_street: string | null;
  property_postalCode: string | null;
};
