# CLAUDE.md — Sprint 3b: Schema amendment for detail pages

## Mission

Amend the locked `SiteConfig` Zod schema to support the detail-page model added in `PROJECT_SPEC.md` §8.12 + §11. Specifically: extend `pageSchema` with a `kind` field (`"static" | "detail"`, default `"static"`) and a `detailDataSource` field (`"properties" | "units"`, required iff `kind === "detail"`); enforce the U2 slug uniqueness rule (per-kind, not global) at the `siteConfigSchema` level via `superRefine`; re-export the new types from `apps/web/lib/site-config/index.ts` and `apps/web/types/site-config.ts`; add round-trip and validation tests; preserve every existing test verbatim. Append an entry to `DECISIONS.md` recording this as the planned schema-lock break called out in `SPRINT_SCHEDULE.md` §5.

This is a **pure schema sprint**. It does not touch any component, the renderer, the row context provider, the public route, the Pages tab UI, or any AI prompt. Those are downstream amendments planned across Sprints 5, 6, 8, 9, 9b, 11, 13. Sprint 3b's scope is narrow on purpose so that downstream sprints rebase against a single, focused schema commit.

## Pre-flight check (MANDATORY — emit at the start of the session)

Before reading or modifying any file, run this check:

1. Read `PROJECT_SPEC.md` §11. Verify the `Page` type definition contains the field `kind: "static" | "detail"` and the field `detailDataSource?: "properties" | "units"`. If either is missing, STOP and emit a Deviation Report with failure reason "PROJECT_SPEC.md §11 has not been amended; Sprint 3b cannot generate code that contradicts the spec."
2. Read `PROJECT_SPEC.md` to confirm §8.12 ("Detail pages") exists. If §8.12 is absent, STOP and emit the same Deviation Report.
3. Read `PROJECT_SPEC.md` §11 closely for the trailing "Page validation rules" block that lists the per-kind slug uniqueness rule and the "detailDataSource required iff kind=detail" rule. If the block is absent, STOP and emit a Deviation Report.

Only after all three checks pass may you proceed to write code.

## Spec sections in scope

- `PROJECT_SPEC.md` §8.12 — Detail pages (NEW section; the `kind`/`detailDataSource` semantics, the U2 routing pattern, and the per-kind slug uniqueness rule are defined here).
- `PROJECT_SPEC.md` §11 — Site Config Schema (amended; `Page` shape now includes `kind` and `detailDataSource`; trailing "Page validation rules" block is binding).
- `PROJECT_SPEC.md` §15 — Coding Standards (binding — TypeScript strict, no `any`, etc.).
- `SPRINT_SCHEDULE.md` §5 — Cross-sprint risk register (Sprint 3b is the planned schema-lock break referenced in the first row).

## Definition of Done

- [ ] **Pre-flight check passed.** The PROJECT_SPEC.md amendments above are confirmed present before any code is written.
- [ ] **Page schema amended.** `apps/web/lib/site-config/schema.ts`'s `pageSchema` now has:
  - `kind: z.enum(["static", "detail"]).default("static")` so existing pages without an explicit `kind` continue to validate as static.
  - `detailDataSource: z.enum(["properties", "units"]).optional()` declared at the object-level shape.
  - A `pageSchema.superRefine` (or equivalent) that adds Zod issues for: `kind === "detail"` && `detailDataSource === undefined` (issue: "Detail pages must specify detailDataSource"), and `kind === "static"` && `detailDataSource !== undefined` (issue: "Static pages must not specify detailDataSource").
  - The TypeScript type `Page` (inferred via `z.infer<typeof pageSchema>`) reflects the new fields with correct optionality.
