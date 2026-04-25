# CLAUDE.md — Sprint 3: Site config schema + base renderer

## Mission

Lock the `SiteConfig` Zod schema (`PROJECT_SPEC.md` §11), build the shared recursive renderer with per-component error boundaries (`PROJECT_SPEC.md` §10), and ship the first six site components (`PROJECT_SPEC.md` §6.1: Section, Heading, Paragraph, Image, Spacer, Divider) — each with `index.tsx`, an `EditPanel.tsx` skeleton, and a `SPEC.md`. Seed the component registry with all 20 `ComponentType` values (six real, fourteen placeholders that throw with "not yet implemented — Sprint 5"). Prove the system end-to-end with a hardcoded fixture rendered at `/dev/preview` (hidden in production). Do not touch any path outside the Owned list. Do not add new dependencies.

## Spec sections in scope

- `PROJECT_SPEC.md` §6.1 — Demo target: 20 components
- `PROJECT_SPEC.md` §6.3 — Component spec format
- `PROJECT_SPEC.md` §6.4 — Shared style controls
- `PROJECT_SPEC.md` §6.5 — Animation presets
- `PROJECT_SPEC.md` §10 — The Renderer (Shared)
- `PROJECT_SPEC.md` §11 — Site Config Schema
- `PROJECT_SPEC.md` §15 — Coding Standards

## Definition of Done

