# CLAUDE.md — Sprint 5b: Detail-pages backfill for Button, InputField, and the dev fixture

## Mission

Backfill three Sprint 5 artifacts to align them with the schema amendment landed by Sprint 3b (and the spec amendment in `PROJECT_SPEC.md` §8.12 + §11) — without rewriting any other component, the renderer, or any route.

Sprint 5 was completed out of the planned order — the user executed `0 → 1 → 2 → 3 → 5 → 3b` instead of `0 → 1 → 3 → 3b → 2 → 5`. Sprint 5 therefore shipped with the OLD prop set for `Button` and `InputField`, and with a dev fixture that does not exercise detail-page features. Sprint 3b succeeded against this codebase (the schema is pure additive with `default("static")` for `kind`, so all Sprint 5 fixtures continued to validate). What remains is a small focused backfill of three areas:

1. `Button` gains two new props — `linkMode: "static" | "detail"` (default `"static"`) and `detailPageSlug?: string` (required iff `linkMode === "detail"`). Sprint 5b stores these props verbatim and emits them as data attributes on the rendered element. Sprint 9b will later compute the actual `href` from row context at render time. **Sprint 5b does not implement href computation.**
2. `InputField` gains one new prop — `defaultValueFromQueryParam?: string`. When set, the input hydrates its initial value from `window.location.search` on mount. This requires switching `InputField/index.tsx` from a server component to a client component (`"use client"`).
3. The `/dev/components` fixture gains: a `Button` with `linkMode="detail"`, an `InputField` with `defaultValueFromQueryParam`, and a second page with `kind="detail"`, `slug="units"`, `detailDataSource="units"` (sharing the slug with the existing static units page per the U2 pattern).

This sprint is a **modify-only** backfill. Every file touched already exists from Sprint 5. No new files are created (with one possible exception — see "Files you may create or modify" below).

## Pre-flight check (mandatory — emit at the start of the session)

Before reading or modifying any file, verify three preconditions:

1. Read `PROJECT_SPEC.md` §8.12. Confirm the section exists and describes the `linkMode`/`detailPageSlug` shape on `Button` and the `defaultValueFromQueryParam` shape on `InputField`. If §8.12 is missing or doesn't describe these prop shapes, STOP and emit a Deviation Report.
2. Read `apps/web/lib/site-config/schema.ts`. Confirm `pageSchema` contains the `kind` and `detailDataSource` fields, and that `siteConfigSchema` has a `superRefine` enforcing per-kind slug uniqueness. If either is missing, Sprint 3b has not actually landed — STOP and emit a Deviation Report.
3. Read `apps/web/components/site-components/Button/index.tsx` and `apps/web/components/site-components/InputField/index.tsx`. Confirm both files exist (they were produced by Sprint 5). If either is missing, STOP — Sprint 5 has not actually landed against this branch.

Only after all three checks pass may you proceed to write code.

## Spec sections in scope