- [ ] **`PageKind` type exported.** A `pageKindSchema = z.enum(["static", "detail"])` and the inferred type `PageKind` are exported from `schema.ts`. A `DetailDataSource` type derived from `z.enum(["properties", "units"])` is similarly exported.
- [ ] **U2 slug uniqueness enforced at the SiteConfig level.** A `siteConfigSchema.superRefine` walks `pages` and adds a Zod issue when any two pages share the same `(kind, slug)` tuple. The issue's `path` points at the second offending page so the message is actionable. One static + one detail page with the same slug is valid.
- [ ] **Re-exports updated.** `apps/web/lib/site-config/index.ts` re-exports `pageKindSchema`, the inferred `PageKind` type, and the `DetailDataSource` type. `apps/web/types/site-config.ts` re-exports both types from `@/lib/site-config`.
- [ ] **Schema tests added.** `apps/web/lib/site-config/__tests__/schema.test.ts` adds at least these cases (preserve every existing test verbatim):
  - Valid: a config with one static page (`slug="units"`) and one detail page (`slug="units"`, `detailDataSource="units"`).
  - Valid: a page with no `kind` field at all (default applies; type is `"static"` after parse).
  - Valid: a page with `kind="static"` and no `detailDataSource`.
  - Valid: a page with `kind="detail"` and `detailDataSource="properties"`.
  - Invalid: two static pages with the same slug — schema rejects with a path pointing at the duplicate.
  - Invalid: two detail pages with the same slug.
  - Invalid: a detail page without `detailDataSource`.
  - Invalid: a static page with `detailDataSource` set.
  - Invalid: a detail page with `detailDataSource` outside the `["properties", "units"]` enum.
- [ ] **Parse round-trip tests added.** `apps/web/lib/site-config/__tests__/parse.test.ts` adds:
  - Round-trip a config containing one static page and one detail page sharing a slug; assert `parseSiteConfig(JSON.parse(JSON.stringify(original)))` produces a deep-equal config (modulo the default-`kind` injection on input pages without an explicit kind).
  - Round-trip a config with `kind="detail"` and `detailDataSource="properties"`.
  - Round-trip a pre-amendment config (no `kind` field anywhere); assert all pages come back as `kind: "static"` and no `detailDataSource`. This is the backwards-compatibility canary.