- [ ] `apps/web/lib/site-config/schema.ts` exports Zod schemas for `SiteConfig`, `Page`, `ComponentNode` (recursive via `z.lazy`), `StyleConfig`, `AnimationConfig`, `DataBinding`, `FormDefinition`, `ColorOrGradient`, `Spacing`, `Border`, `ShadowPreset`, `SizeUnit`, `AnimationPreset`, and `ComponentType`. Field shapes match `PROJECT_SPEC.md` §11 exactly; concrete shapes for the spec's loosely-named types follow the proposals in the SPRINT plan's "Notes & hints" section.
- [ ] `ComponentNode.props` is `z.record(z.string(), z.unknown())` — never `any`. `DataBinding.filters` is `z.unknown().optional()` with a comment that Sprint 9 will narrow it.
- [ ] `ComponentType` is a Zod enum with these 20 values in this order: `"Section"`, `"Row"`, `"Column"`, `"Heading"`, `"Paragraph"`, `"Button"`, `"Image"`, `"Logo"`, `"Spacer"`, `"Divider"`, `"NavBar"`, `"Footer"`, `"HeroBanner"`, `"PropertyCard"`, `"UnitCard"`, `"Repeater"`, `"InputField"`, `"Form"`, `"MapEmbed"`, `"Gallery"`.
- [ ] `apps/web/lib/site-config/parse.ts` exports `parseSiteConfig` (throws) and `safeParseSiteConfig` (returns discriminated union). Round-trips JSON without loss.
- [ ] `apps/web/types/site-config.ts` re-exports inferred TS types from `schema.ts` via `z.infer`. No hand-written types outside `schema.ts`.
- [ ] `apps/web/lib/site-config/style.ts` exports `styleConfigToCss(style: StyleConfig): React.CSSProperties` covering every §6.4 field, with one unit test per branch.
- [ ] `apps/web/lib/site-config/ids.ts` exports `newComponentId(prefix?: string): string` returning `cmp_<8-char-hex>`. Tested for uniqueness across 1000 calls.
- [ ] `apps/web/components/renderer/Renderer.tsx` exports `<Renderer>` with the §10.1 `RendererProps` signature. On a missing page slug, renders `<div>Page not found: {page}</div>` (no throw).
- [ ] `mode === "edit"` wraps every component in `<EditModeWrapper>`; `mode === "preview"` and `mode === "public"` skip it.
- [ ] `<ComponentRenderer>` uses `React.memo`. Tests prove sibling re-renders are not triggered when one node changes.
- [ ] `<ComponentErrorBoundary>` is a class component; descendants throwing during render show `<div role="alert">Component error — click to remove</div>`. Siblings continue to render. Verified by test.
- [ ] `apps/web/components/site-components/registry.ts` exports `componentRegistry: Record<ComponentType, RegistryEntry>` with `Component`, `meta.displayName`, `meta.category`, `meta.childrenPolicy`. Six real entries + 14 placeholders that throw "Component {Type} not yet implemented — Sprint 5".
- [ ] Section, Heading, Paragraph, Image, Spacer, Divider each render with `node.style` applied via `styleConfigToCss` plus their component-specific props. `Image` uses a plain `<img>` (NOT `next/image`).
- [ ] Each of the six components has a `SPEC.md` documenting Props, Style controls, AI ops supported, Data binding (`none` for all six this sprint), Children policy.
- [ ] Each of the six components ships an `EditPanel.tsx` skeleton — empty stub returning `<div data-component-edit-panel="{name}" />`. Sprint 8 fills these in.
- [ ] `apps/web/app/dev/preview/page.tsx` is a server component that imports the fixture, validates via `parseSiteConfig`, and renders `<Renderer mode="preview" page="home">`. Returns `notFound()` if `process.env.NODE_ENV === "production"`.
- [ ] The fixture in `apps/web/app/dev/preview/fixtures.ts` exercises every one of the six components and at least three different `StyleConfig` features. `fixtures.test.ts` proves the fixture parses against the schema.
- [ ] At least 30 new tests added across schema, parse, style, ids, registry, components, renderer, error boundary, edit-mode wrapper, and the fixture. All passing. Zero skipped.
- [ ] `pnpm test` — zero failures, zero skipped.
- [ ] `pnpm build` — zero TypeScript errors, zero warnings.
- [ ] `pnpm biome check` (or `pnpm lint` per the repo's wiring) — zero warnings.
- [ ] Manual smoke test (below) passes on a fresh `pnpm dev`.
- [ ] No new files outside the "Files you may create or modify" list below.
- [ ] No new dependencies added (zod is already in the workspace from Sprint 2). Any addition requires an approved Deviation.
- [ ] `DECISIONS.md` updated only if a deviation was approved during this sprint.

## Files you may create or modify

- `apps/web/types/site-config.ts`
- `apps/web/lib/site-config/index.ts`
- `apps/web/lib/site-config/schema.ts`
- `apps/web/lib/site-config/parse.ts`
- `apps/web/lib/site-config/style.ts`
- `apps/web/lib/site-config/ids.ts`
- `apps/web/lib/site-config/__tests__/schema.test.ts`
- `apps/web/lib/site-config/__tests__/parse.test.ts`
- `apps/web/lib/site-config/__tests__/style.test.ts`
- `apps/web/lib/site-config/__tests__/ids.test.ts`
- `apps/web/components/renderer/Renderer.tsx`
- `apps/web/components/renderer/ComponentRenderer.tsx`
- `apps/web/components/renderer/ComponentErrorBoundary.tsx`
- `apps/web/components/renderer/EditModeWrapper.tsx`
- `apps/web/components/renderer/index.ts`
- `apps/web/components/renderer/__tests__/Renderer.test.tsx`
- `apps/web/components/renderer/__tests__/ComponentErrorBoundary.test.tsx`
- `apps/web/components/renderer/__tests__/EditModeWrapper.test.tsx`
- `apps/web/components/site-components/registry.ts`
- `apps/web/components/site-components/__tests__/registry.test.ts`
- `apps/web/components/site-components/Section/index.tsx`
- `apps/web/components/site-components/Section/EditPanel.tsx`
- `apps/web/components/site-components/Section/SPEC.md`
- `apps/web/components/site-components/Section/__tests__/Section.test.tsx`
- `apps/web/components/site-components/Heading/index.tsx`
- `apps/web/components/site-components/Heading/EditPanel.tsx`
- `apps/web/components/site-components/Heading/SPEC.md`
- `apps/web/components/site-components/Heading/__tests__/Heading.test.tsx`
- `apps/web/components/site-components/Paragraph/index.tsx`
- `apps/web/components/site-components/Paragraph/EditPanel.tsx`
- `apps/web/components/site-components/Paragraph/SPEC.md`
- `apps/web/components/site-components/Paragraph/__tests__/Paragraph.test.tsx`
- `apps/web/components/site-components/Image/index.tsx`
- `apps/web/components/site-components/Image/EditPanel.tsx`
- `apps/web/components/site-components/Image/SPEC.md`
- `apps/web/components/site-components/Image/__tests__/Image.test.tsx`
- `apps/web/components/site-components/Spacer/index.tsx`
- `apps/web/components/site-components/Spacer/EditPanel.tsx`
- `apps/web/components/site-components/Spacer/SPEC.md`
- `apps/web/components/site-components/Spacer/__tests__/Spacer.test.tsx`
- `apps/web/components/site-components/Divider/index.tsx`
- `apps/web/components/site-components/Divider/EditPanel.tsx`
- `apps/web/components/site-components/Divider/SPEC.md`
- `apps/web/components/site-components/Divider/__tests__/Divider.test.tsx`
- `apps/web/app/dev/preview/page.tsx`
- `apps/web/app/dev/preview/fixtures.ts`
- `apps/web/app/dev/preview/__tests__/fixtures.test.ts`

## Files you MUST NOT modify

- `PROJECT_SPEC.md` (the spec is authoritative; raise concerns via the Deviation Protocol).
- `DECISIONS.md` except by appending a new entry for an approved deviation. Never edit existing entries.
- `apps/web/lib/rm-api/**` (Sprint 1).
- `apps/web/lib/supabase/**` (Sprint 1).
- `apps/web/components/rmx-shell/**` (Sprint 1).
- `apps/web/components/setup-form/**` (Sprint 2).
- `apps/web/lib/setup-form/**` (read-only — `palettes.ts` and `types.ts` may be imported but never edited).
- `apps/web/app/(rmx)/**` (Sprint 1/2).
- `apps/web/app/api/**` (Sprint 4+).
- `apps/web/components/editor/**` (Sprint 6+).
- `supabase/**` (Sprint 1+).
- The 14 not-yet-implemented site-components (Row, Column, Button, Logo, NavBar, Footer, HeroBanner, PropertyCard, UnitCard, Repeater, InputField, Form, MapEmbed, Gallery) — registry placeholders only; no folder for any of them this sprint.
- Any file outside the "Files you may create or modify" list above.

## Coding standards (binding — copied from PROJECT_SPEC.md §15)

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs where it adds safety: `type SiteId = string & { __brand: "SiteId" }`.

### React
- Server components by default. `"use client"` only where needed (event handlers, refs, class components).
- One component per file. File name = export name.
- Use `cn(...)` from `lib/utils.ts` for class merging.
- No prop drilling deeper than 2 levels — lift to Zustand. (Not needed in this sprint; the renderer is prop-driven.)

### Naming
- Files: `kebab-case.ts(x)`, EXCEPT React component files: `PascalCase.tsx` matches the export.
- Components: `PascalCase`.
- Hooks: `useThing`.
- Database tables/columns: `snake_case`. (Not relevant this sprint.)
- TypeScript fields: `camelCase`.

### Commits
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- One concern per commit. If a commit message has "and" in it, split it.

### Testing
- Vitest. Co-locate tests under `__tests__/` next to source.
- One assertion idea per test (multiple `expect` calls fine when they verify the same idea).
- No skipped tests. No `.only`.

### Comments
- Comment why, not what.
- TODO comments must include an owner: `// TODO(architect): tighten DataBinding.filters in Sprint 9`.
- No commented-out code in committed files.

### Quality gates (binding for this sprint)
- `pnpm test` — zero failures, zero skipped.
- `pnpm build` — zero TypeScript errors, zero warnings.
- `pnpm biome check` (or `pnpm lint`) — zero warnings.
- The manual smoke test below.

If any check fails, treat it as a Deviation. Do not commit. Do not declare the sprint complete.

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
🛑 DEVIATION DETECTED
Sprint: Sprint 3 — Site config schema + base renderer
Failed DoD item: [The exact bullet from Definition of Done that this blocks]
What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]
Why it's not working (1–2 sentences, technical):
[Brief technical reason.]
Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]
Trade-offs:

