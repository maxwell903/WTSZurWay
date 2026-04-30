# Section Free Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-Section "Free Placement" toggle that captures children's current visual positions and renders them absolutely thereafter, so resizing/moving/AI-inserting one child cannot reflow its siblings.

**Architecture:** Add an optional `position?: { x, y }` field to every `ComponentNode`. When a Section has `props.freePlacement === true`, its direct children render inside `position: absolute` wrapper divs read from `node.position`. A snapshot store action captures DOM rects on `false → true` toggle so visual layout is preserved. Drag-to-reposition, numeric inputs, AI insert defaults, and left/top resize handles all read the parent's `freePlacement` flag and switch behavior.

**Tech Stack:** Next.js / React 19 / TypeScript (strict). Zustand for editor state. Zod for schema validation. Vitest + Testing Library. dnd-kit for drag-drop. The `pnpm` monorepo root has commands `pnpm typecheck`, `pnpm test`, `pnpm biome check`.

**Spec:** [docs/superpowers/specs/2026-04-30-section-free-placement-design.md](../specs/2026-04-30-section-free-placement-design.md)

**Quality gates per CLAUDE.md §15.7:** A phase is "done" when `pnpm typecheck`, the targeted Vitest run, and `pnpm biome check` (against the changed files only) all pass with zero failures and zero warnings. Run `pnpm test` (full suite) only at the end of each major phase or on explicit request — see CLAUDE.md "Token economy: when to run which gate."

**Mid-task gate command (run from `apps/web`, not repo root):**
```bash
pnpm typecheck
pnpm biome check <changed-files>
pnpm test <single-test-file>
```
On Windows, biome paths must be relative to `apps/web` (the cwd PowerShell starts in). Forward slashes work; do not prefix with `apps/web/`.

---

## Phase 1 — Schema + render + snapshot

This is the largest single phase and is what unblocks "I can toggle the toggle without my page exploding." Phase 1 leaves AI inserts going to (0, 0) — that's Phase 2.

### Task 1.1: Add `ComponentPosition` schema and `position` field to `ComponentNode`

**Files:**
- Modify: `apps/web/lib/site-config/schema.ts`
- Test: `apps/web/lib/site-config/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/lib/site-config/__tests__/schema.test.ts`:

```ts
describe("componentNodeSchema position field", () => {
  it("accepts a node with optional position", () => {
    const node = {
      id: "n",
      type: "Section",
      props: {},
      style: {},
      position: { x: 12, y: 34 },
    };
    expect(componentNodeSchema.parse(node).position).toEqual({ x: 12, y: 34 });
  });

  it("accepts a node without position (back-compat)", () => {
    const node = { id: "n", type: "Section", props: {}, style: {} };
    expect(componentNodeSchema.parse(node).position).toBeUndefined();
  });

  it("rejects a position with non-numeric x", () => {
    const node = {
      id: "n",
      type: "Section",
      props: {},
      style: {},
      position: { x: "12", y: 34 },
    };
    expect(() => componentNodeSchema.parse(node)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && pnpm test lib/site-config/__tests__/schema.test.ts
```
Expected: 3 new tests fail (schema doesn't know `position` yet).

- [ ] **Step 3: Add `componentPositionSchema` and extend `ComponentNode`**

In `apps/web/lib/site-config/schema.ts`, after the `styleConfigSchema` block (~line 109), add:

```ts
export const componentPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type ComponentPosition = z.infer<typeof componentPositionSchema>;
```

In the same file, update the `ComponentNode` type (~line 122):

```ts
export type ComponentNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style: StyleConfig;
  position?: ComponentPosition;
  animation?: AnimationConfig;
  visibility?: "always" | "desktop" | "mobile";
  children?: ComponentNode[];
  dataBinding?: DataBinding;
};
```

And update the runtime `componentNodeSchema` (~line 135):

```ts
export const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: componentTypeSchema,
    props: z.record(z.string(), z.unknown()),
    style: styleConfigSchema,
    position: componentPositionSchema.optional(),
    animation: animationConfigSchema.optional(),
    visibility: z.enum(["always", "desktop", "mobile"]).optional(),
    children: z.array(componentNodeSchema).optional(),
    dataBinding: dataBindingSchema.optional(),
  }),
);
```

- [ ] **Step 4: Re-export from the barrel**

Confirm `apps/web/lib/site-config/index.ts` re-exports `componentPositionSchema` and `ComponentPosition`. If it re-exports `* from "./schema"`, no change needed; if it has explicit named re-exports, append the two new ones. Read first to check.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/web && pnpm test lib/site-config/__tests__/schema.test.ts
```
Expected: all 3 new tests pass; existing tests still green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/site-config/schema.ts apps/web/lib/site-config/__tests__/schema.test.ts
# (and apps/web/lib/site-config/index.ts if you edited it)
git commit -m "feat(schema): add ComponentPosition and optional position field on ComponentNode"
```

---

### Task 1.2: Rename `fitToContents` → `freePlacement` with transitional read

**Files:**
- Modify: `apps/web/components/site-components/Section/index.tsx`
- Modify: `apps/web/components/site-components/Section/EditPanel.tsx`
- Modify: `apps/web/components/site-components/Section/SPEC.md`
- Modify: `apps/web/components/site-components/Section/__tests__/Section.test.tsx`

This task **renames** the Approach-B prop and **deletes the Approach-B "suppress auto-flex" describe block** in the test file (because Phase 1 replaces those semantics with the new render path, which has its own tests in Task 1.4 and 1.6). The remaining describe blocks (HTML tag selection, default block layout, auto-flex on explicit-width child) stay because they describe behavior when `freePlacement` is unset (the default).

- [ ] **Step 1: Update `sectionPropsSchema` in `Section/index.tsx`**

Replace the current schema:

```ts
const sectionPropsSchema = z.object({
  as: z.enum(["section", "div", "main", "article"]).default("section"),
  freePlacement: z.boolean().optional(),
});
```

(Drop the old `fitToContents` field and its comment.)

- [ ] **Step 2: Update the read sites in `Section/index.tsx`**

Replace the line that reads `fitToContents`:

```ts
const fitToContents = parsed.success ? parsed.data.fitToContents === true : false;
```

with the transitional dual-read:

```ts
const freePlacement = parsed.success
  ? parsed.data.freePlacement === true ||
    (node.props as { fitToContents?: unknown }).fitToContents === true
  : false;
```

Rename the local `fitToContents` variable usage at the `if (!fitToContents && hasExplicitWidthChild)` site to `freePlacement`:

```ts
if (!freePlacement && hasExplicitWidthChild) {
```

- [ ] **Step 3: Update `Section/EditPanel.tsx`**

Replace:

```ts
const fitToContents = (node.props as { fitToContents?: unknown }).fitToContents === true;
```

with:

```ts
const freePlacement =
  (node.props as { freePlacement?: unknown; fitToContents?: unknown }).freePlacement === true ||
  (node.props as { fitToContents?: unknown }).fitToContents === true;
```

Update the `SwitchInput`:

```tsx
<SwitchInput
  id={`section-free-placement-${node.id}`}
  label="Free placement"
  value={freePlacement}
  testId="section-free-placement"
  tooltip="When on, children stay in fixed positions. Resizing or adding a child won't move the others."
  onChange={(next) => {
    // Migration: drop the legacy `fitToContents` key on every write so once
    // the user touches the toggle post-rename, the legacy name is gone.
    const { fitToContents: _legacy, ...rest } = node.props as Record<string, unknown>;
    setComponentProps(node.id, { ...rest, freePlacement: next });
  }}
/>
```

- [ ] **Step 4: Update SPEC.md**

In `apps/web/components/site-components/Section/SPEC.md`, replace the `fitToContents` row in the props table with `freePlacement`. Update the description to reflect the new (absolute-positioning) semantics:

```md
| `freePlacement` | `boolean` | `false` | When `true`, direct children render in absolute layout at their `position.{x,y}`. Resizing, moving, or AI-inserting a child can no longer reflow its siblings. The toggle lives on the Content tab. Snapshot of current visual rects fires on `false → true`. |
```

- [ ] **Step 5: Update Section tests**

In `apps/web/components/site-components/Section/__tests__/Section.test.tsx`:

- **Delete** the entire `describe("Section fitToContents toggle", () => { ... })` block (the two tests we wrote for Approach B). They describe semantics that no longer exist.
- The remaining describe blocks (`<Section>`, `Section flex-on-explicit-width (UX rework)`) stay verbatim.

- [ ] **Step 6: Run targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/site-components/Section
cd apps/web && pnpm test components/site-components/Section/__tests__/Section.test.tsx
```
Expected: typecheck clean; biome clean; Section tests green (the four remaining tests + the now-deleted block doesn't run).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/site-components/Section
git commit -m "refactor(section): rename fitToContents prop to freePlacement"
```

---

### Task 1.3: `setComponentPosition` apply function and store action

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts`
- Modify: `apps/web/lib/editor-state/types.ts`
- Modify: `apps/web/lib/editor-state/store.ts`
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts`

- [ ] **Step 1: Read `actions.ts` to find an existing similar `applySet*` for shape reference**

```bash
cd apps/web && rg -n "applySetComponentStyle" lib/editor-state/actions.ts | head -5
```
Read those 30-50 surrounding lines. Mirror that pattern for `applySetComponentPosition`.

- [ ] **Step 2: Write the failing test**

Append to `apps/web/lib/editor-state/__tests__/actions.test.ts`:

```ts
describe("applySetComponentPosition", () => {
  it("sets position on the target node", () => {
    const config = makeConfigWith({
      id: "h",
      type: "Heading",
      props: {},
      style: {},
    });
    const next = applySetComponentPosition(config, "h", { x: 100, y: 200 });
    const node = findNodeById(next.pages[0].rootComponent, "h");
    expect(node?.position).toEqual({ x: 100, y: 200 });
  });

  it("overwrites an existing position", () => {
    const config = makeConfigWith({
      id: "h",
      type: "Heading",
      props: {},
      style: {},
      position: { x: 0, y: 0 },
    });
    const next = applySetComponentPosition(config, "h", { x: 50, y: 75 });
    const node = findNodeById(next.pages[0].rootComponent, "h");
    expect(node?.position).toEqual({ x: 50, y: 75 });
  });

  it("is a no-op when target id is not found", () => {
    const config = makeConfigWith({ id: "h", type: "Heading", props: {}, style: {} });
    const next = applySetComponentPosition(config, "missing", { x: 1, y: 2 });
    expect(next).toBe(config);
  });
});
```

(`makeConfigWith` and `findNodeById` already exist in that test file; reuse them. If the helper signature differs, mirror what other `applySet*` test blocks above use.)

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm test lib/editor-state/__tests__/actions.test.ts
```
Expected: 3 new tests fail with "applySetComponentPosition is not defined".

- [ ] **Step 4: Implement `applySetComponentPosition`**

In `apps/web/lib/editor-state/actions.ts`, add — alongside `applySetComponentStyle`:

```ts
import type { ComponentPosition } from "@/lib/site-config";

export function applySetComponentPosition(
  config: SiteConfig,
  id: ComponentId,
  position: ComponentPosition,
): SiteConfig {
  return updateNode(config, id, (node) => ({ ...node, position: { ...position } }));
}
```

(`updateNode` is the local helper used by `applySetComponentStyle`, etc. — re-use it. If the function name differs in your branch, match the pattern of the existing `applySetComponentStyle`.)

- [ ] **Step 5: Wire the store action**

In `apps/web/lib/editor-state/types.ts`, add to the `EditorActions` interface (next to `setComponentStyle`):

```ts
setComponentPosition: (id: ComponentId, position: ComponentPosition) => void;
```

Import `ComponentPosition` at the top of the file from `@/lib/site-config`.

In `apps/web/lib/editor-state/store.ts`, import `applySetComponentPosition` from `./actions`, and add the action implementation alongside `setComponentStyle`:

```ts
setComponentPosition: (id, position) =>
  set((state) => ({
    draftConfig: applySetComponentPosition(state.draftConfig, id, position),
    saveState: "dirty",
  })),
```

- [ ] **Step 6: Run targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm test lib/editor-state/__tests__/actions.test.ts
cd apps/web && pnpm biome check lib/editor-state
```
Expected: 3 new tests pass; existing tests still green; biome clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/editor-state apps/web/lib/site-config
git commit -m "feat(editor): add setComponentPosition store action"
```

---

### Task 1.4: Section absolute-mode render

**Files:**
- Modify: `apps/web/components/site-components/Section/index.tsx`
- Modify: `apps/web/components/site-components/Section/__tests__/Section.test.tsx`

This is where Section renders its direct children in absolute layout when `freePlacement` is on.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/components/site-components/Section/__tests__/Section.test.tsx`:

```ts
describe("Section freePlacement absolute layout", () => {
  it("renders direct children in absolutely-positioned wrappers", () => {
    const node: ComponentNode = {
      id: "cmp_s",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [
        { id: "a", type: "Heading", props: {}, style: {}, position: { x: 12, y: 34 } },
        { id: "b", type: "Heading", props: {}, style: {}, position: { x: 56, y: 78 } },
      ],
    };
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
        <span data-testid="b">b</span>
      </Section>,
    );
    const section = container.firstElementChild as HTMLElement;
    expect(section.style.position).toBe("relative");
    const wrappers = section.querySelectorAll(":scope > div");
    expect(wrappers.length).toBe(2);
    const w0 = wrappers[0] as HTMLElement;
    expect(w0.style.position).toBe("absolute");
    expect(w0.style.left).toBe("12px");
    expect(w0.style.top).toBe("34px");
  });

  it("auto-sizes section min-height to bounding box of positioned children when height unset", () => {
    const node: ComponentNode = {
      id: "cmp_s",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [
        {
          id: "a",
          type: "Heading",
          props: {},
          style: { height: "100px" },
          position: { x: 0, y: 200 },
        },
      ],
    };
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
      </Section>,
    );
    const section = container.firstElementChild as HTMLElement;
    expect(section.style.minHeight).toBe("300px"); // 200 + 100
  });

  it("respects user-set cssStyle.height (no min-height applied)", () => {
    const node: ComponentNode = {
      id: "cmp_s",
      type: "Section",
      props: { freePlacement: true },
      style: { height: "500px" },
      children: [
        {
          id: "a",
          type: "Heading",
          props: {},
          style: { height: "100px" },
          position: { x: 0, y: 200 },
        },
      ],
    };
    const { container } = render(
      <Section node={node} cssStyle={{ height: "500px" }}>
        <span data-testid="a">a</span>
      </Section>,
    );
    const section = container.firstElementChild as HTMLElement;
    expect(section.style.height).toBe("500px");
    expect(section.style.minHeight).toBe("");
  });

  it("falls back to (0,0) for children without position", () => {
    const node: ComponentNode = {
      id: "cmp_s",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [{ id: "a", type: "Heading", props: {}, style: {} }],
    };
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
      </Section>,
    );
    const wrapper = container.firstElementChild?.querySelector(":scope > div") as HTMLElement;
    expect(wrapper.style.left).toBe("0px");
    expect(wrapper.style.top).toBe("0px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && pnpm test components/site-components/Section/__tests__/Section.test.tsx
```
Expected: 4 new tests fail.

- [ ] **Step 3: Implement absolute-mode render in `Section/index.tsx`**

Replace the function body (preserving the existing schema parse + `freePlacement` read from Task 1.2). The new structure:

```tsx
export function Section({ node, cssStyle, children }: SectionProps) {
  const parsed = sectionPropsSchema.safeParse(node.props);
  const tag = parsed.success ? parsed.data.as : "section";
  const freePlacement = parsed.success
    ? parsed.data.freePlacement === true ||
      (node.props as { fitToContents?: unknown }).fitToContents === true
    : false;

  const childNodes = node.children ?? [];
  const childArray = Children.toArray(children);

  let renderedChildren: ReactNode = children;
  let finalStyle: CSSProperties = cssStyle;

  if (freePlacement) {
    // Absolute layout for direct children. Section becomes the positioning
    // context. Each child is wrapped in an absolute div fed from
    // `child.position` (defaulting to (0,0)) and the child's own
    // `style.width`/`style.height`.
    const minHeight = computeFreePlacementMinHeight(childNodes);
    finalStyle = {
      ...cssStyle,
      position: "relative",
      // User-set height wins; otherwise grow to fit positioned children.
      ...(cssStyle.height === undefined && minHeight > 0 ? { minHeight: `${minHeight}px` } : {}),
    };
    renderedChildren = childArray.map((child, idx) => {
      const childNode = childNodes[idx];
      const x = childNode?.position?.x ?? 0;
      const y = childNode?.position?.y ?? 0;
      const w = childNode?.style?.width ?? "auto";
      const h = childNode?.style?.height ?? "auto";
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional, no stable id
        <div
          key={idx}
          data-free-placement-child={childNode?.id ?? ""}
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: w,
            height: h,
          }}
        >
          {child}
        </div>
      );
    });
  } else if (hasExplicitWidthChild(childNodes)) {
    // Existing flex-row-wrap behavior. Body unchanged from current code.
    finalStyle = {
      ...cssStyle,
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
    };
    renderedChildren = childArray.map((child, idx) => {
      const childNode = childNodes[idx];
      const w = childNode?.style?.width;
      const flex = w ? `0 0 ${w}` : "1 1 100%";
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional, no stable id
        <div key={idx} style={{ flex, minWidth: 0, maxWidth: "100%" }}>
          {child}
        </div>
      );
    });
  }

  // ...existing tag switch (section / div / main / article) unchanged.
}

function hasExplicitWidthChild(children: readonly ComponentNode[]): boolean {
  return children.some((c) => c.style?.width !== undefined);
}

function computeFreePlacementMinHeight(children: readonly ComponentNode[]): number {
  let max = 0;
  for (const c of children) {
    const y = c.position?.y ?? 0;
    const hStr = c.style?.height;
    const h = typeof hStr === "string" ? parseFloat(hStr) : 0;
    if (Number.isFinite(y + h)) max = Math.max(max, y + (Number.isFinite(h) ? h : 0));
  }
  return Math.round(max);
}
```

(Adjust imports: `Children` is already imported; you may need to extract `Children.toArray` from the existing `Children.map(children, (child, idx) => ...)` pattern.)

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && pnpm test components/site-components/Section/__tests__/Section.test.tsx
```
Expected: 4 new tests pass; the prior `Section flex-on-explicit-width` block also still passes (because the `else if` branch is unchanged).

- [ ] **Step 5: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/site-components/Section
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/site-components/Section
git commit -m "feat(section): render direct children in absolute layout when freePlacement is on"
```

---

### Task 1.5: `snapshotChildPositions` store action

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts`
- Modify: `apps/web/lib/editor-state/types.ts`
- Modify: `apps/web/lib/editor-state/store.ts`
- Test: `apps/web/lib/editor-state/__tests__/snapshot.test.ts` (new file)

This is the only store action with DOM-read coupling. The pure schema mutation (`applySnapshotChildPositions`) takes already-computed rects as input — the DOM read happens in the store wrapper. That keeps the apply function unit-testable without jsdom acrobatics.

- [ ] **Step 1: Add the pure apply function — write the failing test first**

Create `apps/web/lib/editor-state/__tests__/snapshot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { applySnapshotChildPositions } from "../actions";

function makeSection(children: ComponentNode[]): SiteConfig {
  return {
    meta: { siteName: "S", siteSlug: "s" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: {
          id: "sec",
          type: "Section",
          props: { freePlacement: true },
          style: {},
          children,
        },
      },
    ],
    forms: [],
  };
}