- `PROJECT_SPEC.md` §8.12 — Detail pages (the binding source for the new prop shapes and their semantics).
- `PROJECT_SPEC.md` §11 — Site Config Schema (amended; the Page validation rules block is binding).
- `PROJECT_SPEC.md` §6.1 — Demo target: 20 components (Button and InputField are in this list; their prop shapes are defined per §6.3 in each component's `SPEC.md`).
- `PROJECT_SPEC.md` §6.3 — Component spec format (each `SPEC.md` follows this).
- `PROJECT_SPEC.md` §15 — Coding Standards (binding).
- `SPRINT_SCHEDULE.md` §2 — Sprint summaries (the "Detail-pages amendment" subheadings under Sprint 5 specify the changes this backfill implements).

## Definition of Done

- [ ] **Pre-flight check passed.** PROJECT_SPEC.md §8.12 and the Sprint 3b schema fields confirmed present before any code is written.
- [ ] **Button props extended.** `apps/web/components/site-components/Button/index.tsx`'s per-component Zod schema gains:
  - `linkMode: z.enum(["static", "detail"]).default("static")`
  - `detailPageSlug: z.string().optional()`
  - A `.superRefine` (or equivalent inline check) that fails parse when `linkMode === "detail"` && `detailPageSlug === undefined`. The component continues to use the existing silent-fallback pattern (`safeParse` then fall back to `schema.parse({})` defaults if the parse fails).
- [ ] **Button render emits data attributes.** When the parsed `linkMode === "detail"`, the rendered element carries `data-link-mode="detail"` and `data-detail-page-slug={detailPageSlug}`. When `linkMode === "static"`, the data attributes are absent (or `data-link-mode="static"` — pick one and document it). The existing `href` rendering for static links is unchanged. **Sprint 5b does not compute `/{detailPageSlug}/{row.id}` hrefs** — that is Sprint 9b's job. A header comment in `Button/index.tsx` says so explicitly and links to `PROJECT_SPEC.md` §8.12.
- [ ] **Button SPEC.md updated.** The Props table gains rows for `linkMode` and `detailPageSlug` with types, defaults, and a note that `detailPageSlug` is required when `linkMode === "detail"`. The "AI ops supported" section gains entries for `setLinkMode` and `setDetailPageSlug` (Tier 1, Sprint 11). The "Data binding" section gains a note that `href` strings may contain `{{ row.* }}` tokens that are resolved by Sprint 9b at render time when the Button is inside a Repeater iteration; Sprint 5b stores them verbatim.
- [ ] **Button tests extended** (preserve every existing test verbatim):
  - Renders with `linkMode="static"` and an `href` → produces an `<a>` element with the href and no `data-detail-page-slug` attribute.
  - Renders with `linkMode="detail"` and `detailPageSlug="units"` → produces an element with `data-link-mode="detail"` and `data-detail-page-slug="units"`. (The element is the existing root — `<a>` if `href` is also present, else `<button>`.)
  - Falls back to defaults when given `linkMode="detail"` without `detailPageSlug` (parse fails → defaults applied → renders as `linkMode="static"`).
  - Falls back to defaults when given `linkMode="bogus"` (invalid enum value).
- [ ] **InputField switched to client component.** `apps/web/components/site-components/InputField/index.tsx` starts with `"use client"`. Add a header comment noting the switch and the reason (`defaultValueFromQueryParam` requires `useEffect` to read `window.location.search`).
- [ ] **InputField props extended.** The per-component Zod schema gains `defaultValueFromQueryParam: z.string().optional()`. No `superRefine` needed — the field is purely additive.
- [ ] **InputField hydrates from query param.** When `defaultValueFromQueryParam` is set, on mount the component reads `new URLSearchParams(window.location.search).get(paramName)` and uses the resolved value as the input's initial value. Implementation pattern uses `useState` for the value and `useEffect` for the URL read (server-safe via `typeof window !== "undefined"` guard). The input is now controlled (value + onChange). Sprint 10's Form will read values via `FormData` on submit, which works with controlled inputs that have a `name`.
- [ ] **InputField SPEC.md updated.** The Props table gains a row for `defaultValueFromQueryParam` (type, default, description). The "AI ops supported" section gains `setQueryParamDefault` (Tier 1, Sprint 11). A note explains that the component is now a client component because of the URL read.
- [ ] **InputField tests extended** (preserve every existing test verbatim):
  - Renders with `defaultValueFromQueryParam="propertyId"` and a mocked URL of `/?propertyId=4` → input renders with value `"4"`.
  - Renders with `defaultValueFromQueryParam="propertyId"` and a URL with no `propertyId` param → input renders with `defaultValue` (or empty string if `defaultValue` is also unset).
  - Renders without `defaultValueFromQueryParam` → behaves identically to the pre-backfill version (no URL read, no `useEffect` runs on this code path).
  - The user can type into the input and the displayed value updates (controlled-state sanity check).
- [ ] **Dev fixture extended.** `apps/web/app/dev/components/fixtures.ts` gains:
  - A `Button` with `linkMode="detail"` and `detailPageSlug="units"` (placed somewhere visible — for example, next to the existing static-Button in the row). Label something like "View Unit Detail (Sprint 9b will resolve)".
  - An `InputField` with `defaultValueFromQueryParam="test_input"` and `name="test_input"` (placed inside the existing Form, or in a standalone position — your call).
  - A second `Page` entry: `{ id: "p_units_detail", slug: "units", name: "Units Detail", kind: "detail", detailDataSource: "units", rootComponent: <a Section with a Heading reading "Unit detail template — Sprint 9b will hydrate this with row data"> }`. The slug `"units"` is used regardless of whether the existing fixture already has a static page named `"units"` — per the U2 pattern, a static + detail page with the same slug is valid. If the existing fixture does NOT have a static page with slug `"units"`, also add one (`kind: "static"`) so the fixture exercises the U2 collision case explicitly.
- [ ] **Dev fixture parse test still passes.** The existing `apps/web/app/dev/components/__tests__/fixtures.test.ts` asserts the fixture parses against `siteConfigSchema`. After the backfill, this test continues to pass — the new pages, Button props, and InputField props all validate.
- [ ] **Smoke test passes** (see Manual smoke test below).
- [ ] **All quality gates pass.** `pnpm test` (zero failures, zero skipped, all pre-existing tests still passing). `pnpm build` (zero TypeScript errors, zero warnings — the new client component must not break SSR; the Form's "use client" boundary stays correct). `pnpm biome check` / `pnpm lint` (zero warnings). No new dependencies.
- [ ] **`DECISIONS.md` entry appended.** Dated today, recording: the out-of-order execution (`0 → 1 → 2 → 3 → 5 → 3b`); the Sprint 5b backfill itself; the user's directive ("Sprint 5 was done before Sprint 3b — make a prompt of all the things needed before moving on to Sprint 4"); the affected files; the cross-sprint impact (none beyond Sprint 9b, which already plans to consume `linkMode` / `detailPageSlug` and the resolved query param value).

## Files you may create or modify

- `apps/web/components/site-components/Button/index.tsx` (modify)
- `apps/web/components/site-components/Button/SPEC.md` (modify)
- `apps/web/components/site-components/Button/__tests__/Button.test.tsx` (modify — preserve existing tests, add new)
- `apps/web/components/site-components/InputField/index.tsx` (modify — add `"use client"` directive)
- `apps/web/components/site-components/InputField/SPEC.md` (modify)
- `apps/web/components/site-components/InputField/__tests__/InputField.test.tsx` (modify — preserve existing tests, add new)
- `apps/web/app/dev/components/fixtures.ts` (modify — extend the existing fixture)
- `DECISIONS.md` (APPEND ONLY — add a new entry below all existing entries)

If you discover during implementation that the existing dev fixture file is structured in a way that requires a small companion file (e.g. a `units-detail-page.ts` import to keep `fixtures.ts` from growing past ~300 lines), creating that one helper file is acceptable as long as it lives under `apps/web/app/dev/components/` and is purely a refactor of fixture data. Larger structural changes are a Deviation.

## Files you MUST NOT modify

- `PROJECT_SPEC.md` — already amended.
- `SPRINT_SCHEDULE.md` — already updated.
- `apps/web/lib/site-config/**` — Sprint 3 + 3b own this. The schema is correct; do not touch it.
- `apps/web/components/renderer/**` — Sprint 3 owns this; row context and token resolution are Sprint 9b.
- `apps/web/components/site-components/{Section,Heading,Paragraph,Image,Spacer,Divider,Row,Column,Logo,NavBar,Footer,HeroBanner,PropertyCard,UnitCard,Repeater,Form,MapEmbed,Gallery}/**` — Sprint 5-locked. This backfill ONLY touches `Button` and `InputField` per-component files.
- `apps/web/components/site-components/registry.ts` — Sprint 5 already wired the components; the registry doesn't carry prop information.
- `apps/web/components/site-components/__tests__/registry.test.ts` — Sprint 5-locked.
- `apps/web/app/dev/preview/**` — Sprint 3-locked.
- `apps/web/app/dev/components/page.tsx` — Sprint 5-locked. The page renders the fixture; only `fixtures.ts` is changing. (If `page.tsx` needs to change because of the fixture extension, that's a Deviation — surface it.)
- `apps/web/components/setup-form/**`, `apps/web/lib/setup-form/**` — Sprint 2.
- `apps/web/components/rmx-shell/**`, `apps/web/lib/rm-api/**`, `apps/web/lib/supabase/**` — Sprint 1.
- `apps/web/components/editor/**` — Sprint 6+.
- `apps/web/lib/ai/**` — Sprint 4+.
- `apps/web/app/api/**` — Sprint 4+.
- `apps/web/app/[site]/**` — Sprint 4+, Sprint 6+, Sprint 13.
- `apps/web/app/(rmx)/**` — Sprint 1 + 2.
- `supabase/**` — no migrations in this backfill.
- `package.json`, `pnpm-lock.yaml`, all toolchain configs — locked since Sprint 0; no new dependencies.
- Anything else not in the "Files you may create or modify" list.

## Coding standards (binding — copied from `PROJECT_SPEC.md` §15)

- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. No `any`. Prefer `unknown` and narrow.
- React: server components by default. **`InputField/index.tsx` flips to `"use client"` in this backfill** because of the `useEffect` URL read; this is the standard exception for components with client-only side effects. `Button/index.tsx` stays a server component (no hooks).
- Naming: existing conventions preserved. Per-component Zod schemas defined inline at the top of `index.tsx` (matches the Sprint 5 pattern).
- Use `safeParse` + silent fallback in component-level prop validation (matches `Section/index.tsx`):
  ```ts
  const parsed = buttonPropsSchema.safeParse(node.props);
  const props = parsed.success ? parsed.data : buttonPropsSchema.parse({});
  ```
  This guarantees every render produces valid props even when an upstream system (AI generation, hand-edit) writes a typo.
- No commented-out code; no skipped tests; no `TODO` without a sprint reference. `// TODO(sprint-9b): ...` is acceptable.

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

Sprint: Sprint 5b — Detail-pages backfill for Button, InputField, and the dev fixture
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

- `pnpm test` — zero failures, zero skipped tests. Each new test in Button and InputField test files passes; the dev fixture parse test still passes; every pre-existing test in the entire repo still passes.
- `pnpm build` — zero TypeScript errors, zero warnings. The `"use client"` switch on `InputField` must not introduce SSR-incompatible code paths; the dev fixture must still type-check against the (now-extended) `SiteConfig`.
- `pnpm biome check` (or `pnpm lint`) — zero warnings.
- The manual smoke test below — every numbered step observed to pass.

If any check fails, treat it as a Deviation. Do not commit. Do not declare the sprint complete.

## Manual smoke test (numbered, click-by-click)

1. From the repo root, run `pnpm install`. Verify exit code 0 with no new peer-dep warnings.
2. Run `pnpm test`. Verify all pre-existing tests still pass plus the new ones (≥ 6 new across Button and InputField test files).
3. Run `pnpm build`. Verify `Compiled successfully` with zero TypeScript errors and zero warnings.
4. Run `pnpm biome check` (or `pnpm lint`). Verify zero warnings.
5. Run `pnpm dev`. Wait for `Ready in Xs`.
6. Open `http://localhost:3000/dev/components` in a browser. Verify the page renders without any inline "Component error" placeholders.
7. In the browser devtools DOM inspector, find the new detail-link Button. Verify it carries `data-link-mode="detail"` and `data-detail-page-slug="units"` (or your chosen slug).
8. Find the new InputField with `defaultValueFromQueryParam="test_input"`. Verify it renders with an empty value (no `?test_input=...` in the URL yet).
9. Navigate to `http://localhost:3000/dev/components?test_input=hello`. Verify the InputField now renders with the value `"hello"`. Type into it, confirm the value updates as you type.
10. Open browser devtools → Console. Verify zero new errors and zero new warnings.
11. Stop `pnpm dev`.
12. Run `git status`. Confirm changes only in the Owned files plus `DECISIONS.md`. No untracked files outside that set.
13. Confirm `DECISIONS.md` has a new entry at the bottom dated today, referencing the user's backfill request and the out-of-order execution.

## Useful local commands

- `pnpm dev` — local dev server.
- `pnpm test` — Vitest one-shot.
- `pnpm test apps/web/components/site-components/Button` — run only Button tests.
- `pnpm test apps/web/components/site-components/InputField` — run only InputField tests.
- `pnpm test --watch` — watch mode for fast iteration.
- `pnpm build` — Next.js production build.
- `pnpm biome check` (or `pnpm lint`) — Biome lint + format check.

## Notes & hints (non-binding context)

### Button — implementation pattern

Add to the existing `buttonPropsSchema`:

```ts
const buttonPropsSchema = z
  .object({
    label: z.string().default("Button"),
    href: z.string().optional(),
    variant: z.enum(["primary", "secondary", "outline", "ghost", "link"]).default("primary"),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    fullWidth: z.boolean().default(false),
    buttonType: z.enum(["button", "submit", "reset"]).default("button"),
    // NEW — Sprint 5b backfill per PROJECT_SPEC.md §8.12
    linkMode: z.enum(["static", "detail"]).default("static"),
    detailPageSlug: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.linkMode === "detail" && p.detailPageSlug === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailPageSlug"],
        message: "Required when linkMode is 'detail'",
      });
    }
  });
```

In the render path, when `props.linkMode === "detail"`, add the data attributes to the rendered element. Don't compute the href yet — Sprint 9b owns that. Sketch:

```tsx
const dataAttrs =
  props.linkMode === "detail" && props.detailPageSlug
    ? { "data-link-mode": "detail", "data-detail-page-slug": props.detailPageSlug }
    : {};

return props.href ? (
  <a
    href={props.href}
    data-component-id={node.id}
    data-component-type="Button"
    style={cssStyle}
    {...dataAttrs}
  >
    {props.label}
  </a>
) : (
  <button
    type={props.buttonType}
    data-component-id={node.id}
    data-component-type="Button"
    style={cssStyle}
    {...dataAttrs}
  >
    {props.label}
  </button>
);
```

### Button — header comment (verbatim)

Add near the top of `Button/index.tsx`:

```ts
// Sprint 5b backfill: Button stores `linkMode` and `detailPageSlug` per
// PROJECT_SPEC.md §8.12. When `linkMode === "detail"`, the rendered element
// carries `data-link-mode="detail"` and `data-detail-page-slug` data
// attributes. The actual href computation `/{detailPageSlug}/{row.id}`
// happens in Sprint 9b at render time when row context is available
// (Repeater iteration or detail page).
//
// In this sprint we do NOT:
//   - Compute the detail href.
//   - Read row context.
//   - Resolve `{{ row.* }}` tokens in `href`.
// Touching any of those here is a Deviation.
```

### InputField — `"use client"` switch

The pre-backfill `InputField` was a server component (per the Sprint 5 plan). Adding `useEffect` to read `window.location.search` requires the client directive. Pattern:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const inputFieldPropsSchema = z.object({
  name: z.string(),
  label: z.string().default(""),
  inputType: z
    .enum(["text", "email", "tel", "number", "textarea", "select", "checkbox"])
    .default("text"),
  placeholder: z.string().default(""),
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  // NEW — Sprint 5b backfill per PROJECT_SPEC.md §8.12
  defaultValueFromQueryParam: z.string().optional(),
});

type InputFieldProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function InputField({ node, cssStyle }: InputFieldProps) {
  const result = inputFieldPropsSchema.safeParse(node.props);
  if (!result.success) {
    // `name` is required; without it we cannot meaningfully render. Render
    // nothing rather than a broken input. Sprint 8's edit panel surfaces
    // missing required props in the editor.
    return null;
  }
  const props = result.data;

  const [value, setValue] = useState<string>(props.defaultValue ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!props.defaultValueFromQueryParam) return;
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(props.defaultValueFromQueryParam);
    if (queryValue !== null) {
      setValue(queryValue);
    }
  }, [props.defaultValueFromQueryParam]);

  // Render the appropriate input element with `name={props.name}`,
  // `value={value}`, `onChange={(e) => setValue(e.target.value)}`,
  // `data-component-id={node.id}`, `data-component-type="InputField"`,
  // and `style={cssStyle}` on the root element.
}
```

### InputField — header comment (verbatim)

Add near the top of `InputField/index.tsx`:

```ts
// Sprint 5b backfill: InputField is now a client component because of
// `defaultValueFromQueryParam` (PROJECT_SPEC.md §8.12). On mount, when
// the prop is set, the input reads `window.location.search` and uses the
// resolved value as its initial value. Sprint 10's Form will continue to
// read submitted values via FormData, which works with controlled inputs
// that have a `name` attribute.
//
// In this sprint we do NOT:
//   - Manage form-level submission state (Sprint 10 owns that).
//   - Read row context or resolve `{{ row.* }}` tokens (Sprint 9b owns that).
//   - Validate the `name` field for uniqueness within a Form (Sprint 10 enforces).
// Touching any of those here is a Deviation.
```

### Testing the URL-param hydration

`window.location` is awkward to mock directly in jsdom. The cleanest pattern is `window.history.pushState` to actually set the URL, since jsdom respects it:

```ts
import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { ComponentNode } from "@/types/site-config";
import { InputField } from "../index";

const originalSearch = window.location.search;

function setQuery(query: string) {
  window.history.pushState({}, "", query);
}

afterEach(() => {
  window.history.pushState({}, "", originalSearch || "/");
});

describe("<InputField> defaultValueFromQueryParam", () => {
  it("hydrates from the URL when the named param is present", async () => {
    setQuery("/?propertyId=4");
    const node: ComponentNode = {
      id: "cmp_input",
      type: "InputField",
      props: {
        name: "propertyId",
        inputType: "text",
        defaultValueFromQueryParam: "propertyId",
      },
      style: {},
    };
    const { findByDisplayValue } = render(<InputField node={node} cssStyle={{}} />);
    expect(await findByDisplayValue("4")).toBeInTheDocument();
  });

  it("falls back to defaultValue when the param is absent", async () => {
    setQuery("/");
    const node: ComponentNode = {
      id: "cmp_input",
      type: "InputField",
      props: {
        name: "propertyId",
        inputType: "text",
        defaultValue: "fallback",
        defaultValueFromQueryParam: "propertyId",
      },
      style: {},
    };
    const { findByDisplayValue } = render(<InputField node={node} cssStyle={{}} />);
    expect(await findByDisplayValue("fallback")).toBeInTheDocument();
  });
});
```

If your Vitest config doesn't already include `@testing-library/jest-dom` matchers, the existing Sprint 5 tests prove they're set up correctly — match whatever pattern you find there.

### Dev fixture extension

The existing `apps/web/app/dev/components/fixtures.ts` from Sprint 5 has one page with all 14 components. Add:

1. The new Button (alongside the existing static Button — useful side-by-side for comparison):

```ts
{
  id: "cmp_btn_detail",
  type: "Button",
  props: {
    label: "View Unit Detail (Sprint 9b will resolve)",
    linkMode: "detail",
    detailPageSlug: "units",
  },
  style: {},
}
```

2. The new InputField (e.g. inside the existing Form, or standalone above it):

```ts
{
  id: "cmp_input_query",
  type: "InputField",
  props: {
    name: "test_input",
    label: "Pre-fill via ?test_input=...",
    inputType: "text",
    placeholder: "Try /dev/components?test_input=hello",
    defaultValueFromQueryParam: "test_input",
  },
  style: {},
}
```

3. The new detail page in the `pages` array:

```ts
{
  id: "p_units_detail",
  slug: "units",
  name: "Units Detail",
  kind: "detail",
  detailDataSource: "units",
  rootComponent: {
    id: "cmp_root_units_detail",
    type: "Section",
    props: {},
    style: { padding: { top: 32, right: 32, bottom: 32, left: 32 } },
    children: [
      {
        id: "cmp_units_detail_heading",
        type: "Heading",
        props: {
          text: "Unit detail template — Sprint 9b will hydrate this with row data",
          level: 1,
        },
        style: {},
      },
    ],
  },
}
```

If the existing fixture's primary page is not slugged `"units"`, also add a static `slug: "units"` page so the fixture exercises the U2 same-slug coexistence case explicitly. The U2 case is the most important schema feature this fixture should prove works end-to-end.

The `/dev/components/page.tsx` continues to render the first page (`config.pages[0]`) — the detail page exists in the config but isn't reached via the `/dev/components` URL. This is fine — the goal is to prove the fixture parses, not to render the detail page in this sprint. Sprint 9b's smoke test will exercise actual detail-page rendering at the public route.

### `DECISIONS.md` entry shape

Use the Sprint 2c "BrandSection ownership hand-off" entry as a structural reference. Include:

- **Date** (today's date in `YYYY-MM-DD`).
- **Sprint** (`Sprint 5b — Detail-pages backfill for Button, InputField, and the dev fixture`).
- **Context** — Sprint 5 was executed before Sprint 3b due to the order in which the Sprint Architect generated the new sprints. The order was `0 → 1 → 2 → 3 → 5 → 3b` instead of the planned `0 → 1 → 3 → 3b → 2 → 5`. Sprint 3b succeeded against this codebase because the schema additions were purely additive with `default("static")`; the Sprint 5 components and dev fixture continued to validate. Sprint 5b is the focused backfill that aligns Sprint 5's `Button`, `InputField`, and dev fixture with the new schema fields.
- **What changed** — Button gains `linkMode` and `detailPageSlug`; InputField gains `defaultValueFromQueryParam` and switches to a client component; the dev fixture gains a detail Button, a query-param-bound InputField, and a second detail page sharing a slug with the listing page (U2 pattern).
- **User approval (verbatim)** — `"Since this was supposed to be before Sprint 2 but Sprint 2 was done before we made this 3b sprint. based on my updated code base in project files what else would need to be done outside of the sprint 2 that was already done. I have alos done Sprint 5 before Sprint 3b let me know if there is something Extra I need to do before sprint 4. Basically I have done sprint 0, 1. 2. 3. 5. 3b in this order. LEte me know what Is missing before starting sprint 4, Make a prompt of all the things needed done before moving on to sprint 4"`
- **Trade-offs accepted** — gain (Button and InputField now expressible per §8.12; Sprint 4's system prompt can teach Claude about the new props meaningfully; Sprint 9b can resolve them at render time), lose (one extra sprint of work that would have been folded into Sprint 5 had the order been different — small cost), risk (the InputField switch to client component may interact with future SSR/RSC work; this is the standard exception per coding standards and is contained to this one component).
- **Affected files / modules** — the eight Owned files plus `DECISIONS.md`.
- **Cross-sprint impact** — Sprint 4 can now teach Claude about the new Button and InputField props in its system prompt without contradicting the actual component code. Sprint 9b's plan to resolve detail hrefs and query-param defaults at render time consumes the data attributes Button emits and the controlled value InputField manages. No other sprint is affected.

### Things that look like deviations but are not

- The InputField switch to `"use client"` is the standard exception to "server components by default" for components with client-only side effects (`useEffect` reading `window`).
- Adding controlled state (`useState`) to InputField in Sprint 5 was previously framed as out of scope ("presentational only") in the original Sprint 5 plan. Sprint 5b explicitly relaxes that constraint — the URL-param hydration requires it. Sprint 10's Form contract continues to work because `FormData` reads controlled-input values just fine.
- Falling back to defaults via `safeParse` + `parse({})` for Button. This is the established Sprint 5 pattern (see `Section/index.tsx`).

### Things that ARE deviations

- Adding any new dependency.
- Modifying any of the other 18 components, the renderer, the schema, the registry, or any route.
- Implementing the actual `/{detailPageSlug}/{row.id}` href computation in Button (Sprint 9b owns that).
- Implementing token resolution (`{{ row.* }}`) in any component (Sprint 9b owns that).
- Adding row context awareness anywhere (Sprint 9 introduces the context for Repeater; Sprint 9b generalizes).
- Computing form submission behavior in Form (Sprint 10).
- Editing any pre-existing test in any file. New tests only; preserve existing.
- Skipping the pre-flight check.

When in doubt, emit a Deviation Report.