Gain: [What we get]
Lose: [What we give up]
Risk:  [What might break]

Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]
Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.

After emitting the report, STOP. Do not write code. Do not edit files. Wait.

### Approval handling

- `Approved` → implement the proposed alternative as written.
- `Approved with changes: [...]` → implement with the user's modifications.
- `Rejected — [direction]` → discard the proposal; follow the new direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not assume.

After any approved deviation, append an entry to `/DECISIONS.md` with date, sprint, what was changed, and the user's approval message verbatim.

## Pre-flight check (emit at the start of the session)
🛫 PRE-FLIGHT CHECK — Sprint 3: Site config schema + base renderer
Before this sprint can run end-to-end, verify:

You are on the single working branch (no worktrees). git status shows
a clean working tree on the branch the user is using.
Sprints 0, 1, and 2 are merged. Specifically these paths exist:

apps/web/lib/utils.ts (cn helper)
apps/web/lib/setup-form/types.ts (PALETTE_IDS)
apps/web/lib/setup-form/palettes.ts
apps/web/components/rmx-shell/
apps/web/components/setup-form/


These paths do NOT yet exist (Sprint 3 will create them):

apps/web/lib/site-config/
apps/web/components/renderer/
apps/web/components/site-components/
apps/web/types/site-config.ts
apps/web/app/dev/


pnpm install completes cleanly.
pnpm test and pnpm build currently pass on main (baseline green).

If any of (1)–(3) is wrong, STOP and emit a Deviation Report — do not
proceed. If (4) or (5) fail, treat as a Deviation. If everything checks
out, reply "Pre-flight passed" and begin work.