describe("applySnapshotChildPositions", () => {
  it("sets position on each child whose rect is supplied", () => {
    const cfg = makeSection([
      { id: "a", type: "Heading", props: {}, style: {} },
      { id: "b", type: "Heading", props: {}, style: {} },
    ]);
    const next = applySnapshotChildPositions(cfg, "sec", {
      a: { x: 10, y: 20, width: 100, height: 50 },
      b: { x: 0, y: 80, width: 100, height: 50 },
    });
    const root = next.pages[0].rootComponent;
    expect(root.children?.[0].position).toEqual({ x: 10, y: 20 });
    expect(root.children?.[0].style.width).toBe("100px");
    expect(root.children?.[0].style.height).toBe("50px");
    expect(root.children?.[1].position).toEqual({ x: 0, y: 80 });
  });

  it("skips children that already have a position (default mode)", () => {
    const cfg = makeSection([
      { id: "a", type: "Heading", props: {}, style: {}, position: { x: 1, y: 2 } },
      { id: "b", type: "Heading", props: {}, style: {} },
    ]);
    const next = applySnapshotChildPositions(cfg, "sec", {
      a: { x: 999, y: 999, width: 100, height: 50 },
      b: { x: 0, y: 80, width: 100, height: 50 },
    });
    const root = next.pages[0].rootComponent;
    expect(root.children?.[0].position).toEqual({ x: 1, y: 2 });
    expect(root.children?.[1].position).toEqual({ x: 0, y: 80 });
  });

  it("force=true overwrites existing positions (Recapture)", () => {
    const cfg = makeSection([
      { id: "a", type: "Heading", props: {}, style: {}, position: { x: 1, y: 2 } },
    ]);
    const next = applySnapshotChildPositions(
      cfg,
      "sec",
      { a: { x: 999, y: 999, width: 100, height: 50 } },
      { force: true },
    );
    expect(next.pages[0].rootComponent.children?.[0].position).toEqual({ x: 999, y: 999 });
  });

  it("does not overwrite explicit style.width / style.height", () => {
    const cfg = makeSection([
      { id: "a", type: "Heading", props: {}, style: { width: "300px", height: "50px" } },
    ]);
    const next = applySnapshotChildPositions(cfg, "sec", {
      a: { x: 0, y: 0, width: 999, height: 999 },
    });
    expect(next.pages[0].rootComponent.children?.[0].style.width).toBe("300px");
    expect(next.pages[0].rootComponent.children?.[0].style.height).toBe("50px");
  });

  it("returns the same config object when no rects supplied", () => {
    const cfg = makeSection([{ id: "a", type: "Heading", props: {}, style: {} }]);
    const next = applySnapshotChildPositions(cfg, "sec", {});
    expect(next).toBe(cfg);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && pnpm test lib/editor-state/__tests__/snapshot.test.ts
```
Expected: all 5 tests fail with "applySnapshotChildPositions is not defined".

- [ ] **Step 3: Implement `applySnapshotChildPositions`**

In `apps/web/lib/editor-state/actions.ts`:

```ts
export type SnapshotRect = { x: number; y: number; width: number; height: number };
export type SnapshotRects = Record<string, SnapshotRect>;

export function applySnapshotChildPositions(
  config: SiteConfig,
  sectionId: string,
  rects: SnapshotRects,
  options: { force?: boolean } = {},
): SiteConfig {
  if (Object.keys(rects).length === 0) return config;
  const force = options.force === true;
  return updateNode(config, sectionId, (section) => {
    const children = section.children ?? [];
    let touched = false;
    const nextChildren = children.map((child) => {
      const rect = rects[child.id];
      if (rect === undefined) return child;
      if (!force && child.position !== undefined) return child;
      touched = true;
      const nextStyle = { ...child.style };
      if (nextStyle.width === undefined) nextStyle.width = `${Math.round(rect.width)}px`;
      if (nextStyle.height === undefined) nextStyle.height = `${Math.round(rect.height)}px`;
      return {
        ...child,
        position: { x: Math.round(rect.x), y: Math.round(rect.y) },
        style: nextStyle,
      };
    });
    if (!touched) return section;
    return { ...section, children: nextChildren };
  });
}
```

(If `applySnapshotChildPositions` makes `actions.ts` cross 600+ lines, split it into a new `apps/web/lib/editor-state/snapshot.ts` and re-export. Otherwise leave it inline next to `applySetComponentPosition`.)

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && pnpm test lib/editor-state/__tests__/snapshot.test.ts
```
Expected: all 5 pass.

- [ ] **Step 5: Wire the store action**

In `apps/web/lib/editor-state/types.ts`:

```ts
snapshotChildPositions: (sectionId: ComponentId, options?: { force?: boolean }) => void;
```

In `apps/web/lib/editor-state/store.ts`, import `applySnapshotChildPositions` and add:

```ts
snapshotChildPositions: (sectionId, options) =>
  set((state) => {
    if (typeof document === "undefined") return {};
    const sectionEl = document.querySelector(`[data-edit-id="${sectionId}"]`);
    if (!(sectionEl instanceof HTMLElement)) return {};
    const sectionRect = sectionEl.getBoundingClientRect();
    const rects: Record<string, { x: number; y: number; width: number; height: number }> = {};
    // Find direct children of the section node in the schema.
    const page = selectCurrentPage(state);
    if (!page) return {};
    const section = findComponentById(page.rootComponent, sectionId);
    if (!section || !section.children) return {};
    for (const child of section.children) {
      const el = document.querySelector(`[data-edit-id="${child.id}"]`);
      if (!(el instanceof HTMLElement)) continue;
      const r = el.getBoundingClientRect();
      rects[child.id] = {
        x: r.left - sectionRect.left + sectionEl.scrollLeft,
        y: r.top - sectionRect.top + sectionEl.scrollTop,
        width: r.width,
        height: r.height,
      };
    }
    return {
      draftConfig: applySnapshotChildPositions(state.draftConfig, sectionId, rects, options),
      saveState: "dirty",
    };
  }),
```

(`selectCurrentPage` and `findComponentById` are already imported elsewhere in `store.ts` — re-use them.)

- [ ] **Step 6: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check lib/editor-state
cd apps/web && pnpm test lib/editor-state
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/editor-state
git commit -m "feat(editor): add snapshotChildPositions store action with pure apply layer"
```

---

### Task 1.6: Wire toggle + Recapture button in Section EditPanel

**Files:**
- Modify: `apps/web/components/site-components/Section/EditPanel.tsx`
- Modify: `apps/web/components/site-components/Section/__tests__/Section.test.tsx` *or* create `apps/web/components/site-components/Section/__tests__/EditPanel.test.tsx`

- [ ] **Step 1: Write the failing test for toggle wiring + recapture**

Create `apps/web/components/site-components/Section/__tests__/EditPanel.test.tsx`:

```tsx
import type { ComponentNode } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SectionEditPanel } from "../EditPanel";
import { useEditorStore } from "@/lib/editor-state";

function node(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "sec", type: "Section", props, style: {} };
}

describe("<SectionEditPanel> freePlacement wiring", () => {
  beforeEach(() => {
    // Reset store. Mirror the pattern used by other panel tests in this repo.
    useEditorStore.setState({
      draftConfig: {
        meta: { siteName: "S", siteSlug: "s" },
        brand: { palette: "ocean", fontFamily: "Inter" },
        global: {
          navBar: { links: [], logoPlacement: "left", sticky: false },
          footer: { columns: [], copyright: "" },
        },
        pages: [
          {
            id: "p",
            slug: "home",
            name: "Home",
            kind: "static",
            rootComponent: {
              id: "sec",
              type: "Section",
              props: {},
              style: {},
              children: [],
            },
          },
        ],
        forms: [],
      },
      currentPageSlug: "home",
    });
  });

  it("renders the toggle off by default", () => {
    render(<SectionEditPanel node={node()} />);
    const sw = screen.getByTestId("section-free-placement");
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("flipping ON writes freePlacement=true via setComponentProps", () => {
    const setProps = vi.spyOn(useEditorStore.getState(), "setComponentProps");
    render(<SectionEditPanel node={node()} />);
    fireEvent.click(screen.getByTestId("section-free-placement"));
    expect(setProps).toHaveBeenCalledWith("sec", expect.objectContaining({ freePlacement: true }));
  });

  it("recapture button is hidden when freePlacement is off", () => {
    render(<SectionEditPanel node={node({ freePlacement: false })} />);
    expect(screen.queryByTestId("section-recapture-positions")).toBeNull();
  });

  it("recapture button is visible when freePlacement is on and calls snapshot with force", () => {
    const snap = vi.spyOn(useEditorStore.getState(), "snapshotChildPositions");
    render(<SectionEditPanel node={node({ freePlacement: true })} />);
    const btn = screen.getByTestId("section-recapture-positions");
    fireEvent.click(btn);
    expect(snap).toHaveBeenCalledWith("sec", { force: true });
  });

  it("transitional read: legacy fitToContents=true reads as freePlacement on", () => {
    render(<SectionEditPanel node={node({ fitToContents: true })} />);
    const sw = screen.getByTestId("section-free-placement");
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && pnpm test components/site-components/Section/__tests__/EditPanel.test.tsx
```
Expected: 5 tests fail.

- [ ] **Step 3: Update `Section/EditPanel.tsx`**

Replace the existing `SectionEditPanel` body with:

```tsx
"use client";

import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type SectionEditPanelProps = { node: ComponentNode };

export function SectionEditPanel({ node }: SectionEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const snapshotChildPositions = useEditorStore((s) => s.snapshotChildPositions);

  const props = node.props as { freePlacement?: unknown; fitToContents?: unknown };
  const freePlacement = props.freePlacement === true || props.fitToContents === true;

  const onToggle = (next: boolean) => {
    const { fitToContents: _legacy, ...rest } = node.props as Record<string, unknown>;
    setComponentProps(node.id, { ...rest, freePlacement: next });
    if (next === true) {
      // RAF so the DOM reflects the new prop before we read rects.
      requestAnimationFrame(() => snapshotChildPositions(node.id));
    }
  };

  return (
    <div
      data-component-edit-panel="Section"
      data-testid="content-placeholder-section"
      className="space-y-3 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Section is a structural container; the Style tab handles layout and the Pages tab handles
        its position.
      </p>
      <SwitchInput
        id={`section-free-placement-${node.id}`}
        label="Free placement"
        value={freePlacement}
        testId="section-free-placement"
        tooltip="When on, children stay in fixed positions. Resizing or adding a child won't move the others."
        onChange={onToggle}
      />
      {freePlacement ? (
        <button
          type="button"
          data-testid="section-recapture-positions"
          className="text-xs text-zinc-400 underline hover:text-zinc-200"
          onClick={() => snapshotChildPositions(node.id, { force: true })}
        >
          Recapture positions from current layout
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && pnpm test components/site-components/Section/__tests__/EditPanel.test.tsx
```
Expected: 5 pass.

- [ ] **Step 5: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/site-components/Section
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/site-components/Section
git commit -m "feat(section): wire freePlacement toggle to snapshot + add recapture button"
```

---

### Task 1.7: X / Y `NumberInput` row in StyleTab

**Files:**
- Modify: `apps/web/components/editor/edit-panels/tabs/StyleTab.tsx`
- Test: `apps/web/components/editor/edit-panels/tabs/__tests__/StyleTab.test.tsx` (likely exists — append a describe block; create file only if it doesn't)

- [ ] **Step 1: Confirm whether `StyleTab.test.tsx` exists**

```bash
ls apps/web/components/editor/edit-panels/tabs/__tests__/ 2>/dev/null || true
```
If it doesn't exist, create it; otherwise append a new describe block.

- [ ] **Step 2: Write the failing test**

Append to (or create) `apps/web/components/editor/edit-panels/tabs/__tests__/StyleTab.test.tsx`:

```tsx
import type { ComponentNode } from "@/lib/site-config";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "@/lib/editor-state";
import { StyleTab } from "../StyleTab";

function setupStore(parentProps: Record<string, unknown>, child: ComponentNode) {
  useEditorStore.setState({
    draftConfig: {
      meta: { siteName: "S", siteSlug: "s" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left", sticky: false },
        footer: { columns: [], copyright: "" },
      },
      pages: [
        {
          id: "p",
          slug: "home",
          name: "Home",
          kind: "static",
          rootComponent: {
            id: "sec",
            type: "Section",
            props: parentProps,
            style: {},
            children: [child],
          },
        },
      ],
      forms: [],
    },
    currentPageSlug: "home",
  });
}

describe("StyleTab — Position row when parent is freePlacement", () => {
  beforeEach(() => {
    useEditorStore.setState({}, true);
  });

  it("does NOT render X/Y inputs when parent is in flow mode", () => {
    const child: ComponentNode = {
      id: "h",
      type: "Heading",
      props: {},
      style: {},
      position: { x: 5, y: 10 },
    };
    setupStore({}, child);
    render(<StyleTab node={child} />);
    expect(screen.queryByTestId("style-position-x")).toBeNull();
    expect(screen.queryByTestId("style-position-y")).toBeNull();
  });

  it("renders X/Y inputs when parent has freePlacement=true", () => {
    const child: ComponentNode = {
      id: "h",
      type: "Heading",
      props: {},
      style: {},
      position: { x: 12, y: 34 },
    };
    setupStore({ freePlacement: true }, child);
    render(<StyleTab node={child} />);
    expect((screen.getByTestId("style-position-x") as HTMLInputElement).value).toBe("12");
    expect((screen.getByTestId("style-position-y") as HTMLInputElement).value).toBe("34");
  });

  it("editing X writes through setComponentPosition", () => {
    const child: ComponentNode = {
      id: "h",
      type: "Heading",
      props: {},
      style: {},
      position: { x: 12, y: 34 },
    };
    setupStore({ freePlacement: true }, child);
    const setPos = vi.spyOn(useEditorStore.getState(), "setComponentPosition");
    render(<StyleTab node={child} />);
    const x = screen.getByTestId("style-position-x") as HTMLInputElement;
    fireEvent.change(x, { target: { value: "100" } });
    fireEvent.blur(x);
    expect(setPos).toHaveBeenCalledWith("h", { x: 100, y: 34 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm test components/editor/edit-panels/tabs/__tests__/StyleTab.test.tsx
```
Expected: 3 new tests fail (the panel doesn't render X/Y yet).

- [ ] **Step 4: Implement the Position row**

In `apps/web/components/editor/edit-panels/tabs/StyleTab.tsx`:

1. Add a helper at the top to read parent's `freePlacement` flag:

   ```ts
   import { findComponentParentId, findComponentById, selectCurrentPage } from "@/lib/editor-state";

   function useParentIsFreePlacement(nodeId: string): boolean {
     return useEditorStore((s) => {
       const page = selectCurrentPage(s);
       if (!page) return false;
       const parentId = findComponentParentId(page.rootComponent, nodeId);
       if (!parentId) return false;
       const parent = findComponentById(page.rootComponent, parentId);
       if (!parent || parent.type !== "Section") return false;
       const props = parent.props as { freePlacement?: unknown; fitToContents?: unknown };
       return props.freePlacement === true || props.fitToContents === true;
     });
   }
   ```

2. In the `StyleTab` component body, after the existing `style` line and before the `if (mode === "none")` block:

   ```ts
   const parentIsFreePlacement = useParentIsFreePlacement(node.id);
   const setComponentPosition = useEditorStore((s) => s.setComponentPosition);
   const position = node.position ?? { x: 0, y: 0 };
   ```

3. In the `mode === "full"` return block, *above* the existing `<div className="grid grid-cols-2 gap-2">` that holds `Width`/`Height`, insert:

   ```tsx
   {parentIsFreePlacement ? (
     <div className="grid grid-cols-2 gap-2">
       <NumberInput
         id="style-position-x"
         label="X"
         value={position.x}
         step={1}
         testId="style-position-x"
         onChange={(next) =>
           setComponentPosition(node.id, { x: next ?? 0, y: position.y })
         }
       />
       <NumberInput
         id="style-position-y"
         label="Y"
         value={position.y}
         step={1}
         testId="style-position-y"
         onChange={(next) =>
           setComponentPosition(node.id, { x: position.x, y: next ?? 0 })
         }
       />
     </div>
   ) : null}
   ```

(`NumberInput` is already imported. Adjust the API to match existing usage — `onChange` may receive `number | undefined` depending on the control's signature. Mirror the existing `style-radius` `NumberInput` invocation in the same file.)

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/web && pnpm test components/editor/edit-panels/tabs/__tests__/StyleTab.test.tsx
```
Expected: 3 new tests pass; existing tests still green.

- [ ] **Step 6: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/editor/edit-panels/tabs
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/editor/edit-panels/tabs
git commit -m "feat(editor): add X/Y position inputs in StyleTab when parent is freePlacement"
```

---

### Task 1.8: Phase 1 smoke test in dev server

**Files:** none (manual verification)

The unit tests cover the data flow; this step verifies the visual behavior because some bugs only show up in the DOM (e.g. the EditModeWrapper passthrough interaction).

- [ ] **Step 1: Start the dev server**

```bash
cd apps/web && pnpm dev
```

- [ ] **Step 2: In the browser, with a fresh demo site:**
  1. Build a page with the page-root Section containing 3 children: a HeroBanner at the top, then two Sections side-by-side (each `style.width: 50%`).
  2. Note the visual positions of all three children.
  3. Select the page-root Section, open the Content tab, flip "Free placement" ON.
  4. **Verify:** all three children are still at the same screen positions (±1 px). The two side-by-side sections did NOT collapse to a single column.
  5. Use the StyleTab on one of the children and edit its X/Y values. Verify it moves on screen and the other children are unaffected.
  6. Toggle "Free placement" OFF. Verify the layout returns to flex-row-wrap (the original behavior). Toggle ON again — verify positions stick.
  7. Click "Recapture positions from current layout" — verify it does not visually change the page (since the children are already at their positions).

- [ ] **Step 3: If anything is off, file the regression as a sub-task and fix before proceeding.**

- [ ] **Step 4: No commit (manual smoke test only).**

---

## Phase 2 — AI insert defaults

When a child is added (via AI ops or palette drop) into a Section that has `freePlacement === true`, the new child gets a default `(x: 0, y: <below the lowest existing child + 16px>)`.

### Task 2.1: `applyAddComponentChild` fills default position when parent is freePlacement

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts` (the function `applyAddComponentChild`)
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts` (append)

- [ ] **Step 1: Find the existing function**

```bash
cd apps/web && rg -n "applyAddComponentChild" lib/editor-state/actions.ts
```
Read the function and the surrounding 30 lines.

- [ ] **Step 2: Write the failing test**

Append to `apps/web/lib/editor-state/__tests__/actions.test.ts`:

```ts
describe("applyAddComponentChild — freePlacement default position", () => {
  it("populates default (0, lowest+16) when parent has freePlacement and child has no position", () => {
    const cfg = makeConfigWith({
      id: "sec",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [
        {
          id: "a",
          type: "Heading",
          props: {},
          style: { height: "100px" },
          position: { x: 0, y: 0 },
        },
      ],
    });
    const newChild: ComponentNode = { id: "b", type: "Heading", props: {}, style: {} };
    const next = applyAddComponentChild(cfg, "sec", 1, newChild);
    const inserted = findNodeById(next.pages[0].rootComponent, "b");
    expect(inserted?.position).toEqual({ x: 0, y: 116 }); // 0 + 100 + 16
  });

  it("populates (0, 0) when parent is freePlacement and has no children yet", () => {
    const cfg = makeConfigWith({
      id: "sec",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [],
    });
    const newChild: ComponentNode = { id: "b", type: "Heading", props: {}, style: {} };
    const next = applyAddComponentChild(cfg, "sec", 0, newChild);
    expect(findNodeById(next.pages[0].rootComponent, "b")?.position).toEqual({ x: 0, y: 0 });
  });

  it("respects an explicit position on the new child if caller supplied one", () => {
    const cfg = makeConfigWith({
      id: "sec",
      type: "Section",
      props: { freePlacement: true },
      style: {},
      children: [],
    });
    const newChild: ComponentNode = {
      id: "b",
      type: "Heading",
      props: {},
      style: {},
      position: { x: 50, y: 75 },
    };
    const next = applyAddComponentChild(cfg, "sec", 0, newChild);
    expect(findNodeById(next.pages[0].rootComponent, "b")?.position).toEqual({ x: 50, y: 75 });
  });

  it("does NOT add a position when parent is in flow mode", () => {
    const cfg = makeConfigWith({
      id: "sec",
      type: "Section",
      props: {},
      style: {},
      children: [],
    });
    const newChild: ComponentNode = { id: "b", type: "Heading", props: {}, style: {} };
    const next = applyAddComponentChild(cfg, "sec", 0, newChild);
    expect(findNodeById(next.pages[0].rootComponent, "b")?.position).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm test lib/editor-state/__tests__/actions.test.ts
```
Expected: 4 new tests fail (positions not populated).

- [ ] **Step 4: Implement the helper and patch `applyAddComponentChild`**

In `apps/web/lib/editor-state/actions.ts`, near the top of the file with other helpers, add:

```ts
function isFreePlacement(node: ComponentNode): boolean {
  if (node.type !== "Section") return false;
  const props = node.props as { freePlacement?: unknown; fitToContents?: unknown };
  return props.freePlacement === true || props.fitToContents === true;
}

function defaultFreePlacementPositionFor(parent: ComponentNode): { x: number; y: number } {
  let lowest = 0;
  for (const c of parent.children ?? []) {
    const y = c.position?.y ?? 0;
    const hStr = c.style?.height;
    const h = typeof hStr === "string" ? parseFloat(hStr) : 0;
    const bottom = y + (Number.isFinite(h) ? h : 0);
    if (bottom > lowest) lowest = bottom;
  }
  return { x: 0, y: lowest > 0 ? Math.round(lowest) + 16 : 0 };
}
```

In `applyAddComponentChild`, after the parent is resolved and before the child is spliced in, patch the child:

```ts
const childToInsert: ComponentNode =
  isFreePlacement(parent) && node.position === undefined
    ? { ...node, position: defaultFreePlacementPositionFor(parent) }
    : node;
```

Use `childToInsert` in the rest of the function (replace `node` references after that point).

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/web && pnpm test lib/editor-state/__tests__/actions.test.ts
```
Expected: 4 new tests pass; existing tests still green (the flow-mode path is unchanged).

- [ ] **Step 6: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check lib/editor-state
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/editor-state
git commit -m "feat(editor): default position for new children inserted into freePlacement Sections"
```

---

### Task 2.2: AI Edit `addComponent` op — verify path coverage

**Files:**
- Read: `apps/web/lib/site-config/ops.ts`
- Test: `apps/web/lib/site-config/__tests__/ops.test.ts` (append)

The AI Edit operation `addComponent` runs through `applyCommitAiEditOperations` → eventually calls into the same node-mutation primitives. We need to confirm AI inserts also pick up the default position.

- [ ] **Step 1: Trace the AI op path**

```bash
cd apps/web && rg -n "case \"addComponent\":|applyAddComponentOp|applyAddComponent\\b" lib/site-config/ops.ts
```
Read the implementation. If it calls a shared helper that ends up at the same node insertion as `applyAddComponentChild`, refactor so both paths use the new helper. If they're separate code paths, apply the same `isFreePlacement(parent) && component.position === undefined ? { ...component, position: defaultFreePlacementPositionFor(parent) } : component` patch in the op handler.

- [ ] **Step 2: Write the failing test**

Append to `apps/web/lib/site-config/__tests__/ops.test.ts`:

```ts
describe("addComponent op — freePlacement default position", () => {
  it("AI insert into a freePlacement parent gets default position", () => {
    const config = makeBasicConfigWithSection({ freePlacement: true });
    const next = applyOperations(config, [
      {
        type: "addComponent",
        parentId: "sec",
        index: 0,
        component: { id: "newChild", type: "Heading", props: {}, style: {} },
      },
    ]);
    const inserted = findNodeAcrossPages(next, "newChild");
    expect(inserted?.position).toEqual({ x: 0, y: 0 });
  });
});
```

(Adjust `makeBasicConfigWithSection` to a helper that already exists in the file or write a tiny one inline.)

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm test lib/site-config/__tests__/ops.test.ts
```

- [ ] **Step 4: Patch the op handler** (or refactor to share `defaultFreePlacementPositionFor`).

The cleanest approach: export `defaultFreePlacementPositionFor` and `isFreePlacement` from `lib/editor-state/actions.ts` (or move them to `lib/site-config/free-placement.ts` if that feels cleaner — they're pure functions on a `ComponentNode`), and call them from the AI op handler in `ops.ts` before splicing the new component in.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/web && pnpm test lib/site-config/__tests__/ops.test.ts
```

- [ ] **Step 6: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check lib/site-config lib/editor-state
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/site-config apps/web/lib/editor-state
git commit -m "feat(ops): AI addComponent op picks up freePlacement default position"
```

---

### Task 2.3: Phase 2 smoke test in dev server

- [ ] **Step 1: With dev server running, on a page-root Section that has freePlacement=ON and existing children:**
  1. Use the AI Edit chat: "Add a new Section below the last one"
  2. Verify the new section appears below the last existing child (y ≈ lowest+16) and existing children did not move.
  3. From the palette, drag a new component onto the canvas. Verify it lands at (0, lowest+16) and existing children are unaffected.

- [ ] **Step 2: No commit.**

---

## Phase 3 — Drag-to-reposition

Pointer-drag a child's body to update `position.{x,y}`. dnd-kit sortable behavior is bypassed for free-placement children. `BetweenDropZone` is hidden inside free-placement Sections.

### Task 3.1: Surface `parentIsFreePlacement` to children at render time

**Files:**
- Modify: `apps/web/components/renderer/ComponentRenderer.tsx`
- Modify: `apps/web/components/site-components/Section/index.tsx`

The free-placement-aware drag handler and the dnd-kit bypass both need to know "is my parent a Section with `freePlacement` on?" The cheapest signal is a `data-parent-free-placement` attribute on the absolute-positioning wrapper Section already emits in Task 1.4.

- [ ] **Step 1: Already partially in place**

In Task 1.4 we added `data-free-placement-child={childNode?.id ?? ""}` on each child wrapper. Confirm.

- [ ] **Step 2: Add `data-parent-free-placement="true"` to the same wrapper**

In `apps/web/components/site-components/Section/index.tsx` inside the `freePlacement` branch's `childArray.map(...)`:

```tsx
<div
  key={idx}
  data-free-placement-child={childNode?.id ?? ""}
  data-parent-free-placement="true"
  data-parent-section-id={node.id}
  ...
>
```

(`data-parent-section-id` lets the drag handler write back to a known parent.)

- [ ] **Step 3: Targeted gates + commit**

```bash
cd apps/web && pnpm biome check components/site-components/Section
git add apps/web/components/site-components/Section
git commit -m "feat(section): expose parent-free-placement marker on child wrappers"
```

---

### Task 3.2: Free-placement pointer-drag handler

**Files:**
- Create: `apps/web/components/editor/canvas/dnd/FreePlacementDragHandler.tsx`
- Modify: `apps/web/components/renderer/EditModeWrapper.tsx`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/FreePlacementDragHandler.test.tsx`

- [ ] **Step 1: Read `EditModeWrapper.tsx` to understand its prop shape and where it attaches event handlers**

```bash
cd apps/web && cat components/renderer/EditModeWrapper.tsx
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/components/editor/canvas/dnd/__tests__/FreePlacementDragHandler.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEditorStore } from "@/lib/editor-state";
import { FreePlacementDragHandler } from "../FreePlacementDragHandler";

describe("<FreePlacementDragHandler>", () => {
  it("updates position via setComponentPosition during pointer drag", () => {
    const setPos = vi.fn();
    useEditorStore.setState({
      setComponentPosition: setPos,
      // (set up minimal store...)
    } as never);
    const { getByTestId } = render(
      <FreePlacementDragHandler nodeId="h" startPosition={{ x: 0, y: 0 }}>
        <div data-testid="body">child</div>
      </FreePlacementDragHandler>,
    );
    const body = getByTestId("body");
    body.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 100, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 116, clientY: 124 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 116, clientY: 124 }));
    expect(setPos).toHaveBeenCalledWith("h", { x: 16, y: 24 });
  });

  // Add: snap test (default snaps to 8), shift-disables-snap test, escape-cancels test.
});
```

(These tests are sketches; flesh them out in line with how `ResizeHandles.test.tsx` exercises pointer events. Mirror that file's style closely.)

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/FreePlacementDragHandler.test.tsx
```

- [ ] **Step 4: Implement `FreePlacementDragHandler`**

Create `apps/web/components/editor/canvas/dnd/FreePlacementDragHandler.tsx`:

```tsx
"use client";

import { useEditorStore } from "@/lib/editor-state";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from "react";

const PX_SNAP = 8;

function snap(v: number, snapOn: boolean): number {
  return snapOn ? Math.round(v / PX_SNAP) * PX_SNAP : Math.round(v);
}

export type FreePlacementDragHandlerProps = {
  nodeId: string;
  startPosition: { x: number; y: number };
  children: ReactNode;
};

export function FreePlacementDragHandler({
  nodeId,
  startPosition,
  children,
}: FreePlacementDragHandlerProps) {
  const setComponentPosition = useEditorStore((s) => s.setComponentPosition);
  const dragRef = useRef<{ startClientX: number; startClientY: number; sx: number; sy: number } | null>(
    null,
  );
  const rafRef = useRef<number | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    // Only left-button. Don't capture clicks on inputs/buttons inside the body
    // (so resize handles, contenteditable etc. keep working).
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-resize-axis], [contenteditable=true], button, input"))
      return;
    e.stopPropagation();
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      sx: startPosition.x,
      sy: startPosition.y,
    };

    function compute(clientX: number, clientY: number, shift: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const x = snap(drag.sx + (clientX - drag.startClientX), !shift);
      const y = snap(drag.sy + (clientY - drag.startClientY), !shift);
      setComponentPosition(nodeId, { x, y });
    }

    function onMove(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shift = "shiftKey" in ev ? ev.shiftKey : false;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          compute(ev.clientX, ev.clientY, shift);
        });
      }
    }

    function onUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shift = "shiftKey" in ev ? ev.shiftKey : false;
      compute(ev.clientX, ev.clientY, shift);
      cleanup();
    }

    function onKey(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        // Restore start.
        setComponentPosition(nodeId, { x: startPosition.x, y: startPosition.y });
        cleanup();
      }
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", onMove as EventListener);
      window.removeEventListener("pointerup", onUp as EventListener);
      window.removeEventListener("keydown", onKey);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove as EventListener);
    window.addEventListener("pointerup", onUp as EventListener);
    window.addEventListener("keydown", onKey);
  }

  return (
    <div onPointerDown={onPointerDown} style={{ touchAction: "none", height: "100%" }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Wire it into `EditModeWrapper`**

In `apps/web/components/renderer/EditModeWrapper.tsx`, conditionally wrap the children with `FreePlacementDragHandler` when the wrapper sits inside a `freePlacement` Section. Read the parent flag the same way the StyleTab does (a hook that walks up via `findComponentParentId`). Wire `startPosition={node.position ?? { x: 0, y: 0 }}` based on the current node.

(If `EditModeWrapper` doesn't currently know its `node`, thread the position+`parentIsFreePlacement` flag in via props from `ComponentRenderer.tsx`.)

- [ ] **Step 6: Run test to verify it passes**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/FreePlacementDragHandler.test.tsx
```

- [ ] **Step 7: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/editor/canvas/dnd components/renderer
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/editor/canvas/dnd apps/web/components/renderer
git commit -m "feat(canvas): drag-to-reposition for free-placement Section children"
```

---

### Task 3.3: Bypass dnd-kit sortable + hide BetweenDropZone in free-placement Sections

**Files:**
- Modify: `apps/web/components/renderer/ComponentRenderer.tsx`
- Modify: `apps/web/components/editor/canvas/dnd/SortableNodeContext.tsx` (only if it has explicit per-parent gating)
- Test: existing dnd tests should still pass; add one new case

- [ ] **Step 1: In `ComponentRenderer.tsx`, gate the `BetweenDropZone` interleaving on the parent NOT being free-placement**

Locate the existing block (~line 254):

```ts
if (!showEmpty && mode === "edit" && policy === "many") {
```

Change to:

```ts
const parentIsFreePlacement =
  node.type === "Section" &&
  ((node.props as { freePlacement?: unknown }).freePlacement === true ||
    (node.props as { fitToContents?: unknown }).fitToContents === true);

if (!showEmpty && mode === "edit" && policy === "many" && !parentIsFreePlacement) {
  // ...existing interleave logic
}
```

This hides the per-gap `BetweenDropZone` indicators inside free-placement Sections.

- [ ] **Step 2: For dnd-kit sortable bypass**

The sortable context is set up in `SortableNodeContext.tsx`. Read it. If it's a per-parent context provider, gate it on `parentIsFreePlacement === false`. If it's per-node, gate the `useSortable` hook. The simplest fix is usually: if the parent is free-placement, the children are wrapped by `FreePlacementDragHandler` (Task 3.2) and that pointer-down handler calls `e.stopPropagation()`, preventing dnd-kit from claiming the drag. Verify this is enough; if dnd-kit still steals events, add an explicit early-return at the sortable hook site.

- [ ] **Step 3: Add a test in `Section.test.tsx`**

Append:

```ts
it("does not interleave BetweenDropZone wrappers inside a freePlacement Section", () => {
  // Render a freePlacement Section through ComponentRenderer in edit mode and
  // assert no element with [data-between-drop-zone] exists inside the section.
  // (Use the existing test scaffold pattern from ComponentRenderer's tests.)
});
```

(Sketch above — flesh out using the existing renderer test patterns.)

- [ ] **Step 4: Run targeted tests**

```bash
cd apps/web && pnpm test components/renderer components/editor/canvas/dnd components/site-components/Section
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/renderer apps/web/components/editor/canvas/dnd apps/web/components/site-components/Section
git commit -m "feat(canvas): bypass dnd-kit sortable + drop zones in freePlacement Sections"
```

---

### Task 3.4: Phase 3 smoke test

- [ ] **Step 1: With dev server running, on a freePlacement Section with 3 children:**
  1. Click and drag the body of one child. Verify it moves with the cursor and snaps to 8 px.
  2. Hold Shift while dragging — verify it moves at 1 px resolution.
  3. Press Esc mid-drag — verify it returns to the starting position.
  4. Verify the other two children do NOT move at any point.
  5. Verify the resize handles still work on the dragged child after release.
  6. Verify clicking inside a NavBar's link (a child input or button) does NOT initiate a drag.

- [ ] **Step 2: No commit.**

---

## Phase 4 — Resize-handle rewire (left/top edges write position instead of margin)

When the parent is free-placement, dragging the left edge writes `position.x` (and decreases width by the delta); dragging the top edge writes `position.y` (and decreases height by the delta). Right and bottom edges and the corner are unchanged because they already write `style.width`/`style.height` and absolute children honor those.

### Task 4.1: `LeftEdgeHandle` — write position.x when parent is freePlacement

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`
- Modify: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `ResizeHandles.test.tsx`:

```ts
describe("LeftEdgeHandle — freePlacement parent", () => {
  it("writes position.x and width when dragged inside a freePlacement Section", () => {
    // Set up store with parent freePlacement=true and a child at (100, 100, w=200, h=50).
    // Spy on setComponentPosition and setComponentDimension.
    // Simulate pointerdown on the left handle, pointermove dx=-50, pointerup.
    // Expect setComponentPosition called with { x: 50, y: 100 } and width="250px".
    // Expect NO call to setComponentStyle that touches margin.
  });

  it("flow-mode parent still writes margin (legacy behavior)", () => {
    // Existing behavior; sanity-check it still works.
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
```

- [ ] **Step 3: Add a parent-aware branch in `LeftEdgeHandle`**

In `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx` `LeftEdgeHandle` function, replace `computeAndWrite`:

```ts
function computeAndWrite(clientX: number, shiftHeld: boolean): void {
  const drag = dragRef.current;
  if (!drag) return;
  const cursorDx = clientX - drag.startClientX;
  const newWidth = snapWidth(drag.startWidth - cursorDx, !shiftHeld);
  const widthDelta = newWidth - drag.startWidth;

  if (drag.parentIsFreePlacement) {
    const newX = drag.startX - widthDelta;
    setComponentPosition(node.id, { x: newX, y: drag.startY });
    setComponentDimension(node.id, "width", `${newWidth}px`);
    return;
  }

  // Legacy flow-mode path (margin-anchored).
  const newMarginLeft = drag.startMarginLeft - widthDelta;
  const newStyle: StyleConfig = {
    ...drag.startStyle,
    width: `${newWidth}px`,
    margin: { ...(drag.startStyle.margin ?? {}), left: newMarginLeft },
  };
  setComponentStyle(node.id, newStyle);
}
```

- [ ] **Step 4: At pointer-down, capture parent flag and current position**

In the `handlePointerDown` of `LeftEdgeHandle`:

```ts
const page = selectCurrentPage(useEditorStore.getState());
const parentId = page ? findComponentParentId(page.rootComponent, node.id) : null;
const parent = parentId && page ? findComponentById(page.rootComponent, parentId) : null;
const parentIsFreePlacement =
  parent?.type === "Section" &&
  ((parent.props as { freePlacement?: unknown }).freePlacement === true ||
    (parent.props as { fitToContents?: unknown }).fitToContents === true);

dragRef.current = {
  startClientX: e.clientX,
  startWidth: rect.width,
  startMarginLeft: node.style.margin?.left ?? 0,
  startStyle: node.style,
  startX: node.position?.x ?? 0,
  startY: node.position?.y ?? 0,
  parentIsFreePlacement: parentIsFreePlacement === true,
};
```

(Add the new fields to the `dragRef` type.)

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
```

- [ ] **Step 6: Targeted gates**

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/editor/canvas/dnd
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/editor/canvas/dnd
git commit -m "feat(resize): LeftEdgeHandle writes position.x when parent is freePlacement"
```

---

### Task 4.2: `TopEdgeHandle` — write position.y when parent is freePlacement

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`
- Modify: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `ResizeHandles.test.tsx`:

```ts
describe("TopEdgeHandle — freePlacement parent", () => {
  it("writes position.y and height when dragged inside a freePlacement Section", () => {
    // Set up store with parent freePlacement=true and a child at
    // position={x:100, y:100}, style.height="200px". Spy on
    // setComponentPosition and setComponentDimension.
    // Simulate pointerdown on the top handle, pointermove dy=-50, pointerup
    // (drag up by 50).
    // Expect setComponentPosition called with { x: 100, y: 50 } and
    // setComponentDimension called with id, "height", "250px".
    // Expect NO call to setComponentStyle that touches margin.
  });

  it("flow-mode parent still writes margin (legacy behavior)", () => {
    // Sanity-check that the legacy margin-anchored behavior still works when
    // the parent is in flow mode.
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
```

- [ ] **Step 3: Patch `TopEdgeHandle.computeAndWrite`**

In `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`, the `TopEdgeHandle` function. Replace `computeAndWrite`:

```ts
function computeAndWrite(clientY: number, shiftHeld: boolean): void {
  const drag = dragRef.current;
  if (!drag) return;
  const cursorDy = clientY - drag.startClientY;
  const newHeight = snapHeight(drag.startHeight - cursorDy, false, !shiftHeld);
  const heightDelta = newHeight - drag.startHeight;

  if (drag.parentIsFreePlacement) {
    const newY = drag.startY - heightDelta;
    setComponentPosition(node.id, { x: drag.startX, y: newY });
    setComponentDimension(node.id, "height", `${newHeight}px`);
    return;
  }

  // Legacy flow-mode path (margin-anchored).
  const newMarginTop = drag.startMarginTop - heightDelta;
  const newStyle: StyleConfig = {
    ...drag.startStyle,
    height: `${newHeight}px`,
    margin: { ...(drag.startStyle.margin ?? {}), top: newMarginTop },
  };
  setComponentStyle(node.id, newStyle);
}
```

- [ ] **Step 4: Capture parent flag at pointer-down**

In `TopEdgeHandle.handlePointerDown`, after the existing `if (isSpacer) return;` check, replace the `dragRef.current = { ... }` assignment with:

```ts
const page = selectCurrentPage(useEditorStore.getState());
const parentId = page ? findComponentParentId(page.rootComponent, node.id) : null;
const parent = parentId && page ? findComponentById(page.rootComponent, parentId) : null;
const parentIsFreePlacement =
  parent?.type === "Section" &&
  ((parent.props as { freePlacement?: unknown }).freePlacement === true ||
    (parent.props as { fitToContents?: unknown }).fitToContents === true);

dragRef.current = {
  startClientY: e.clientY,
  startHeight: rect.height,
  startMarginTop: node.style.margin?.top ?? 0,
  startStyle: node.style,
  startX: node.position?.x ?? 0,
  startY: node.position?.y ?? 0,
  parentIsFreePlacement: parentIsFreePlacement === true,
};
```

Add the new fields to the local `dragRef` type declaration at the top of the function.

Also import `setComponentPosition` and `setComponentDimension` from the store at the top of the function:

```ts
const setComponentPosition = useEditorStore((s) => s.setComponentPosition);
const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
```

(Spacer is unchanged — `if (isSpacer) return null;` at the bottom of the handle still applies.)

- [ ] **Step 5: Run to verify pass + targeted gates**

```bash
cd apps/web && pnpm test components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
cd apps/web && pnpm typecheck
cd apps/web && pnpm biome check components/editor/canvas/dnd
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/editor/canvas/dnd
git commit -m "feat(resize): TopEdgeHandle writes position.y when parent is freePlacement"
```

---

### Task 4.3: Phase 4 smoke test

- [ ] **Step 1: With dev server running, on a freePlacement child:**
  1. Drag the right edge → width grows; child stays anchored at its left x.
  2. Drag the bottom edge → height grows; child stays anchored at its top y.
  3. Drag the left edge → width shrinks; the right edge stays put visually (because position.x increases by the same amount). No margin written.
  4. Drag the top edge → height shrinks; bottom edge stays put. No margin written.
  5. The same handles on a flow-mode child still work the legacy way (write margin to anchor).

- [ ] **Step 2: No commit (smoke test only).**

---

## Final phase — full quality gates and PR-readiness

### Task 5.1: Run the full §15.7 quality gate

- [ ] **Step 1: Full unit suite**

```bash
cd apps/web && pnpm test
```
Expected: all passing.

- [ ] **Step 2: Production build**

```bash
cd apps/web && pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Biome (whole repo)**

From `apps/web`:

```bash
pnpm biome check .
```

- [ ] **Step 4: Manual smoke** — repeat the Phase 1 / Phase 2 / Phase 3 / Phase 4 smoke tests on a fresh `pnpm dev` run, end-to-end.

- [ ] **Step 5: If any gate fails, file a fix as a follow-up sub-task. Do not declare the feature done until all 4 pass.**

### Task 5.2: Update SPEC.md and DECISIONS.md

- [ ] **Step 1:** Confirm `apps/web/components/site-components/Section/SPEC.md` reflects the renamed prop and final semantics (already updated in Task 1.2; verify).

- [ ] **Step 2:** Append an entry to `DECISIONS.md` recording the Approach-B → Option-2 pivot (date 2026-04-30, what was changed, the user's "okay do the option 2" approval verbatim).

- [ ] **Step 3: Commit**

```bash
git add DECISIONS.md apps/web/components/site-components/Section/SPEC.md
git commit -m "docs: log Section freePlacement pivot in DECISIONS.md"
```

---

## Out of scope (track as follow-ups if interest)

- Site-wide free-placement default (today is per-Section opt-in).
- Recursive free-placement (a free-placement child whose own children also need free placement — today the toggle is per-Section and doesn't propagate).
- Mobile/responsive coordinate variants — single (x, y) per child today.
- Z-index controls beyond `children[]` order.
- Drag-to-reposition from the palette directly into a (x, y) point — currently palette drops use the AI-insert default position.
- Snap-to-other-children alignment guides during drag.