- [ ] **Existing tests untouched.** Every test that existed in `schema.test.ts` and `parse.test.ts` before this sprint passes without modification. If a pre-existing test breaks because of the new validation rules, that is a Deviation — emit a report rather than weakening either the test or the schema.
- [ ] **No files outside the Owned list are modified.** No component, no renderer, no route, no Sprint 1/2/4/5/6 code is touched.
- [ ] **`DECISIONS.md` entry appended.** A new entry dated today records the schema-lock break, the user's prior approval ("C"), the amendment to PROJECT_SPEC.md §11 + §8.12, the U2 design choice, and the cross-sprint impact (Sprints 5, 6, 8, 9, 11, 13 each carry an amendment to be planned when those sprints are next on the schedule). Use the entry template from existing `DECISIONS.md` entries as a structural reference.
- [ ] **All quality gates pass.** `pnpm test` (zero failures, zero skipped, all new tests passing), `pnpm build` (zero TypeScript errors, zero warnings — the new fields must not produce inference warnings anywhere they're consumed), `pnpm biome check` / `pnpm lint` (zero warnings). No new dependencies added — Zod is already in the workspace.

## Files you may create or modify

- `apps/web/lib/site-config/schema.ts`
- `apps/web/lib/site-config/index.ts`
- `apps/web/types/site-config.ts`
- `apps/web/lib/site-config/__tests__/schema.test.ts`
- `apps/web/lib/site-config/__tests__/parse.test.ts`
- `DECISIONS.md` (APPEND ONLY — add a new entry below all existing entries; do not edit any existing entry)

`apps/web/lib/site-config/parse.ts` is NOT in the Owned list because the Zod refinements added to `siteConfigSchema` and `pageSchema` flow through the existing `parseSiteConfig` and `safeParseSiteConfig` calls automatically — no source change is expected. If during the sprint you discover that `parse.ts` requires a change (for example, the existing implementation strips defaults), STOP and emit a Deviation Report. Do not silently amend `parse.ts`.

## Files you MUST NOT modify

- `PROJECT_SPEC.md` — already amended outside this sprint; further amendments require their own change-control flow.
- `SPRINT_SCHEDULE.md` — already updated outside this sprint.
- `apps/web/lib/site-config/style.ts` — Sprint 3-locked; this sprint does not touch styling.
- `apps/web/lib/site-config/ids.ts` — Sprint 3-locked; this sprint does not touch id generation.
- `apps/web/lib/site-config/parse.ts` — see note above; modify only via Deviation.
- `apps/web/lib/site-config/__tests__/style.test.ts`, `apps/web/lib/site-config/__tests__/ids.test.ts` — Sprint 3-locked.
- All `apps/web/components/site-components/**` — Sprints 3 + 5 own these.
- `apps/web/components/renderer/**` — Sprint 3 owns this; the renderer's prop-resolution path is amended by Sprint 9b later, not by this sprint.
- `apps/web/types/rm.ts`, `apps/web/lib/rm-api/**` — Sprint 1.
- `apps/web/lib/supabase/**` — Sprint 1.
- `apps/web/components/setup-form/**`, `apps/web/lib/setup-form/**` — Sprint 2.
- `apps/web/components/rmx-shell/**` — Sprint 1.
- `apps/web/components/editor/**`, `apps/web/lib/editor-state/**` — Sprint 6+.
- `apps/web/lib/ai/**` — Sprint 4+.
- `apps/web/app/**` — every route is owned by Sprints 1, 2, 3 (preview), 4, 6, or 13.
- `supabase/**` — no migrations in this sprint.
- `package.json`, `pnpm-lock.yaml`, all toolchain configs — locked since Sprint 0; no new dependencies in this sprint.
- Anything else not in the "Files you may create or modify" list.

## Coding standards (binding — copied from `PROJECT_SPEC.md` §15)

- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. No `any`. Prefer `unknown` and narrow.
- Prefer `type` over `interface` unless extending.
- Naming: files `kebab-case.ts(x)`. Schema names `camelCase` (existing convention: `pageSchema`, `siteConfigSchema`). Type names `PascalCase` (`Page`, `PageKind`, `SiteConfig`).
- One named export per concept; no default exports in `lib/site-config/`.
- All Zod refinements include a clear `message` and a `path` so test assertions and downstream UI can surface useful errors.
- Header comments are not required for this sprint's edits, but if you add a refinement that's non-obvious (e.g. the cross-page slug uniqueness check), add a one-line comment explaining its purpose and linking to `PROJECT_SPEC.md` §11's "Page validation rules" block.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of the plan
cannot be implemented exactly as written, you MUST stop and emit a Deviation
Report in the format below. You MUST NOT proceed with an alternative until
the user has explicitly approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries, impossible
function signatures, scope additions, file additions outside the declared
scope, test plans that cannot be executed as written, and any case where you
catch yourself thinking "I'll just do it slightly differently."

### Deviation Report (emit verbatim)

```
🛑 DEVIATION DETECTED

Sprint: Sprint 3b — Schema amendment for detail pages
Failed DoD item: [The exact bullet from Definition of Done that this blocks]

What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]

Why it's not working (1–2 sentences, technical):
[Brief technical reason.]

Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]

Trade-offs:
- Gain: [What we get]
- Lose: [What we give up]
- Risk:  [What might break]

Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]

Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.
```

After emitting the report, STOP. Do not write code. Do not edit files. Wait.

## Definition of "done" gating

A sprint is not done until all of the following pass with no warnings:

- `pnpm test` — zero failures, zero skipped tests. The new schema and parse tests are part of this count; you must add at least nine new schema tests (per the DoD list) and three new parse tests.
- `pnpm build` — zero TypeScript errors, zero warnings.
- `pnpm biome check` (or `pnpm lint`, whichever the repo aliases) — zero warnings.
- The manual smoke test below — every numbered step observed to pass.

If any check fails, treat it as a Deviation. Do not commit. Do not declare the sprint complete.

## Manual smoke test (numbered, click-by-click)

1. From the repo root, run `pnpm install`. Verify exit code 0 with no new peer-dep warnings.
2. Run `pnpm test`. Verify the new tests added in this sprint pass and the total test count is at least the previous baseline + 12.
3. Run `pnpm build`. Verify `Compiled successfully` with zero TypeScript errors and zero warnings.
4. Run `pnpm biome check` (or `pnpm lint`). Verify zero warnings.
5. Open a Node REPL or a one-off script (do not commit it) and run:
   ```ts
   import { parseSiteConfig } from "@/lib/site-config";

   const cfg = parseSiteConfig({
     meta: { siteName: "Aurora", siteSlug: "aurora-cincy" },
     brand: { palette: "ocean", fontFamily: "Inter" },
     global: {
       navBar: { links: [], logoPlacement: "left", sticky: false },
       footer: { columns: [], copyright: "© Aurora" },
     },
     pages: [
       { id: "p_units_list", slug: "units", name: "Units", rootComponent: { id: "r1", type: "Section", props: {}, style: {} } },
       { id: "p_units_detail", slug: "units", name: "Unit Detail", kind: "detail", detailDataSource: "units", rootComponent: { id: "r2", type: "Section", props: {}, style: {} } },
     ],
     forms: [],
   });
   console.log(cfg.pages.map((p) => [p.kind, p.slug, p.detailDataSource]));
   ```
   Verify the output is `[["static", "units", undefined], ["detail", "units", "units"]]` (or equivalent — the static page's `kind` should be `"static"` after default application, even though it wasn't in the input).
6. In the same REPL, attempt to parse a config with two detail pages sharing a slug. Verify it throws.
7. In the same REPL, attempt to parse a config with `kind: "detail"` but no `detailDataSource`. Verify it throws.
8. Confirm `git status` shows changes only in the Owned files plus `DECISIONS.md`. No untracked files outside that set.
9. Confirm `DECISIONS.md` has a new entry at the bottom dated today and referencing the user's option-C approval verbatim from the prior conversation.

## Useful local commands

- `pnpm test` — Vitest one-shot.
- `pnpm test --watch` — Vitest watch mode for iterating on schema tests.
- `pnpm test apps/web/lib/site-config` — run only the site-config test files.
- `pnpm build` — Next.js production build (final TypeScript gate).
- `pnpm biome check` (or `pnpm lint`) — Biome lint + format check.

## Notes & hints (non-binding context)

### Why default `kind: "static"`

Backwards compatibility. The existing Sprint 3 dev fixture, the Sprint 3 parse round-trip tests, and any in-progress Sprint 5 dev fixture all use `Page` literals without a `kind` field. Defaulting to `"static"` keeps every one of them valid without a single edit. This is by design.

### Why `superRefine` over `discriminatedUnion`

Zod has two ways to express the "detailDataSource present iff kind=detail" constraint:

1. `z.discriminatedUnion("kind", [staticPageSchema, detailPageSchema])` — clean type inference, but every consumer of `pageSchema` would now have to pattern-match on `kind` to access `slug`, `name`, etc. That's a lot of churn in code that doesn't care about the distinction.
2. `pageSchema.superRefine((page, ctx) => { ... })` — keeps `Page` as a flat object with `detailDataSource?` optional; the runtime check enforces the dependency. Type-level safety is weaker (a TS consumer could write `page.detailDataSource` even when `kind === "static"` and get `undefined` at runtime), but downstream code is simpler.

Use `superRefine`. The DX cost of `discriminatedUnion` outweighs the marginal type-safety gain. If a future sprint wants stricter inference, it can introduce a typed accessor like `assertDetailPage(page): page is DetailPage` and use it at boundaries.

### How to write the cross-page slug uniqueness refinement

Sketch (do not paste verbatim — adapt to the actual codebase shape):

```ts
export const siteConfigSchema = z
  .object({
    // ...existing fields...
    pages: z.array(pageSchema),
    // ...
  })
  .superRefine((config, ctx) => {
    const seen = new Map<string, number>();
    config.pages.forEach((page, index) => {
      const key = `${page.kind}::${page.slug}`;
      const firstIndex = seen.get(key);
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", index, "slug"],
          message: `Duplicate ${page.kind} page slug "${page.slug}" (already used by page at index ${firstIndex})`,
        });
      } else {
        seen.set(key, index);
      }
    });
  });
```

Note that `page.kind` is reliably defined here because the `default("static")` applies during parsing of `pageSchema` before `superRefine` runs on `siteConfigSchema`. Confirm this in a test ("a config where one page omits `kind` and another page has `kind: "static"` with the same slug is invalid").

### How to write the per-page refinement

Sketch:

```ts
export const pageSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: z.enum(["static", "detail"]).default("static"),
    detailDataSource: z.enum(["properties", "units"]).optional(),
    meta: z.object({ /* ... */ }).optional(),
    rootComponent: componentNodeSchema,
  })
  .superRefine((page, ctx) => {
    if (page.kind === "detail" && page.detailDataSource === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailDataSource"],
        message: "Detail pages must specify detailDataSource",
      });
    }
    if (page.kind === "static" && page.detailDataSource !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailDataSource"],
        message: "Static pages must not specify detailDataSource",
      });
    }
  });
```

### Behavior of `default()` on round-trip

`z.enum([...]).default("static")` writes the default into the parsed object. So:

- Input page has no `kind` field → parsed page has `kind: "static"`.
- Re-serializing the parsed page (via `JSON.stringify`) emits `"kind":"static"` even though the input didn't.

This is acceptable and is what the parse round-trip test asserts. If you want the round-trip to be strictly lossless (input without `kind` → output without `kind`), you have to use `z.enum([...]).optional().default("static")` and then strip undefined-valued keys before serializing — too much complexity for too little value. Lock in the "default flows through" behavior and document it in the test.

### `DECISIONS.md` entry shape

Use the Sprint 2c "Brand-section ownership hand-off" entry as a structural reference (already in `DECISIONS.md`). The new entry should include:

- **Date** (today's date in `YYYY-MM-DD`).
- **Sprint** (`Sprint 3b — Schema amendment for detail pages`).
- **Context** — why the schema-lock break is happening, referencing `SPRINT_SCHEDULE.md` §5 and the user's option-C approval.
- **What changed** — the new `kind` and `detailDataSource` fields, the U2 slug uniqueness rule, the re-exports.
- **User approval (verbatim)** — `"C. Where are you getting the information about the due date that should be none of your concern. I need to take that out of files it encourages you to cut corners"` and `"Lets do U2, Make me the 3b sprint and then generate a new Sprint_Schedule.md file with the modifications."`
- **Trade-offs** — gain (detail pages now expressible in config), lose (every downstream sprint that has read the schema must rebase against the new shape — backwards compatibility via `default("static")` keeps the rebase trivial), risk (someone hand-writes a config with `kind: "detail"` but forgets `detailDataSource` — the schema rejects it, so the deploy endpoint catches this before snapshotting).
- **Affected files / modules** — the five Owned files plus `DECISIONS.md` itself.
- **Cross-sprint impact** — list the Sprints 4, 5, 6, 8, 9, 9b, 11, 13 amendments planned in `SPRINT_SCHEDULE.md` §2, noting that each will be re-emitted with detail-page additions when those sprints are next on the schedule.

### Things that look like deviations but are not

- The `default("static")` on `kind` rewrites parsed objects to include the field even when the input omitted it. This is documented in the round-trip test and is intentional.
- The `superRefine` adds custom-coded Zod issues rather than using `z.literal` patterns. This is the correct shape for cross-field validation in Zod.
- Re-exporting `pageKindSchema` from `lib/site-config/index.ts` adds a new symbol to the public API of the module. This is intentional and matches the existing pattern (e.g. `borderSchema`, `BORDER_STYLES` are similarly re-exported).

### Things that ARE deviations

- Modifying `parse.ts`, `style.ts`, or `ids.ts` for any reason.
- Adding any new dependency (`zod-to-ts`, `@sinclair/typebox`, anything).
- Changing the `componentTypeSchema` enum, the `animationPresetSchema`, or any non-`pageSchema`/`siteConfigSchema` entity.
- Adding `kind` or `detailDataSource` fields to anything other than `pageSchema`.
- Implementing the row context provider, the token resolver, the dynamic public route, or any Button/InputField prop wiring — every one of those is a Sprint 9b or Sprint 5 amendment, not Sprint 3b.
- Editing any pre-existing test in `schema.test.ts` or `parse.test.ts`. New tests only; preserve the existing ones verbatim.
- Removing or weakening the `noUncheckedIndexedAccess` / `noImplicitAny` config to silence a TS error.
- Skipping the pre-flight check.

When in doubt, emit a Deviation Report.