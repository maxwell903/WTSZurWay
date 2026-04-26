import { type FilterRule, type FilterRuleGroup, filterRuleGroupSchema } from "./types";

function isGroup(node: FilterRule | FilterRuleGroup): node is FilterRuleGroup {
  return (node as FilterRuleGroup).combinator !== undefined;
}

function rowFieldExists(row: unknown, field: string): boolean {
  return row !== null && typeof row === "object" && field in (row as Record<string, unknown>);
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") return undefined;
  return (row as Record<string, unknown>)[field];
}

type EvalResult = "pass" | "fail" | "skip";

function evalRule<T>(rule: FilterRule, row: T): EvalResult {
  if (!rowFieldExists(row, rule.field)) return "skip";
  const left = readField(row, rule.field);
  const right = rule.value;

  switch (rule.operator) {
    case "=":
      return left === right ? "pass" : "fail";
    case "!=":
      return left !== right ? "pass" : "fail";
    case "<":
    case "<=":
    case ">":
    case ">=": {
      if (typeof left !== "number" || typeof right !== "number") return "skip";
      switch (rule.operator) {
        case "<":
          return left < right ? "pass" : "fail";
        case "<=":
          return left <= right ? "pass" : "fail";
        case ">":
          return left > right ? "pass" : "fail";
        case ">=":
          return left >= right ? "pass" : "fail";
      }
      return "skip";
    }
    case "contains":
    case "beginsWith":
    case "endsWith": {
      if (typeof left !== "string" || typeof right !== "string") return "skip";
      const a = left.toLowerCase();
      const b = right.toLowerCase();
      switch (rule.operator) {
        case "contains":
          return a.includes(b) ? "pass" : "fail";
        case "beginsWith":
          return a.startsWith(b) ? "pass" : "fail";
        case "endsWith":
          return a.endsWith(b) ? "pass" : "fail";
      }
      return "skip";
    }
    case "in":
    case "notIn": {
      if (!Array.isArray(right)) return "skip";
      const isIn = right.includes(left);
      return rule.operator === "in" ? (isIn ? "pass" : "fail") : isIn ? "fail" : "pass";
    }
    case "null":
      return left === null || left === undefined ? "pass" : "fail";
    case "notNull":
      return left !== null && left !== undefined ? "pass" : "fail";
    default:
      return "skip";
  }
}

function evalGroup<T>(group: FilterRuleGroup, row: T): EvalResult {
  const results: EvalResult[] = [];
  for (const child of group.rules) {
    const r = isGroup(child) ? evalGroup(child, row) : evalRule(child, row);
    results.push(r);
  }
  const considered = results.filter((r) => r !== "skip");
  let passed: boolean;
  if (considered.length === 0) {
    // No applicable rules → vacuously pass. Lets a partially-typed user
    // filter (e.g. an in-progress numeric rule on a string field) fall out
    // cleanly without nuking the whole result set.
    passed = true;
  } else if (group.combinator === "and") {
    passed = considered.every((r) => r === "pass");
  } else {
    passed = considered.some((r) => r === "pass");
  }
  if (group.not) passed = !passed;
  return passed ? "pass" : "fail";
}

export function applyFilters<T>(rows: T[], filters: unknown): T[] {
  if (filters === null || filters === undefined) return rows;
  const parsed = filterRuleGroupSchema.safeParse(filters);
  if (!parsed.success) return rows;
  const group = parsed.data;
  if (group.rules.length === 0) return rows;
  return rows.filter((row) => evalGroup(group, row) === "pass");
}