## Manual smoke test (numbered, click-by-click)

1. From `WTSZurWay/`, run `pnpm install` (no-op if up to date — must complete with zero errors).
2. Run `pnpm dev`. Wait for "Ready" and the local URL.
3. Open `http://localhost:3000/dev/preview` in a browser.
4. Confirm the page renders (no error overlay, no white screen).
5. Confirm a heading is visible (Section → Heading from the fixture).
6. Confirm a paragraph of body text is visible below the heading.
7. Confirm an image element renders with the fixture's `alt` text. Inspect the DOM to verify `<img alt="...">`.
8. Confirm a horizontal divider line is visible between sections.
9. Confirm vertical whitespace where the Spacer is placed (DevTools → element with the configured height).
10. Open DevTools → Elements. Confirm the outermost rendered element does NOT carry any `data-edit-*` attributes (the page renders in `mode="preview"`, so the edit wrapper must be absent).
11. Stop the dev server. In a terminal, run `NODE_ENV=production pnpm dev`. Open `http://localhost:3000/dev/preview` and confirm a 404 page renders (production hides the dev route).
12. Stop both dev servers.
13. Run `pnpm test`. All tests pass; the new total is at least 30 tests above the previous baseline.
14. Run `pnpm build`. Compiles successfully with zero TypeScript errors.
15. Run `pnpm biome check`. Zero warnings.

## Definition of "done" gating

A sprint is not done until all of the following pass with no warnings:
- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above.

If any check fails, treat it as a Deviation. Do not commit. Do not declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server.
- `pnpm test` — Vitest.
- `pnpm test --watch` — interactive test loop.
- `pnpm build` — Next.js production build.
- `pnpm biome check` (or `pnpm lint`) — Biome lint + format check.

## Notes & hints (non-binding context)

### Recursive Zod schema pattern

Declare the TypeScript type first, then annotate the Zod schema explicitly to break the inference cycle:

```ts
type ComponentNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style: StyleConfig;
  animation?: AnimationConfig;
  visibility?: "always" | "desktop" | "mobile";
  children?: ComponentNode[];
  dataBinding?: DataBinding;
};

const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: componentTypeSchema,
    props: z.record(z.string(), z.unknown()),
    style: styleConfigSchema,
    animation: animationConfigSchema.optional(),
    visibility: z.enum(["always", "desktop", "mobile"]).optional(),
    children: z.array(componentNodeSchema).optional(),
    dataBinding: dataBindingSchema.optional(),
  }),
);
```

### Why a registry placeholder for the other 14

A complete `ComponentType` enum lets the schema validate any future AI-generated config without re-touching `schema.ts`. The runtime placeholder fails loudly during development if someone hand-writes a config using a not-yet-built type. Schema is forward-compatible; runtime is honest.

### Server vs client component split

Mark client (`"use client"`):
- `apps/web/components/renderer/Renderer.tsx`
- `apps/web/components/renderer/ComponentRenderer.tsx`
- `apps/web/components/renderer/ComponentErrorBoundary.tsx`
- `apps/web/components/renderer/EditModeWrapper.tsx`

Leave as server components (no `"use client"`):
- The six site-component `index.tsx` files (pure rendering, no hooks/handlers).
- `apps/web/app/dev/preview/page.tsx`.

### `Image` component — use plain `<img>`

`next/image` requires `images.remotePatterns` configuration for arbitrary external URLs. Sprint 3 sidesteps this by using a plain `<img>` tag. Add a comment: `// TODO(architect): migrate to next/image after remotePatterns configured in Sprint 15.`

### Memoization gotcha

Don't recompute styles inline:

```tsx
// BAD — defeats React.memo
<Component style={styleConfigToCss(node.style)} />

// GOOD — memoized per node
const cssStyle = useMemo(() => styleConfigToCss(node.style), [node.style]);
```

### Palette enum sync

Import `PALETTE_IDS` from `apps/web/lib/setup-form/types.ts` and define `paletteIdSchema = z.enum(PALETTE_IDS)`. Do not duplicate the tuple.

### What you do NOT do this sprint

- Do not implement animation playback (Framer Motion comes in Sprint 8).
- Do not resolve data bindings or RM field tokens (Sprint 9).
- Do not wire selection state — `<EditModeWrapper>` exposes the click/contextmenu callbacks via props but no Zustand store exists yet (Sprint 6 adds it).
- Do not add any of the other 14 components — only registry placeholders.
- Do not touch `next.config.mjs` or `images.remotePatterns`.
- Do not introduce `framer-motion`, `react-querybuilder`, `@tanstack/react-query`, or any other new dependency.