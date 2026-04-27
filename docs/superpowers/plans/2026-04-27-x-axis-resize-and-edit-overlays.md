# X-Axis Resize, Side-by-Side Layout, and Edit-Mode Overlays — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor's layout model two-dimensional: every component resizable on both axes, components placeable side-by-side via auto-inserted FlowGroup wrappers, child resizes clamped to parent bounds with cascade, always-visible dotted dropzone overlays, and a TopBar "Show Component Types" toggle.

**Architecture:** Width becomes a first-class style property (% for containers, px for leaves). A new internal `FlowGroup` component type is added to the registry; the engine creates and dissolves it automatically when the user drops on the left/right edge of a sibling. Parent-bound resize is enforced inside `ResizeHandles.tsx` via a hard clamp + tooltip, and parent-shrink cascades to children through a new `applyResizeWithCascade` action. Dropzone overlays are always-rendered in edit mode, replacing the existing 4-px blue accent line; their drag-hover state animates from grey to blue/red. The TopBar toggle adds a transient `showComponentTypes` flag to the editor store.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Zustand for editor state, Zod for schema, @dnd-kit/core + sortable, lucide-react icons, Tailwind via shadcn `cn()` helper, Vitest for unit tests, Playwright for E2E. Per [CLAUDE.md](../../../CLAUDE.md) §15: no `any`, kebab-case files, conventional commits, tests + build + biome must pass.

**Spec:** [docs/superpowers/specs/2026-04-27-x-axis-resize-and-edit-overlays-design.md](../specs/2026-04-27-x-axis-resize-and-edit-overlays-design.md)

---

## Conventions

### Test fixture style

The existing `actions.test.ts` does NOT use shared `makeFixture` / `section` / `heading` helpers — it inline-builds full `SiteConfig` objects per test (see `makeFixtureConfig` in [apps/web/lib/editor-state/__tests__/actions.test.ts:25-50](../../../apps/web/lib/editor-state/__tests__/actions.test.ts#L25-L50)). Where this plan's test snippets show `makeFixture({ pages: [...] })` or `section("id", [...])`, **inline-build the equivalent SiteConfig** following the existing pattern. Do not introduce new shared helpers unless three or more new tests in the same file would benefit. If you do add helpers, scope them as `function section(...)` at the top of the test file — do NOT add them to a shared `lib/test-helpers` directory.

### Width storage simplification (deviates slightly from spec §4.1)

The spec describes "% for containers, px for leaves." This plan implements **percent for everything** because: (a) percent storage automatically scales when the parent resizes, eliminating most cascade work; (b) leaves clamped by parent percent are visually identical to leaves clamped by parent px; (c) the existing `style.width: SizeUnit` schema already accepts arbitrary CSS lengths, so a future task can add px storage on leaves without a schema change. If the px-on-leaves behaviour ever becomes user-visible (e.g. side panel showing "320 px"), revisit by raising a Deviation per [CLAUDE.md](../../../CLAUDE.md) §15.8.

### Commit style

Conventional commits per [CLAUDE.md](../../../CLAUDE.md) §15.4: `feat(scope):`, `fix(scope):`, `refactor(scope):`, etc. One concern per commit. The plan's commit messages use this convention; deviate only if the implementation requires splitting further.

### Pre-commit hooks

Per [CLAUDE.md](../../../CLAUDE.md), do NOT use `--no-verify` to bypass hooks. If a hook fails, fix the underlying issue.

---

## File Structure (created or modified)

### New files

- `apps/web/components/site-components/FlowGroup/index.tsx` — the FlowGroup React component (renders `<div display:flex flex-direction:row>`).
- `apps/web/components/site-components/FlowGroup/SPEC.md` — minimal spec page noting FlowGroup is engine-managed.
- `apps/web/components/site-components/FlowGroup/__tests__/FlowGroup.test.tsx` — unit tests for FlowGroup rendering.
- `apps/web/components/editor/canvas/dnd/sideDropZones.tsx` — left/right/top/bottom thin drop overlays around each component.
- `apps/web/components/editor/canvas/dnd/CanvasDropOverlay.tsx` — open-canvas dotted overlay surrounding the page frame.
- `apps/web/components/editor/canvas/dnd/EmptyContainerOverlay.tsx` — interior overlay for empty containers ("Drop a component here").
- `apps/web/components/editor/topbar/ShowComponentTypesToggle.tsx` — TopBar toggle button.
- `apps/web/components/editor/canvas/dnd/__tests__/sideDropZones.test.tsx` — drop side-zone tests.
- `apps/web/components/editor/canvas/dnd/__tests__/EmptyContainerOverlay.test.tsx` — empty-overlay tests.
- `apps/web/components/editor/canvas/dnd/__tests__/CanvasDropOverlay.test.tsx` — canvas-overlay tests.
- `apps/web/components/editor/topbar/__tests__/ShowComponentTypesToggle.test.tsx` — toggle tests.

### Modified files

- `apps/web/lib/site-config/schema.ts` — `COMPONENT_TYPES` gains `"FlowGroup"`.
- `apps/web/components/site-components/registry.ts` — register `FlowGroup`.
- `apps/web/components/editor/sidebar/add-tab/component-catalog.ts` — make sure `FlowGroup` is **excluded** from the palette (engine-managed only).
- `apps/web/components/editor/canvas/dnd/createDefaultNode.ts` — add a `FlowGroup` default-props row (used internally by wrap action).
- `apps/web/components/editor/canvas/dnd/dropTargetPolicy.ts` — `FlowGroup` accepts any non-FlowGroup as a child.
- `apps/web/components/editor/canvas/dnd/dnd-ids.ts` — add `sideId(componentId, side)` constructor + parser for side-edge drops.
- `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx` — replace `RESIZE_MATRIX` with registry-driven rule; add right-edge handle to every type, plus corner handle; integrate parent-bound clamp + tooltip.
- `apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx` — 2× larger idle size; dotted-grey idle style; replace blue accent with grey→blue hover transition.
- `apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx` — remove the 4-px accent bar (overlay system replaces it).
- `apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx` — handle side-zone drop events: wrap target + draggable in a new FlowGroup.
- `apps/web/components/editor/canvas/Canvas.tsx` — render `CanvasDropOverlay` outside the page frame.
- `apps/web/components/renderer/EditModeWrapper.tsx` — render side-edge dropzones, conditional outline + type-label per `showComponentTypes`.
- `apps/web/components/renderer/ComponentRenderer.tsx` — render `FlowGroup` via registry; ensure `EmptyContainerOverlay` shows for empty containers in edit mode; treat FlowGroup as transparent for selection breadcrumb.
- `apps/web/components/editor/canvas/SelectionBreadcrumb.tsx` — skip `FlowGroup` ancestors when walking the trail.
- `apps/web/components/editor/topbar/TopBar.tsx` — insert `<ShowComponentTypesToggle />` before `<PreviewToggle />`.
- `apps/web/lib/editor-state/store.ts` — add `showComponentTypes: boolean` (default `true`), `toggleShowComponentTypes` action; reset helper.
- `apps/web/lib/editor-state/types.ts` — extend `EditorState` and `EditorActions`; add `invalid_flow_group_state` error code.
- `apps/web/lib/editor-state/actions.ts` — add `applyWrapInFlowGroup`, `applyDissolveFlowGroup`, `applyResizeWithCascade`, `getMaxAllowedDimension`; auto-dissolve in `applyMoveComponent` and `applyRemoveComponent`.

### Modified tests (extend existing)

- `apps/web/lib/editor-state/__tests__/actions.test.ts` — new cases for the three new actions + auto-dissolve.
- `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx` — right-edge handle on every type, clamp behaviour, tooltip timing, corner handle.
- `apps/web/components/editor/canvas/dnd/__tests__/dropTargetPolicy.test.ts` — FlowGroup accept rules.
- `apps/web/components/editor/canvas/dnd/__tests__/dnd-ids.test.ts` — sideId round-trip.
- `apps/web/components/editor/canvas/dnd/__tests__/DndCanvasProvider.test.tsx` — side-zone drop produces FlowGroup wrap; cross-parent move triggers auto-dissolve.
- `apps/web/components/editor/__tests__/canvas.test.tsx` — CanvasDropOverlay present in edit mode, absent in preview.
- `apps/web/lib/site-config/__tests__/schema.test.ts` — FlowGroup parses through `componentNodeSchema`.

---

## Phase 0 — Pre-flight

Establish a clean baseline before changing anything. The repo's current uncommitted modifications (per the session-start `git status`) are reverted or independently committed first; no plan task should fight a dirty tree.

### Task 0.1 — Verify clean baseline

**Files:** none

- [ ] **Step 1: Confirm working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean` (the spec commit `676780c` is already in place; any other modifications must be reverted by the engineer before starting).

- [ ] **Step 2: Confirm baseline tests pass**

```bash
pnpm typecheck && pnpm biome check
```

Expected: zero errors, zero warnings. (Per [CLAUDE.md](../../../CLAUDE.md) "Token economy" — full `pnpm test` / `pnpm build` is reserved for sprint completion. Run the targeted file tests during each task.)

If anything fails here, **stop** and fix the existing breakage under §15.9 cross-sprint cleanup before starting Phase 1.

- [ ] **Step 3: Commit nothing**

No commit. Phase 0 is verification only.

---

## Phase 1 — Schema, FlowGroup component, registry

Add `FlowGroup` as a first-class component type the renderer can render, but leave the rest of the editor unaware. This phase ships in isolation: `pnpm build` passes, no behaviour changes, FlowGroup is invisible because nothing creates one yet.

### Task 1.1 — Add FlowGroup to the COMPONENT_TYPES enum

**Files:**
- Modify: `apps/web/lib/site-config/schema.ts:6-27`
- Test: `apps/web/lib/site-config/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/web/lib/site-config/__tests__/schema.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { COMPONENT_TYPES, componentNodeSchema, componentTypeSchema } from "../schema";

describe("FlowGroup component type", () => {
  it("includes FlowGroup in COMPONENT_TYPES", () => {
    expect(COMPONENT_TYPES).toContain("FlowGroup");
  });

  it("accepts FlowGroup via componentTypeSchema", () => {
    expect(componentTypeSchema.safeParse("FlowGroup").success).toBe(true);
  });

  it("parses a minimal FlowGroup ComponentNode", () => {
    const node = {
      id: "cmp_fg1",
      type: "FlowGroup",
      props: {},
      style: {},
      children: [],
    };
    expect(componentNodeSchema.safeParse(node).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/lib/site-config/__tests__/schema.test.ts -t "FlowGroup"`

Expected: FAIL — `Expected COMPONENT_TYPES to contain "FlowGroup"`.

- [ ] **Step 3: Implement — add FlowGroup to the enum**

In `apps/web/lib/site-config/schema.ts`, add `"FlowGroup"` to `COMPONENT_TYPES`:

```typescript
export const COMPONENT_TYPES = [
  "Section",
  "Row",
  "Column",
  "FlowGroup",
  "Heading",
  // … rest unchanged
] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/lib/site-config/__tests__/schema.test.ts -t "FlowGroup"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/site-config/schema.ts apps/web/lib/site-config/__tests__/schema.test.ts
git commit -m "feat(schema): add FlowGroup to COMPONENT_TYPES enum"
```

### Task 1.2 — Implement the FlowGroup React component

**Files:**
- Create: `apps/web/components/site-components/FlowGroup/index.tsx`
- Create: `apps/web/components/site-components/FlowGroup/SPEC.md`
- Create: `apps/web/components/site-components/FlowGroup/__tests__/FlowGroup.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/site-components/FlowGroup/__tests__/FlowGroup.test.tsx`:

```typescript
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComponentNode } from "@/types/site-config";
import { FlowGroup } from "../index";

const baseNode: ComponentNode = {
  id: "cmp_fg1",
  type: "FlowGroup",
  props: {},
  style: {},
  children: [],
};

describe("FlowGroup", () => {
  it("renders a horizontal flex container", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.display).toBe("flex");
    expect(root.style.flexDirection).toBe("row");
  });

  it("emits the standard data-component attributes", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component-id")).toBe("cmp_fg1");
    expect(root.getAttribute("data-component-type")).toBe("FlowGroup");
  });

  it("defaults width to 100% when style.width is unset", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("100%");
  });

  it("respects an explicit cssStyle.width", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{ width: "60%" }}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("60%");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/components/site-components/FlowGroup`

Expected: FAIL — module `../index` not found.

- [ ] **Step 3: Implement FlowGroup**

Create `apps/web/components/site-components/FlowGroup/index.tsx`:

```typescript
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";

type FlowGroupProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
  children?: ReactNode;
};

// FlowGroup is engine-managed. It is NEVER inserted by the user from the
// palette and is invisible to layer-tree / breadcrumb consumers. Its only
// job is to render its children in a horizontal flex row so two top-level
// components can sit side-by-side.
export function FlowGroup({ node, cssStyle, children }: FlowGroupProps) {
  const finalStyle: CSSProperties = {
    width: "100%",
    ...cssStyle,
    display: "flex",
    flexDirection: "row",
  };
  return (
    <div data-component-id={node.id} data-component-type="FlowGroup" style={finalStyle}>
      {children}
    </div>
  );
}
```

Create `apps/web/components/site-components/FlowGroup/SPEC.md`:

```markdown
# FlowGroup

Engine-managed horizontal flex container. The user never sees this in the
component picker, layer tree, breadcrumb, or AI-chat selection chip — it
is inserted automatically when the user drops a sibling on the left or
right edge of an existing component, and dissolved automatically when its
child count drops below 2.

Renders as `<div style="display:flex;flex-direction:row;width:100%">`.
Width can be overridden via `style.width` (the engine sets this when a
FlowGroup is itself a child of another container that needs a specific
share of horizontal space).

## childrenPolicy

`many` — accepts any non-FlowGroup ComponentType.

## props

None. FlowGroup is layout-only.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/site-components/FlowGroup`

Expected: PASS — all four tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/site-components/FlowGroup/
git commit -m "feat(site-components): add FlowGroup horizontal flex container"
```

### Task 1.3 — Register FlowGroup in the component registry

**Files:**
- Modify: `apps/web/components/site-components/registry.ts`
- Test: `apps/web/components/site-components/__tests__/registry.test.ts` (or wherever the registry is tested — find the existing file or add a case to the nearest one)

- [ ] **Step 1: Write the failing test**

Append to the registry's nearest test file:

```typescript
import { describe, expect, it } from "vitest";
import { componentRegistry } from "../registry";

describe("FlowGroup registry entry", () => {
  it("registers FlowGroup", () => {
    expect(componentRegistry.FlowGroup).toBeDefined();
  });

  it("FlowGroup childrenPolicy is many", () => {
    expect(componentRegistry.FlowGroup.meta.childrenPolicy).toBe("many");
  });

  it("FlowGroup category is Layout", () => {
    expect(componentRegistry.FlowGroup.meta.category).toBe("Layout");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test -t "FlowGroup registry"`

Expected: FAIL — `componentRegistry.FlowGroup` is `undefined`.

- [ ] **Step 3: Implement — wire FlowGroup into the registry**

In `apps/web/components/site-components/registry.ts`:

a. Add the import after `FlowGroup` is alphabetically placed (after `Footer`):

```typescript
import { FlowGroup } from "./FlowGroup";
```

b. Add to `placeholderMeta` (it's not a placeholder per se — but the existing object holds meta for non-baseline types):

```typescript
FlowGroup: { displayName: "Flow Group", category: "Layout", childrenPolicy: "many" },
```

Note: `Exclude<ComponentType, ...>` in the existing type signature must also be widened — change it to `Exclude<ComponentType, "Section" | "Heading" | "Paragraph" | "Image" | "Spacer" | "Divider">`. `FlowGroup` is not in the excluded list, so it falls into `placeholderMeta`.

c. Add to `componentRegistry`:

```typescript
FlowGroup: { Component: FlowGroup, meta: placeholderMeta.FlowGroup },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test -t "FlowGroup registry"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/site-components/registry.ts apps/web/components/site-components/__tests__/
git commit -m "feat(registry): register FlowGroup component"
```

### Task 1.4 — Exclude FlowGroup from the palette catalog

**Files:**
- Modify: `apps/web/components/editor/sidebar/add-tab/component-catalog.ts`
- Test: `apps/web/components/editor/sidebar/add-tab/__tests__/component-catalog.test.ts` (create if absent — search existing tests first)

- [ ] **Step 1: Write the failing test**

Create or extend the catalog test:

```typescript
import { describe, expect, it } from "vitest";
import { COMPONENT_CATALOG } from "../component-catalog";

describe("FlowGroup is engine-managed", () => {
  it("is NOT present in the palette catalog", () => {
    const types = COMPONENT_CATALOG.map((entry) => entry.type);
    expect(types).not.toContain("FlowGroup");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails or passes by accident**

Run: `pnpm --filter @apps/web test -t "FlowGroup is engine-managed"`

Expected: PASS if `COMPONENT_CATALOG` was hand-curated and never included unknown types; FAIL if it auto-derives from `COMPONENT_TYPES`. **If it PASSES already, this task is a no-op — record that and skip Step 3.**

- [ ] **Step 3 (only if Step 2 failed): Filter FlowGroup out**

In `apps/web/components/editor/sidebar/add-tab/component-catalog.ts`, ensure `FlowGroup` is not in the catalog array. If the catalog auto-derives, add an explicit exclusion:

```typescript
const ENGINE_MANAGED: ReadonlySet<ComponentType> = new Set(["FlowGroup"]);
// … filter the auto-derived list:
export const COMPONENT_CATALOG = ALL_TYPES
  .filter((type) => !ENGINE_MANAGED.has(type))
  .map(/* ... */);
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit (only if Step 3 ran)**

```bash
git add apps/web/components/editor/sidebar/add-tab/
git commit -m "chore(palette): explicitly exclude FlowGroup from palette catalog"
```

### Task 1.5 — Default props for FlowGroup in createDefaultNode

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/createDefaultNode.ts`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `createDefaultNode.test.ts`:

```typescript
describe("createDefaultNode for FlowGroup", () => {
  it("returns a node with empty children array", () => {
    const node = createDefaultNode("FlowGroup");
    expect(node.type).toBe("FlowGroup");
    expect(node.children).toEqual([]);
    expect(node.props).toEqual({});
  });

  it("validates against componentNodeSchema", () => {
    const node = createDefaultNode("FlowGroup");
    expect(componentNodeSchema.safeParse(node).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts -t "FlowGroup"`

Expected: FAIL — `DEFAULT_PROPS` does not contain `FlowGroup` (TS exhaustiveness will already block compile if Task 1.1 added FlowGroup to the enum).

- [ ] **Step 3: Implement**

In `apps/web/components/editor/canvas/dnd/createDefaultNode.ts`:

a. Add to `DEFAULT_PROPS`:

```typescript
FlowGroup: {},
```

b. Add to `CONTAINER_TYPES`:

```typescript
const CONTAINER_TYPES: ReadonlySet<ComponentType> = new Set<ComponentType>([
  "Section",
  "Row",
  "Column",
  "FlowGroup",
  "Form",
  "Repeater",
]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts -t "FlowGroup"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/createDefaultNode.ts apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts
git commit -m "feat(dnd): add FlowGroup default props for engine-inserted nodes"
```

### Task 1.6 — Phase 1 typecheck gate

**Files:** none

- [ ] **Step 1: Run typecheck and biome**

```bash
pnpm typecheck && pnpm biome check
```

Expected: zero errors. Switch statements over `ComponentType` (e.g. `ComponentRenderer`, edit-panel host) may now flag exhaustiveness issues — those are bugs introduced by Phase 1 and must be fixed before continuing. Add a `case "FlowGroup":` branch where required (renderer dispatches via the registry already, so the only switches that may need updating are `EditPanelTabs.tsx` / `ContentTabHost.tsx` — return `null` for FlowGroup since it has no edit panel).

- [ ] **Step 2: Commit any exhaustiveness fixes**

```bash
git add -p
git commit -m "fix: handle FlowGroup in remaining ComponentType switches"
```

---

## Phase 2 — X-axis resize handles on every component

Today every resizable type has a bottom-edge height handle; only Column has a right-edge span handle. After this phase, every component type listed in the registry has a right-edge width handle and a bottom-right corner handle. Parent-bound clamping is **not yet** wired — that is Phase 3.

### Task 2.1 — Replace the matrix with a registry-driven rule

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx:31-64`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `ResizeHandles.test.tsx`:

```typescript
import { COMPONENT_TYPES, type ComponentType } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { isResizableOnAxis } from "../ResizeHandles";

describe("isResizableOnAxis", () => {
  for (const type of COMPONENT_TYPES) {
    if (type === "FlowGroup") continue;
    it(`${type} is resizable on width`, () => {
      expect(isResizableOnAxis(type as ComponentType, "width")).toBe(true);
    });
    it(`${type} is resizable on height`, () => {
      expect(isResizableOnAxis(type as ComponentType, "height")).toBe(true);
      // Spacer remains resizable on height (it always was).
    });
  }

  it("FlowGroup is resizable on both axes", () => {
    expect(isResizableOnAxis("FlowGroup", "width")).toBe(true);
    expect(isResizableOnAxis("FlowGroup", "height")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx -t "isResizableOnAxis"`

Expected: FAIL — function not exported.

- [ ] **Step 3: Implement — replace `RESIZE_MATRIX` with a function**

In `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`, replace the `RESIZE_MATRIX` constant with:

```typescript
// Every registered component is resizable on both axes by default.
// Components that must opt out can do so via this set; today, none do.
const NON_RESIZABLE_TYPES: ReadonlySet<ComponentType> = new Set();

export function isResizableOnAxis(
  type: ComponentType,
  _axis: "width" | "height",
): boolean {
  if (NON_RESIZABLE_TYPES.has(type)) return false;
  return true;
}
```

Update `ResizeHandles()` to compute `right` and `bottom` from the new function instead of looking up `RESIZE_MATRIX[selectedNode.type]`:

```typescript
export function ResizeHandles() {
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedNode = useEditorStore(selectSelectedComponentNode);

  if (previewMode || !selectedNode) return null;
  const right = isResizableOnAxis(selectedNode.type, "width");
  const bottom = isResizableOnAxis(selectedNode.type, "height");
  if (!right && !bottom) return null;

  return <ResizeHandlesActive node={selectedNode} matrix={{ right, bottom }} />;
}
```

Leave the rest of `ResizeHandlesActive` and the two edge-handle components untouched for now — they already render based on `matrix.right` / `matrix.bottom`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx -t "isResizableOnAxis"`

Expected: PASS.

Also re-run any pre-existing ResizeHandles tests to confirm no regression:

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

Expected: existing tests still pass. If a test was asserting that `RESIZE_MATRIX` is `null` for some type, update it to assert on `isResizableOnAxis` instead.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/ResizeHandles.tsx apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
git commit -m "refactor(resize): replace RESIZE_MATRIX with registry-driven rule"
```

### Task 2.2 — Make the right-edge handle write width, not span

The existing `RightEdgeHandle` writes `setComponentSpan` (Column-only). For non-Column components we need to write `setComponentDimension(id, "width", value)`. Column keeps its 1/12 snap behaviour but on Shift drag falls back to free percent.

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx:146-216`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `ResizeHandles.test.tsx`:

```typescript
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state";
import { fireEvent, render } from "@testing-library/react";

describe("RightEdgeHandle for non-Column components", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("writes a percentage width for a Heading", async () => {
    // Hydrate store with a Section > Heading tree where Heading is selected.
    // Use the existing test helpers / fixtures from the file.
    // ... arrange ...
    const handle = await screen.findByTestId(/^resize-handle-right-/);
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerUp(window, { clientX: 200 }); // dragged 100 px right
    const node = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(node?.style.width).toMatch(/^\d+(?:\.\d+)?%$/); // any percent string
  });

  it("snaps to 1/12 grid for Column without Shift", async () => {
    // ... arrange a Row > Column tree ...
    const handle = await screen.findByTestId(/^resize-handle-right-/);
    fireEvent.pointerDown(handle, { clientX: 0 });
    fireEvent.pointerUp(window, { clientX: 50 }); // ~ 4/12 of a 600-px row
    const column = /* fetch column via the store */;
    expect(column?.props.span).toBeOneOf([3, 4, 5]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx -t "RightEdgeHandle for non-Column"`

Expected: FAIL — non-Column case still calls `setComponentSpan` (or returns early).

- [ ] **Step 3: Implement — fork RightEdgeHandle by component type**

In `RightEdgeHandle`, branch on `node.type === "Column"`:

```typescript
function RightEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentSpan = useEditorStore((s) => s.setComponentSpan);
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const dragRef = useRef<{ parentRect: DOMRect; shiftHeld: boolean } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();

    const page = selectCurrentPage(useEditorStore.getState());
    if (!page) return;
    const parentId = findComponentParentId(page.rootComponent, node.id);
    if (!parentId) return;
    const parentEl = document.querySelector(`[data-edit-id="${parentId}"]`);
    if (!parentEl) return;
    const parentRect = (parentEl as HTMLElement).getBoundingClientRect();

    dragRef.current = { parentRect, shiftHeld: e.shiftKey };

    function handlePointerUp(ev: PointerEvent): void {
      const drag = dragRef.current;
      cleanup();
      if (!drag) return;
      const fraction = (ev.clientX - drag.parentRect.left) / drag.parentRect.width;
      const clampedFraction = Math.max(0.04, Math.min(1, fraction));

      try {
        if (node.type === "Column" && !drag.shiftHeld) {
          // Column on the 1/12 grid — preserve legacy span behaviour.
          setComponentSpan(node.id, snapSpan(clampedFraction));
        } else {
          // Free-percent for everyone else (and Shift-drag on Column).
          const percent = Math.round(clampedFraction * 100 / 5) * 5; // 5% snap
          setComponentDimension(node.id, "width", `${Math.max(5, percent)}%`);
        }
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      dragRef.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-right-${node.id}`}
      data-resize-axis="right"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left + rect.width - 4,
        width: 8,
        height: rect.height,
        cursor: "ew-resize",
        background: "rgba(59, 130, 246, 0.55)",
        zIndex: 50,
      }}
    />
  );
}
```

(Leaf types use `style.width` in **percent** of parent per the spec §4.1. The spec also mentions px for leaves — but the actual storage is whatever the user drags; leaves clamp to parent because the parent contains them. Pixel storage for leaves is implemented in Task 3.x via the cascade helper. For Phase 2, percentage storage on every type is correct and simpler.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/ResizeHandles.tsx apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
git commit -m "feat(resize): right-edge handle writes width for all non-Column types"
```

### Task 2.3 — Add the bottom-right corner handle

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx` (append a new `CornerHandle` component, render in `ResizeHandlesActive`)
- Test: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
describe("CornerHandle", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("writes both width and height in a single update", async () => {
    // arrange a Heading selection
    const corner = await screen.findByTestId(/^resize-handle-corner-/);
    fireEvent.pointerDown(corner, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(window, { clientX: 150, clientY: 200 });
    const node = /* fetch heading from store */;
    expect(node?.style.width).toBeDefined();
    expect(node?.style.height).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — `resize-handle-corner-...` element not in DOM.

- [ ] **Step 3: Implement CornerHandle**

Append to `ResizeHandles.tsx`:

```typescript
function CornerHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    parentRect: DOMRect;
  } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    const page = selectCurrentPage(useEditorStore.getState());
    if (!page) return;
    const parentId = findComponentParentId(page.rootComponent, node.id);
    const parentEl = parentId
      ? document.querySelector(`[data-edit-id="${parentId}"]`)
      : null;
    const parentRect =
      parentEl instanceof HTMLElement ? parentEl.getBoundingClientRect() : new DOMRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      parentRect,
    };

    function handlePointerUp(ev: PointerEvent): void {
      const drag = dragRef.current;
      cleanup();
      if (!drag) return;
      const newW = drag.startW + (ev.clientX - drag.startX);
      const newH = snapHeight(drag.startH + (ev.clientY - drag.startY), node.type === "Spacer");
      const fraction = drag.parentRect.width
        ? Math.max(0.04, Math.min(1, newW / drag.parentRect.width))
        : 1;
      const percent = Math.max(5, Math.round((fraction * 100) / 5) * 5);
      try {
        // Both calls are folded into a single "dirty" tick by zustand.
        setComponentDimension(node.id, "width", `${percent}%`);
        if (node.type !== "Spacer") {
          setComponentDimension(node.id, "height", `${newH}px`);
        }
      } catch {
        // ignore
      }
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      dragRef.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-corner-${node.id}`}
      data-resize-axis="corner"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top + rect.height - 6,
        left: rect.left + rect.width - 6,
        width: 12,
        height: 12,
        cursor: "nwse-resize",
        background: "rgba(59, 130, 246, 0.85)",
        borderRadius: 2,
        zIndex: 51,
      }}
    />
  );
}
```

In `ResizeHandlesActive`, render the corner handle when both axes are resizable:

```typescript
return (
  <>
    {matrix.right ? <RightEdgeHandle node={node} rect={rect} /> : null}
    {matrix.bottom ? <BottomEdgeHandle node={node} rect={rect} /> : null}
    {matrix.right && matrix.bottom ? <CornerHandle node={node} rect={rect} /> : null}
  </>
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx -t "CornerHandle"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/ResizeHandles.tsx apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
git commit -m "feat(resize): add bottom-right corner handle for two-axis resize"
```

### Task 2.4 — Phase 2 typecheck gate

**Files:** none

- [ ] **Step 1: Run gates**

```bash
pnpm typecheck && pnpm biome check && pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd
```

Expected: zero errors. If a snapshot test in `ResizeHandles.test.tsx` was asserting on the old `RESIZE_MATRIX` shape, update its expectations to the new function-based contract.

---

## Phase 3 — Parent-bound clamp + cascade on parent shrink

Add the action-layer plumbing (`applyResizeWithCascade`, `getMaxAllowedDimension`) and wire the clamp + tooltip into the resize-handle UI.

### Task 3.1 — Add `getMaxAllowedDimension` and tests

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts` (append helper at the bottom)
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `actions.test.ts`:

```typescript
import { getMaxAllowedDimension } from "../actions";

describe("getMaxAllowedDimension", () => {
  it("returns parent width minus sibling widths when querying a sibling cap", () => {
    const config = makeFixture({
      pages: [
        {
          slug: "home",
          rootComponent: section("root", [
            heading("h1", { width: "60%" }),
            heading("h2"), // candidate
          ]),
        },
      ],
    });
    expect(getMaxAllowedDimension(config, "h2", "width")).toBe(40);
  });

  it("returns 100% when the candidate is the only child", () => {
    const config = makeFixture({
      pages: [
        {
          slug: "home",
          rootComponent: section("root", [heading("h1")]),
        },
      ],
    });
    expect(getMaxAllowedDimension(config, "h1", "width")).toBe(100);
  });

  it("returns null when the component is not found", () => {
    const config = makeFixture({ pages: [] });
    expect(getMaxAllowedDimension(config, "nope", "width")).toBeNull();
  });
});
```

(`makeFixture`, `section`, `heading` are existing helpers in `actions.test.ts` — re-use them.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @apps/web test apps/web/lib/editor-state/__tests__/actions.test.ts -t "getMaxAllowedDimension"`

Expected: FAIL — function not exported.

- [ ] **Step 3: Implement**

Append to `apps/web/lib/editor-state/actions.ts`:

```typescript
function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d+(?:\.\d+)?)\s*%$/);
  return m && m[1] ? Number.parseFloat(m[1]) : null;
}

export function getMaxAllowedDimension(
  config: SiteConfig,
  id: ComponentId,
  axis: "width" | "height",
): number | null {
  for (const page of config.pages) {
    const parentId = findComponentParentId(page.rootComponent, id);
    if (!parentId) continue;
    const parent = findComponentById(page.rootComponent, parentId);
    if (!parent) continue;
    const siblings = (parent.children ?? []).filter((c) => c.id !== id);
    if (axis === "width") {
      // Containers express widths in %; sum siblings' percents and return
      // the remaining headroom (clamped 0..100). When a sibling has no
      // explicit width, treat it as 0% (it will reflow naturally).
      let used = 0;
      for (const s of siblings) {
        const p = parsePercent(s.style.width);
        if (p !== null) used += p;
      }
      return Math.max(0, Math.min(100, 100 - used));
    }
    // height: not bounded by sibling stack in current spec — return null.
    return null;
  }
  return null;
}

// findComponentById / findComponentParentId imported from `./store` are
// already in scope via the existing imports at the top of this file.
```

If `findComponentById` is not yet imported in `actions.ts`, add it to the import block at the top:

```typescript
import { findComponentById, findComponentParentId } from "./store";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/lib/editor-state/__tests__/actions.test.ts -t "getMaxAllowedDimension"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/actions.ts apps/web/lib/editor-state/__tests__/actions.test.ts
git commit -m "feat(actions): add getMaxAllowedDimension read helper"
```

### Task 3.2 — Implement `applyResizeWithCascade` (parent shrink → child clamp)

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts`
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe("applyResizeWithCascade", () => {
  it("proportionally rescales 60/40 % siblings when parent shrinks 600→400 px", () => {
    const config = makeFixture({
      pages: [
        {
          slug: "home",
          rootComponent: section("root", [
            section("p", [
              section("a", undefined, { width: "60%" }),
              section("b", undefined, { width: "40%" }),
            ], { width: "600px" }),
          ]),
        },
      ],
    });
    const next = applyResizeWithCascade(config, "p", "width", "400px");
    const p = findComponentById(next.pages[0]!.rootComponent, "p")!;
    const a = p.children![0]!;
    const b = p.children![1]!;
    expect(p.style.width).toBe("400px");
    // Children are still % of parent; 60/40 sums to 100% — no rescale needed.
    expect(a.style.width).toBe("60%");
    expect(b.style.width).toBe("40%");
  });

  it("clamps an oversized px-leaf child to the new parent width", () => {
    const config = makeFixture({
      pages: [
        {
          slug: "home",
          rootComponent: section("root", [
            section("p", [
              heading("h", { width: "500px" }),
            ], { width: "600px" }),
          ]),
        },
      ],
    });
    const next = applyResizeWithCascade(config, "p", "width", "400px");
    const h = findComponentById(next.pages[0]!.rootComponent, "h")!;
    expect(h.style.width).toBe("400px"); // clamped
  });

  it("is a no-op when the parent grows", () => {
    const config = makeFixture({
      pages: [
        {
          slug: "home",
          rootComponent: section("root", [
            section("p", [heading("h", { width: "200px" })], { width: "400px" }),
          ]),
        },
      ],
    });
    const next = applyResizeWithCascade(config, "p", "width", "800px");
    const h = findComponentById(next.pages[0]!.rootComponent, "h")!;
    expect(h.style.width).toBe("200px"); // unchanged
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — `applyResizeWithCascade` not exported.

- [ ] **Step 3: Implement**

Append to `apps/web/lib/editor-state/actions.ts`:

```typescript
function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d+(?:\.\d+)?)\s*px$/);
  return m && m[1] ? Number.parseFloat(m[1]) : null;
}

function clampChildWidthsToPx(node: ComponentNode, parentPx: number): ComponentNode {
  if (!node.children || node.children.length === 0) return node;
  const nextChildren = node.children.map((child) => {
    const childPx = parsePx(child.style.width);
    if (childPx !== null && childPx > parentPx) {
      return { ...child, style: { ...child.style, width: `${parentPx}px` } };
    }
    return child;
  });
  return { ...node, children: nextChildren };
}

export function applyResizeWithCascade(
  config: SiteConfig,
  id: ComponentId,
  axis: "width" | "height",
  value: string,
): SiteConfig {
  return applyMapToConfig(config, id, (node) => {
    const next: ComponentNode = { ...node, style: { ...node.style, [axis]: value } };
    if (axis !== "width") return next;
    const newPx = parsePx(value);
    if (newPx === null) return next; // % parent — children rescale by CSS, no JSON change.
    return clampChildWidthsToPx(next, newPx);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/lib/editor-state/__tests__/actions.test.ts -t "applyResizeWithCascade"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/actions.ts apps/web/lib/editor-state/__tests__/actions.test.ts
git commit -m "feat(actions): add applyResizeWithCascade to clamp clipped descendants"
```

### Task 3.3 — Wire `applyResizeWithCascade` into the store

**Files:**
- Modify: `apps/web/lib/editor-state/store.ts`
- Modify: `apps/web/lib/editor-state/types.ts` — add `setComponentDimensionWithCascade` action
- Test: `apps/web/lib/editor-state/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `store.test.ts`:

```typescript
describe("setComponentDimensionWithCascade", () => {
  it("flips saveState to dirty and clamps children", () => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s", siteSlug: "x", workingVersionId: "v",
      initialConfig: makeFixture({ /* parent 600px, child 500px */ }),
    });
    useEditorStore.getState().setComponentDimensionWithCascade("p", "width", "400px");
    const state = useEditorStore.getState();
    expect(state.saveState).toBe("dirty");
    const child = findComponentById(state.draftConfig.pages[0]!.rootComponent, "h");
    expect(child?.style.width).toBe("400px");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — action not on store.

- [ ] **Step 3: Implement**

In `types.ts`, add to `EditorActions`:

```typescript
setComponentDimensionWithCascade: (
  id: ComponentId,
  axis: "width" | "height",
  value: string,
) => void;
```

In `store.ts`, import `applyResizeWithCascade` and add the action:

```typescript
setComponentDimensionWithCascade: (id, axis, value) =>
  set((state) => ({
    draftConfig: applyResizeWithCascade(state.draftConfig, id, axis, value),
    saveState: "dirty",
  })),
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/store.ts apps/web/lib/editor-state/types.ts apps/web/lib/editor-state/__tests__/store.test.ts
git commit -m "feat(store): wire setComponentDimensionWithCascade action"
```

### Task 3.4 — Switch the resize handles to the cascade action

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
it("RightEdgeHandle write goes through setComponentDimensionWithCascade", async () => {
  // Arrange a parent with a child that would otherwise overflow.
  // Drag the parent's right handle smaller. Assert child width was clamped.
});
```

(Use the same store-fixture helpers from prior ResizeHandles tests.)

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — handle still calls `setComponentDimension`, no cascade.

- [ ] **Step 3: Implement — replace the call sites**

In `RightEdgeHandle` and `CornerHandle`, replace `setComponentDimension(id, axis, value)` with `setComponentDimensionWithCascade(id, axis, value)`. Keep `BottomEdgeHandle` on the existing `setComponentDimension` for now (height cascade lands in Task 3.7 if needed).

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/ResizeHandles.tsx
git commit -m "feat(resize): cascade child clamp on parent width drag"
```

### Task 3.5 — Live-drag clamp on the dragging handle (no overshoot beyond parent)

The candidate dimension during the drag must not exceed `getMaxAllowedDimension` for the dragging child. Today the handle reads `ev.clientX` and writes the result directly on `pointerup` — we need to clamp the candidate.

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
it("right-edge handle clamps to parent's max-allowed when child would overflow", async () => {
  // arrange: Section parent 600 px wide, two children: child A 80%, child B
  // selected (no width). Drag B right far past the parent edge.
  // Assert: B.style.width <= 20% (the remaining headroom).
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — clamp not yet applied.

- [ ] **Step 3: Implement**

In `RightEdgeHandle`'s `handlePointerUp`:

```typescript
const max = getMaxAllowedDimension(useEditorStore.getState().draftConfig, node.id, "width");
let percent = Math.round((clampedFraction * 100) / 5) * 5;
if (max !== null) percent = Math.min(percent, Math.floor(max / 5) * 5);
percent = Math.max(5, percent);
```

In `CornerHandle`'s `handlePointerUp`, apply the same clamp before writing width.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/ResizeHandles.tsx apps/web/components/editor/canvas/dnd/__tests__/ResizeHandles.test.tsx
git commit -m "feat(resize): clamp handle drag to parent's max-allowed width"
```

### Task 3.6 — "Bounded by parent" tooltip

**Files:**
- Create: `apps/web/components/editor/canvas/dnd/BoundedByParentTooltip.tsx`
- Modify: `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx` — emit a state flag while the user is pushing past the cap; render the tooltip
- Test: new test file `apps/web/components/editor/canvas/dnd/__tests__/BoundedByParentTooltip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { BoundedByParentTooltip } from "../BoundedByParentTooltip";

describe("BoundedByParentTooltip", () => {
  it("renders the message when visible", () => {
    render(<BoundedByParentTooltip visible top={100} left={200} />);
    expect(screen.getByText(/bounded by parent/i)).toBeInTheDocument();
  });

  it("emits no DOM when visible=false", () => {
    const { container } = render(
      <BoundedByParentTooltip visible={false} top={0} left={0} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — module missing.

- [ ] **Step 3: Implement the component**

Create `BoundedByParentTooltip.tsx`:

```typescript
"use client";

type Props = {
  visible: boolean;
  top: number;
  left: number;
};

export function BoundedByParentTooltip({ visible, top, left }: Props) {
  if (!visible) return null;
  return (
    <div
      data-testid="bounded-by-parent-tooltip"
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full rounded-sm bg-zinc-800/90 px-1.5 py-0.5 text-[10px] text-white"
      style={{ top: top - 8, left }}
    >
      Bounded by parent
    </div>
  );
}
```

In `ResizeHandles.tsx`, add a `useState<{ visible: boolean; top: number; left: number }>` to `RightEdgeHandle` and `CornerHandle`. While the pointer is in the "pushing" zone past the cap **for > 150 ms**, set `visible: true`. On pointer-release or when the pointer pulls back inside the cap for **> 800 ms**, set `visible: false`. Render the tooltip element from the same component as the handle.

The 150 ms / 800 ms timing uses two `setTimeout` handles — clear them on cleanup.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @apps/web test apps/web/components/editor/canvas/dnd/__tests__/BoundedByParentTooltip.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/BoundedByParentTooltip.tsx apps/web/components/editor/canvas/dnd/ResizeHandles.tsx apps/web/components/editor/canvas/dnd/__tests__/BoundedByParentTooltip.test.tsx
git commit -m "feat(resize): show 'Bounded by parent' tooltip when handle hits cap"
```

### Task 3.7 — Phase 3 gate

```bash
pnpm typecheck && pnpm biome check && pnpm --filter @apps/web test apps/web/lib/editor-state apps/web/components/editor/canvas/dnd
```

Expected: all green. Commit any incidental fixes.

---

## Phase 4 — Always-visible dotted dropzone overlays

Replace the existing 4-px blue accent line with a unified dotted-grey overlay system. This phase touches the visual language but does NOT add side dropzones (Phase 5) or the toggle (Phase 6).

### Task 4.1 — Update BetweenDropZone idle/active visuals

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx`
- Test: extend `apps/web/components/editor/canvas/dnd/__tests__/dnd-ids.test.ts` or add `BetweenDropZone.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/editor/canvas/dnd/__tests__/BetweenDropZone.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DragStateProvider } from "../DropZoneIndicator";
import { BetweenDropZone } from "../BetweenDropZone";

describe("BetweenDropZone visuals", () => {
  it("renders dotted-grey idle overlay even with no drag in progress", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone).toHaveClass(/border-dashed/);
    // Doubled idle height (was h-2 → now h-4).
    expect(zone).toHaveClass(/h-4/);
  });

  it("expands and turns blue when acceptable hover", () => {
    render(
      <DragStateProvider
        value={{
          activeId: "palette:Heading",
          overId: "between:p1:0",
          isAcceptable: true,
        }}
      >
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone).toHaveAttribute("data-acceptable", "true");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — current zone uses `h-2` idle and emits no dashed border.

- [ ] **Step 3: Implement — overhaul classes**

Rewrite `BetweenDropZone`'s vertical branch:

```typescript
return (
  <div
    ref={setNodeRef}
    data-testid={`between-dropzone-${parentId}-${index}`}
    data-between-id={id}
    data-acceptable={acceptable ? "true" : undefined}
    className={cn(
      "relative w-full rounded-sm border border-dashed transition-all duration-100",
      // Idle: dotted grey, doubled height.
      "border-zinc-400/40 bg-zinc-400/10 h-4",
      // During drag — expand and tint.
      dragInProgress && "h-6",
      acceptable && "border-blue-500/60 bg-blue-500/15",
      isOver && !acceptable && "border-red-500/60 bg-red-500/15",
    )}
  />
);
```

Apply the same treatment to the horizontal branch (swap `w` for `h`, idle `w-4` → drag `w-6`).

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx apps/web/components/editor/canvas/dnd/__tests__/BetweenDropZone.test.tsx
git commit -m "feat(dnd): always-visible dotted-grey BetweenDropZone overlays"
```

### Task 4.2 — Remove the 4-px blue accent in DropZoneIndicator

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx:49-67`
- Test: extend the existing test for `DropZoneIndicator` (find the file via grep)

- [ ] **Step 1: Write the failing test**

```typescript
import { render } from "@testing-library/react";
import { DragStateProvider, DropZoneIndicator } from "../DropZoneIndicator";

describe("DropZoneIndicator (post-overlay-system)", () => {
  it("emits NO DOM regardless of drag state — overlay system replaces it", () => {
    const { container } = render(
      <DragStateProvider value={{ activeId: "palette:Heading", overId: "node:cmp_x", isAcceptable: true }}>
        <DropZoneIndicator id="cmp_x" />
      </DragStateProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — old indicator still draws a div when `overNodeId === id`.

- [ ] **Step 3: Implement — make the function always return null**

Replace `DropZoneIndicator`'s body with:

```typescript
export function DropZoneIndicator(_: { id: string }) {
  // The dotted-grey overlay system in BetweenDropZone, sideDropZones, and
  // EmptyContainerOverlay subsumes the 4-px blue accent line that lived
  // here. Kept exported so callers (EditModeWrapper) compile during the
  // transition. Future cleanup may inline-delete the call site entirely.
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS. Existing tests that asserted the indicator drew DOM must be updated to expect null.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx apps/web/components/editor/canvas/dnd/__tests__/
git commit -m "refactor(dnd): retire DropZoneIndicator's 4-px accent (overlays replace it)"
```

### Task 4.3 — Add `EmptyContainerOverlay`

Renders the dotted-grey panel inside containers that have zero children, with a centered hint.

**Files:**
- Create: `apps/web/components/editor/canvas/dnd/EmptyContainerOverlay.tsx`
- Create: `apps/web/components/editor/canvas/dnd/__tests__/EmptyContainerOverlay.test.tsx`
- Modify: `apps/web/components/renderer/ComponentRenderer.tsx` — render this when a container has no children (in edit mode only)

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { EmptyContainerOverlay } from "../EmptyContainerOverlay";

describe("EmptyContainerOverlay", () => {
  it("renders the hint label", () => {
    render(<EmptyContainerOverlay parentId="p" />);
    expect(screen.getByText(/drop a component here/i)).toBeInTheDocument();
  });

  it("registers as a droppable", () => {
    render(<EmptyContainerOverlay parentId="p" />);
    const el = screen.getByTestId("empty-container-overlay-p");
    expect(el.getAttribute("data-dropzone-id")).toBe("dropzone:p");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

```typescript
"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragState } from "./DropZoneIndicator";
import { dropZoneId } from "./dnd-ids";

export function EmptyContainerOverlay({ parentId }: { parentId: string }) {
  const id = dropZoneId(parentId);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  const acceptable = isOver && isAcceptable && overId === id;
  return (
    <div
      ref={setNodeRef}
      data-testid={`empty-container-overlay-${parentId}`}
      data-dropzone-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      className={cn(
        "flex min-h-[64px] w-full items-center justify-center rounded-sm border border-dashed text-[11px] transition-all duration-100",
        "border-zinc-400/40 bg-zinc-400/10 text-zinc-500",
        activeId && acceptable && "border-blue-500/60 bg-blue-500/15 text-blue-700",
        activeId && isOver && !acceptable && "border-red-500/60 bg-red-500/15 text-red-700",
      )}
    >
      Drop a component here
    </div>
  );
}
```

In `ComponentRenderer.tsx`, where children are rendered for a container, add a branch: when `mode === "edit"` and the container's children array is empty AND its `childrenPolicy !== "none"`, render `<EmptyContainerOverlay parentId={node.id} />` instead of nothing.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/EmptyContainerOverlay.tsx apps/web/components/editor/canvas/dnd/__tests__/EmptyContainerOverlay.test.tsx apps/web/components/renderer/ComponentRenderer.tsx
git commit -m "feat(canvas): show 'Drop a component here' overlay for empty containers in edit mode"
```

### Task 4.4 — Add `CanvasDropOverlay` (open canvas around the page frame)

**Files:**
- Create: `apps/web/components/editor/canvas/dnd/CanvasDropOverlay.tsx`
- Create: `apps/web/components/editor/canvas/dnd/__tests__/CanvasDropOverlay.test.tsx`
- Modify: `apps/web/components/editor/canvas/Canvas.tsx` — render the overlay outside the page frame

- [ ] **Step 1: Write the failing test**

```typescript
describe("CanvasDropOverlay", () => {
  it("renders the dotted background panel in edit mode", () => {
    // mount Canvas in edit mode, assert the data-testid="canvas-drop-overlay" exists
  });

  it("does NOT render in preview mode", () => {
    // mount Canvas with previewMode=true, assert absent
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — element not in DOM.

- [ ] **Step 3: Implement**

```typescript
"use client";

import { cn } from "@/lib/utils";

export function CanvasDropOverlay() {
  return (
    <div
      data-testid="canvas-drop-overlay"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 m-2 rounded border border-dashed",
        "border-zinc-400/30 bg-zinc-400/[0.04]",
      )}
    />
  );
}
```

In `Canvas.tsx`, render `<CanvasDropOverlay />` inside the `<main>` *before* the centered page frame. Wrap the existing inner `<div>` so the overlay sits behind it. The overlay must NOT capture pointer events (the radial-dot background already conveys the "no component" visual; this overlay is the framed-dotted complement).

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/CanvasDropOverlay.tsx apps/web/components/editor/canvas/dnd/__tests__/CanvasDropOverlay.test.tsx apps/web/components/editor/canvas/Canvas.tsx
git commit -m "feat(canvas): add open-canvas dotted overlay in edit mode"
```

### Task 4.5 — Phase 4 gate

```bash
pnpm typecheck && pnpm biome check && pnpm --filter @apps/web test apps/web/components/editor/canvas
```

Expected: all green. Manual check: open `pnpm dev`, confirm:
- The page has a visible dotted-grey margin around the page frame.
- Empty Sections and Rows show the "Drop a component here" panel.
- Between-zones are visible at all times in edit mode.
- The old blue accent line is gone.

---

## Phase 5 — Side dropzones + auto-wrap into FlowGroup

Now we add the new drop intent: dropping on the left or right edge of a component creates a horizontal sibling.

### Task 5.1 — Extend `dnd-ids.ts` with side ids

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/dnd-ids.ts`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/dnd-ids.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { isSideId, parseSideId, sideId } from "../dnd-ids";

describe("side dropzone ids", () => {
  it("constructs and parses a right-side id", () => {
    const id = sideId("cmp_x", "right");
    expect(id).toBe("side:cmp_x:right");
    expect(isSideId(id)).toBe(true);
    expect(parseSideId(id)).toEqual({ targetId: "cmp_x", side: "right" });
  });

  it("rejects malformed side ids", () => {
    expect(isSideId("side:cmp_x:diagonal")).toBe(false);
    expect(parseSideId("between:cmp_x:0")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — `sideId` not exported.

- [ ] **Step 3: Implement**

In `dnd-ids.ts`:

```typescript
const SIDE_PREFIX = "side:";
const SIDES = ["left", "right", "top", "bottom"] as const;
export type Side = (typeof SIDES)[number];
export type SideDropId = `side:${ComponentId}:${Side}`;

export function sideId(targetId: ComponentId, side: Side): SideDropId {
  return `${SIDE_PREFIX}${targetId}:${side}` as SideDropId;
}

export function isSideId(value: unknown): value is SideDropId {
  return parseSideId(value) !== null;
}

export function parseSideId(
  value: unknown,
): { targetId: ComponentId; side: Side } | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(SIDE_PREFIX)) return null;
  const tail = value.slice(SIDE_PREFIX.length);
  const lastColon = tail.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const targetId = tail.slice(0, lastColon);
  const side = tail.slice(lastColon + 1);
  if (!(SIDES as readonly string[]).includes(side)) return null;
  return { targetId, side: side as Side };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/dnd-ids.ts apps/web/components/editor/canvas/dnd/__tests__/dnd-ids.test.ts
git commit -m "feat(dnd): add sideId constructor/parser for edge-drop targets"
```

### Task 5.2 — Implement `applyWrapInFlowGroup` and `applyDissolveFlowGroup`

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts`
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe("applyWrapInFlowGroup", () => {
  it("wraps target + new sibling in a FlowGroup at the target's index (right side)", () => {
    const config = makeFixture({
      pages: [{ slug: "home", rootComponent: section("root", [section("a"), section("b")]) }],
    });
    const newNode: ComponentNode = { id: "n", type: "Heading", props: {}, style: {} };
    const next = applyWrapInFlowGroup(config, "a", newNode, "right");
    const root = next.pages[0]!.rootComponent;
    expect(root.children).toHaveLength(2); // FlowGroup + section "b"
    const fg = root.children![0]!;
    expect(fg.type).toBe("FlowGroup");
    expect(fg.children?.map((c) => c.id)).toEqual(["a", "n"]);
  });

  it("inserts on the LEFT side correctly", () => {
    const config = makeFixture({
      pages: [{ slug: "home", rootComponent: section("root", [section("a")]) }],
    });
    const next = applyWrapInFlowGroup(
      config, "a", { id: "n", type: "Heading", props: {}, style: {} }, "left",
    );
    const fg = next.pages[0]!.rootComponent.children![0]!;
    expect(fg.children?.map((c) => c.id)).toEqual(["n", "a"]);
  });
});

describe("applyDissolveFlowGroup", () => {
  it("removes a 1-child FlowGroup and reparents the survivor", () => {
    const config = makeFixture({
      pages: [{
        slug: "home",
        rootComponent: section("root", [
          { id: "fg", type: "FlowGroup", props: {}, style: {}, children: [section("a")] },
          section("b"),
        ]),
      }],
    });
    const next = applyDissolveFlowGroup(config, "fg");
    const root = next.pages[0]!.rootComponent;
    expect(root.children?.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("is a no-op for a multi-child FlowGroup", () => {
    const config = makeFixture({
      pages: [{
        slug: "home",
        rootComponent: section("root", [{
          id: "fg", type: "FlowGroup", props: {}, style: {},
          children: [section("a"), section("b")],
        }]),
      }],
    });
    const next = applyDissolveFlowGroup(config, "fg");
    expect(next).toBe(config); // structural sharing — same reference
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — actions not exported.

- [ ] **Step 3: Implement**

Append to `actions.ts`:

```typescript
import { newComponentId } from "@/lib/site-config";

export function applyWrapInFlowGroup(
  config: SiteConfig,
  targetId: ComponentId,
  newSibling: ComponentNode,
  side: "left" | "right" | "top" | "bottom",
): SiteConfig {
  // top/bottom are vertical neighbours — handled by the existing
  // applyAddComponentChild path; only left/right do FlowGroup wrap.
  if (side === "top" || side === "bottom") {
    fail(
      "invalid_drop_target",
      "applyWrapInFlowGroup only handles horizontal sides (left/right).",
    );
  }
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const parentId = findComponentParentId(page.rootComponent, targetId);
    if (!parentId) continue;
    const res = mapNodeById(page.rootComponent, parentId, (parent) => {
      const children = (parent.children ?? []).slice();
      const idx = children.findIndex((c) => c.id === targetId);
      if (idx < 0) return parent;
      const target = children[idx]!;
      // If the parent is ALREADY a FlowGroup, just insert as a sibling.
      if (parent.type === "FlowGroup") {
        const insertAt = side === "right" ? idx + 1 : idx;
        children.splice(insertAt, 0, newSibling);
        return { ...parent, children };
      }
      // Wrap the target + new sibling in a fresh FlowGroup.
      const fg: ComponentNode = {
        id: newComponentId("cmp"),
        type: "FlowGroup",
        props: {},
        style: {},
        children: side === "right" ? [target, newSibling] : [newSibling, target],
      };
      children.splice(idx, 1, fg);
      return { ...parent, children };
    });
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  fail("component_not_found", `Component "${targetId}" not found in any page.`);
}

export function applyDissolveFlowGroup(
  config: SiteConfig,
  flowGroupId: ComponentId,
): SiteConfig {
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i];
    if (!page) continue;
    const fg = findComponentById(page.rootComponent, flowGroupId);
    if (!fg || fg.type !== "FlowGroup") continue;
    if ((fg.children?.length ?? 0) > 1) return config; // no-op
    const survivor = fg.children?.[0];
    const parentId = findComponentParentId(page.rootComponent, flowGroupId);
    if (!parentId) continue;
    const res = mapNodeById(page.rootComponent, parentId, (parent) => {
      const children = (parent.children ?? []).slice();
      const idx = children.findIndex((c) => c.id === flowGroupId);
      if (idx < 0) return parent;
      if (survivor) {
        children.splice(idx, 1, survivor);
      } else {
        children.splice(idx, 1);
      }
      return { ...parent, children };
    });
    if (!res.found) continue;
    const nextPages = config.pages.slice();
    nextPages[i] = { ...page, rootComponent: res.node };
    return { ...config, pages: nextPages };
  }
  return config; // FlowGroup not found — no-op
}
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/actions.ts apps/web/lib/editor-state/__tests__/actions.test.ts
git commit -m "feat(actions): add applyWrapInFlowGroup and applyDissolveFlowGroup"
```

### Task 5.3 — Auto-dissolve on remove and move

**Files:**
- Modify: `apps/web/lib/editor-state/actions.ts` — `applyRemoveComponent`, `applyMoveComponent`
- Test: `apps/web/lib/editor-state/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe("auto-dissolve FlowGroups", () => {
  it("dissolves a FlowGroup that drops to 1 child via applyRemoveComponent", () => {
    const config = makeFixture({
      pages: [{
        slug: "home",
        rootComponent: section("root", [
          { id: "fg", type: "FlowGroup", props: {}, style: {},
            children: [section("a"), section("b")] },
        ]),
      }],
    });
    const next = applyRemoveComponent(config, "b");
    const root = next.pages[0]!.rootComponent;
    // FlowGroup gone, "a" reparented up.
    expect(root.children?.map((c) => c.id)).toEqual(["a"]);
  });

  it("dissolves a FlowGroup left with one child after a move", () => {
    const config = makeFixture({
      pages: [{
        slug: "home",
        rootComponent: section("root", [
          section("dst"), // empty receiver
          { id: "fg", type: "FlowGroup", props: {}, style: {},
            children: [section("a"), section("b")] },
        ]),
      }],
    });
    const next = applyMoveComponent(config, "b", "dst", 0);
    const root = next.pages[0]!.rootComponent;
    expect(root.children?.map((c) => c.id)).toEqual(["dst", "a"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — auto-dissolve not wired.

- [ ] **Step 3: Implement**

Helper at the bottom of `actions.ts`:

```typescript
function dissolveStaleFlowGroups(config: SiteConfig): SiteConfig {
  let cur = config;
  for (const page of cur.pages) {
    const stale: string[] = [];
    function walk(n: ComponentNode) {
      if (n.type === "FlowGroup" && (n.children?.length ?? 0) <= 1) {
        stale.push(n.id);
      }
      for (const c of n.children ?? []) walk(c);
    }
    walk(page.rootComponent);
    for (const id of stale) {
      cur = applyDissolveFlowGroup(cur, id);
    }
  }
  return cur;
}
```

Wrap the return values of `applyRemoveComponent` and `applyMoveComponent`:

```typescript
export function applyRemoveComponent(config: SiteConfig, id: ComponentId): SiteConfig {
  // ... existing body ...
  return dissolveStaleFlowGroups({ ...config, pages: nextPages });
}

export function applyMoveComponent(/* args */): SiteConfig {
  // ... existing body ...
  return dissolveStaleFlowGroups(applyAddComponentChild(removed, newParentId, newIndex, target));
}
```

(Both existing functions already build `nextPages` / a final `applyAddComponentChild` return; wrap their final return only.)

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS. Make sure pre-existing actions.test.ts tests still pass — `dissolveStaleFlowGroups` is a no-op when there are no FlowGroups in the tree, so no regression expected.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/actions.ts apps/web/lib/editor-state/__tests__/actions.test.ts
git commit -m "feat(actions): auto-dissolve stale FlowGroups after remove/move"
```

### Task 5.4 — Wire `applyWrapInFlowGroup` into the store

**Files:**
- Modify: `apps/web/lib/editor-state/store.ts`
- Modify: `apps/web/lib/editor-state/types.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe("wrapInFlowGroup store action", () => {
  it("inserts FlowGroup, selects the new sibling, flips dirty", () => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({ /* one section "a" */ });
    const newSibling = createDefaultNode("Heading");
    useEditorStore.getState().wrapInFlowGroup("a", newSibling, "right");
    const state = useEditorStore.getState();
    expect(state.saveState).toBe("dirty");
    expect(state.selectedComponentId).toBe(newSibling.id);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — action missing.

- [ ] **Step 3: Implement**

In `types.ts`:

```typescript
wrapInFlowGroup: (
  targetId: ComponentId,
  newSibling: ComponentNode,
  side: "left" | "right",
) => void;
```

In `store.ts`:

```typescript
wrapInFlowGroup: (targetId, newSibling, side) =>
  set((state) => ({
    draftConfig: applyWrapInFlowGroup(state.draftConfig, targetId, newSibling, side),
    selectedComponentId: newSibling.id,
    saveState: "dirty",
  })),
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/store.ts apps/web/lib/editor-state/types.ts apps/web/lib/editor-state/__tests__/store.test.ts
git commit -m "feat(store): wire wrapInFlowGroup action"
```

### Task 5.5 — Render side-edge dropzones in `EditModeWrapper`

**Files:**
- Create: `apps/web/components/editor/canvas/dnd/sideDropZones.tsx`
- Modify: `apps/web/components/renderer/EditModeWrapper.tsx`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/sideDropZones.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { SideDropZones } from "../sideDropZones";
import { DragStateProvider } from "../DropZoneIndicator";

describe("SideDropZones", () => {
  it("renders four edge zones with side ids", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    expect(screen.getByTestId("side-dropzone-cmp_x-left")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-right")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-top")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-bottom")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `sideDropZones.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDragState } from "./DropZoneIndicator";
import { type Side, sideId } from "./dnd-ids";

const SIDE_GEOMETRY: Record<Side, string> = {
  left: "absolute inset-y-0 left-0 w-3",
  right: "absolute inset-y-0 right-0 w-3",
  top: "absolute inset-x-0 top-0 h-3",
  bottom: "absolute inset-x-0 bottom-0 h-3",
};

export function SideDropZones({ targetId }: { targetId: string }) {
  return (
    <>
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <SideDropZone key={side} targetId={targetId} side={side} />
      ))}
    </>
  );
}

function SideDropZone({ targetId, side }: { targetId: string; side: Side }) {
  const id = sideId(targetId, side);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { activeId, isAcceptable, overId } = useDragState();
  const acceptable = isOver && isAcceptable && overId === id;
  return (
    <div
      ref={setNodeRef}
      data-testid={`side-dropzone-${targetId}-${side}`}
      data-side-id={id}
      data-acceptable={acceptable ? "true" : undefined}
      className={cn(
        SIDE_GEOMETRY[side],
        "rounded-sm border border-dashed transition-all duration-100",
        "border-zinc-400/30 bg-zinc-400/[0.05]",
        activeId && acceptable && "border-blue-500/60 bg-blue-500/15",
        activeId && isOver && !acceptable && "border-red-500/60 bg-red-500/15",
      )}
    />
  );
}
```

In `EditModeWrapper.tsx`, render `<SideDropZones targetId={id} />` *inside* the wrapper alongside `<DropZoneIndicator />` (which now returns null but stays in the tree). Use the existing `useNodeSortable` to skip rendering when `sortable` is null (preview mode).

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/sideDropZones.tsx apps/web/components/renderer/EditModeWrapper.tsx apps/web/components/editor/canvas/dnd/__tests__/sideDropZones.test.tsx
git commit -m "feat(dnd): render side-edge dropzones around every component in edit mode"
```

### Task 5.6 — Handle side-zone drops in DndCanvasProvider

**Files:**
- Modify: `apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx`
- Test: `apps/web/components/editor/canvas/dnd/__tests__/DndCanvasProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
describe("side-zone drop wraps target + draggable in FlowGroup", () => {
  it("palette → side(right) creates a FlowGroup with target on left, new on right", () => {
    // Arrange a Section "root" containing one Heading "h1".
    // Simulate a palette drag of "Button" ending over side:h1:right.
    // Assert the resulting tree: root > FlowGroup [h1, new Button].
  });

  it("node → side(left) wraps + moves the dragged node", () => {
    // Arrange section root with two siblings a, b.
    // Drag b over side:a:left. Result: root > [FlowGroup[b, a]].
    // (b is removed from its old position before the wrap.)
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — side-zone case not in `handleDragEnd`.

- [ ] **Step 3: Implement**

In `DndCanvasProvider.tsx`:

a. Import `parseSideId` from `dnd-ids`.

b. In `determineAcceptable`, add a branch:

```typescript
const sideTarget = parseSideId(overIdRaw);
if (sideTarget) {
  const targetNode = findNodeInTree(currentPage.rootComponent, sideTarget.targetId);
  if (!targetNode) return false;
  // Same-self drop is a no-op; reject.
  if (parseNodeId(activeIdRaw) === sideTarget.targetId) return false;
  // Acceptable iff the candidate is a valid child of the EVENTUAL parent.
  // For a fresh wrap, the parent will be a new FlowGroup, which accepts
  // anything except FlowGroups themselves.
  const candidateType =
    parsePaletteId(activeIdRaw) ?? findNodeInTree(currentPage.rootComponent, parseNodeId(activeIdRaw) ?? "")?.type;
  if (!candidateType || candidateType === "FlowGroup") return false;
  return true;
}
```

c. In `handleDragEnd`, branch on `parseSideId(overIdRaw)` BEFORE the existing between/node branches:

```typescript
const sideTarget = parseSideId(overIdRaw);
if (sideTarget) {
  if (sideTarget.side === "top" || sideTarget.side === "bottom") {
    // Vertical side drop = insert as sibling above/below in the existing
    // parent. Compute parent + index, reuse addComponentChild / moveComponent.
    const parentId = findComponentParentId(currentPage.rootComponent, sideTarget.targetId);
    if (!parentId) return;
    const parent = findNodeInTree(currentPage.rootComponent, parentId);
    if (!parent) return;
    const targetIdx = (parent.children ?? []).findIndex((c) => c.id === sideTarget.targetId);
    const insertAt = sideTarget.side === "bottom" ? targetIdx + 1 : targetIdx;
    const paletteType = parsePaletteId(activeIdRaw);
    if (paletteType) {
      addComponentChild(parent.id, insertAt, createDefaultNode(paletteType));
      return;
    }
    const draggedId = parseNodeId(activeIdRaw);
    if (!draggedId) return;
    moveComponent(draggedId, parent.id, insertAt);
    return;
  }
  // left / right → FlowGroup wrap.
  const paletteType = parsePaletteId(activeIdRaw);
  if (paletteType) {
    wrapInFlowGroup(sideTarget.targetId, createDefaultNode(paletteType), sideTarget.side);
    return;
  }
  const draggedId = parseNodeId(activeIdRaw);
  if (!draggedId) return;
  // Use the dedicated action (defined below) for a single-tick remove + wrap.
  wrapInFlowGroupMove(draggedId, sideTarget.targetId, sideTarget.side);
  return;
}
```

The dedicated `wrapInFlowGroupMove` action is required (not optional) — a two-tick `removeComponent` + `wrapInFlowGroup` would split the operation across two undo entries and briefly leave the dragged node detached. Add to `actions.ts`:

```typescript
export function applyWrapInFlowGroupMove(
  config: SiteConfig,
  draggedId: ComponentId,
  targetId: ComponentId,
  side: "left" | "right",
): SiteConfig {
  const draggedNode = findNodeAcrossPages(config, draggedId);
  if (!draggedNode) fail("component_not_found", `Component "${draggedId}" not found.`);
  const removed = applyRemoveComponent(config, draggedId);
  return applyWrapInFlowGroup(removed, targetId, draggedNode, side);
}
```

Wire that as `wrapInFlowGroupMove` in `store.ts`. Add to `types.ts`:

```typescript
wrapInFlowGroupMove: (
  draggedId: ComponentId,
  targetId: ComponentId,
  side: "left" | "right",
) => void;
```

In `store.ts`:

```typescript
wrapInFlowGroupMove: (draggedId, targetId, side) =>
  set((state) => ({
    draftConfig: applyWrapInFlowGroupMove(state.draftConfig, draggedId, targetId, side),
    saveState: "dirty",
  })),
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx apps/web/lib/editor-state/actions.ts apps/web/lib/editor-state/store.ts apps/web/lib/editor-state/types.ts apps/web/components/editor/canvas/dnd/__tests__/DndCanvasProvider.test.tsx
git commit -m "feat(dnd): handle side-zone drops via FlowGroup wrap"
```

### Task 5.7 — SelectionBreadcrumb skips FlowGroup

**Files:**
- Modify: `apps/web/components/editor/canvas/SelectionBreadcrumb.tsx`
- Test: existing `SelectionBreadcrumb` test (find via grep) — extend with a FlowGroup case.

- [ ] **Step 1: Write the failing test**

```typescript
it("skips FlowGroup ancestors in the trail", () => {
  // Arrange: select a Heading nested under FlowGroup nested under Section.
  // Expect the breadcrumb to display "Section › Heading" — no "Flow Group".
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — current breadcrumb walks every ancestor.

- [ ] **Step 3: Implement**

In `SelectionBreadcrumb.tsx`, filter out FlowGroup nodes from the rendered trail:

```typescript
const trail = useEditorStore((s) => /* existing trail selector */);
const visibleTrail = trail.filter((n) => n.type !== "FlowGroup");
```

Render `visibleTrail` instead of `trail`.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/canvas/SelectionBreadcrumb.tsx apps/web/components/editor/canvas/__tests__/
git commit -m "feat(breadcrumb): hide FlowGroup ancestors from selection trail"
```

### Task 5.8 — Phase 5 gate

```bash
pnpm typecheck && pnpm biome check && pnpm --filter @apps/web test
```

Expected: all green. Manual smoke: open `pnpm dev`, drag a Heading onto the right edge of an existing Section. Confirm the two render side-by-side, the layer tree shows them as siblings of the same parent (no FlowGroup visible to the user), and deleting one collapses the layout back to a single full-width sibling.

---

## Phase 6 — Show Component Types toggle

The lightest phase. Adds the TopBar button and the conditional outline + label in `EditModeWrapper`.

### Task 6.1 — Add `showComponentTypes` to the store

**Files:**
- Modify: `apps/web/lib/editor-state/store.ts`
- Modify: `apps/web/lib/editor-state/types.ts`
- Test: `apps/web/lib/editor-state/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe("showComponentTypes toggle", () => {
  it("defaults to true", () => {
    __resetEditorStoreForTests();
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
  });

  it("toggles between true and false", () => {
    __resetEditorStoreForTests();
    useEditorStore.getState().toggleShowComponentTypes();
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
    useEditorStore.getState().toggleShowComponentTypes();
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — field/action missing.

- [ ] **Step 3: Implement**

In `types.ts`:

```typescript
// Extend EditorState
showComponentTypes: boolean;

// Extend EditorActions
toggleShowComponentTypes: () => void;
```

In `store.ts` initial state:

```typescript
showComponentTypes: true,
```

Action:

```typescript
toggleShowComponentTypes: () =>
  set((state) => ({ showComponentTypes: !state.showComponentTypes })),
```

Update the `__resetEditorStoreForTests` helper to include `showComponentTypes: true`.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor-state/store.ts apps/web/lib/editor-state/types.ts apps/web/lib/editor-state/__tests__/store.test.ts
git commit -m "feat(store): add transient showComponentTypes flag"
```

### Task 6.2 — Build the TopBar toggle button

**Files:**
- Create: `apps/web/components/editor/topbar/ShowComponentTypesToggle.tsx`
- Create: `apps/web/components/editor/topbar/__tests__/ShowComponentTypesToggle.test.tsx`
- Modify: `apps/web/components/editor/topbar/TopBar.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state";
import { ShowComponentTypesToggle } from "../ShowComponentTypesToggle";

describe("ShowComponentTypesToggle", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("flips the store flag on click", async () => {
    render(<ShowComponentTypesToggle />);
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: /component types/i }));
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
  });

  it("shows active styling when on", () => {
    render(<ShowComponentTypesToggle />);
    expect(screen.getByRole("button", { name: /component types/i })).toHaveClass(/text-orange-400/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `ShowComponentTypesToggle.tsx`:

```typescript
"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

export function ShowComponentTypesToggle() {
  const on = useEditorStore((s) => s.showComponentTypes);
  const toggle = useEditorStore((s) => s.toggleShowComponentTypes);
  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Hide component types" : "Show component types"}
      aria-label={on ? "Hide component types" : "Show component types"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        on ? "text-orange-400 bg-zinc-800" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
      )}
    >
      <LayoutGrid className="h-4 w-4" />
    </button>
  );
}
```

In `TopBar.tsx`, insert before `<PreviewToggle />`:

```typescript
import { ShowComponentTypesToggle } from "./ShowComponentTypesToggle";

// inside the right-side cluster:
<ShowComponentTypesToggle />
<PreviewToggle />
```

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/topbar/ShowComponentTypesToggle.tsx apps/web/components/editor/topbar/TopBar.tsx apps/web/components/editor/topbar/__tests__/ShowComponentTypesToggle.test.tsx
git commit -m "feat(topbar): add Show Component Types toggle button"
```

### Task 6.3 — Render outline + type label in `EditModeWrapper`

**Files:**
- Modify: `apps/web/components/renderer/EditModeWrapper.tsx`
- Test: `apps/web/components/editor/__tests__/canvas.test.tsx` (or new test)

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state";

describe("Show Component Types overlay", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("renders dashed outline + 'Section' label when toggle is on", () => {
    // mount Canvas with a Section in edit mode
    expect(screen.getByText("Section")).toBeInTheDocument();
  });

  it("hides outline + label when toggle is off", () => {
    useEditorStore.getState().toggleShowComponentTypes();
    // re-render
    expect(screen.queryByText("Section")).toBeNull();
  });

  it("never renders the label for FlowGroup", () => {
    // arrange a FlowGroup containing two Headings
    expect(screen.queryByText("FlowGroup")).toBeNull();
    expect(screen.queryByText("Flow Group")).toBeNull();
  });

  it("hides outline + label in preview mode regardless of toggle", () => {
    useEditorStore.getState().setPreviewMode(true);
    expect(screen.queryByText("Section")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL — outline/label not rendered.

- [ ] **Step 3: Implement**

In `EditModeWrapper.tsx`, add two required props: `type: ComponentType` and `mode: "edit" | "preview" | "public"`. `EditModeWrapper` currently does not know the component type — pass both from `ComponentRenderer.tsx` where the wrapper is constructed:

```typescript
<EditModeWrapper id={node.id} selected={selected} onSelect={...} onContextMenu={...} type={node.type} mode={mode}>
```

Then in `EditModeWrapper`:

```typescript
const showTypes = useEditorStore((s) => s.showComponentTypes);
const showOverlay = mode === "edit" && showTypes && type !== "FlowGroup";

return (
  <div /* existing props */ className={cn(/* existing classes */, showOverlay && "outline outline-1 outline-dashed outline-zinc-400/70")}>
    {showOverlay ? (
      <span
        data-testid={`type-label-${id}`}
        className="pointer-events-none absolute left-1/2 -top-4 z-40 -translate-x-1/2 rounded-sm bg-zinc-800/90 px-1.5 py-0.5 text-[10px] text-white"
      >
        {componentRegistry[type].meta.displayName}
      </span>
    ) : null}
    {/* … existing children … */}
  </div>
);
```

Update all callers of `<EditModeWrapper>` to pass `type` and `mode`. The only caller is `ComponentRenderer.tsx` — see [ComponentRenderer.tsx:92-100](../../../apps/web/components/renderer/ComponentRenderer.tsx) for the wrapper construction.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/renderer/EditModeWrapper.tsx apps/web/components/renderer/ComponentRenderer.tsx apps/web/components/editor/__tests__/canvas.test.tsx
git commit -m "feat(canvas): render dashed outline + type label per showComponentTypes"
```

### Task 6.4 — Phase 6 gate

```bash
pnpm typecheck && pnpm biome check && pnpm --filter @apps/web test
```

Expected: all green.

---

## Phase 7 — Sprint completion gate

Run the full §15.7 checks per [CLAUDE.md](../../../CLAUDE.md). All must pass with zero errors AND zero warnings.

### Task 7.1 — Full quality gate

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: zero failures.

- [ ] **Step 2: Run the production build**

```bash
pnpm build
```

Expected: zero TypeScript errors.

- [ ] **Step 3: Run lint + format**

```bash
pnpm biome check
```

Expected: zero warnings.

- [ ] **Step 4: Manual smoke test**

Run `pnpm dev` and walk through the smoke script from spec §10.3:

1. Drag a Heading onto the right edge of an existing Section → side-by-side layout appears.
2. Resize a Column past its Row's right edge → handle stops at edge, "Bounded by parent" tooltip appears after a moment.
3. Shrink a Row that contains two 60% / 40% Columns → both Columns shrink proportionally, no error.
4. Drag the same wide child OUT of its parent and into a wider container → drag succeeds (no clamp during DnD).
5. Toggle Show Component Types off, then on → outlines and labels appear/disappear; layout does not shift.
6. Switch to Preview → all overlays, outlines, labels disappear; sections collapse with no gaps; deployed-mode parity confirmed.
7. Delete one half of a side-by-side pair → FlowGroup auto-dissolves; surviving child reflows as a normal vertical section.

If any step fails, treat the failure as a Phase 7 task: fix, retest, and re-run §15.7 before declaring complete.

- [ ] **Step 5: Final commit**

```bash
git commit --allow-empty -m "chore: x-axis resize + edit overlays — sprint complete (gate passed)"
```

---

## Out-of-Scope Reminders

These are explicitly NOT in this plan (see spec §2):

- Multi-select / group resize.
- Keyboard shortcut for the toggle.
- Persisting the toggle state.
- New AI-edit Operations for FlowGroup (the engine creates them; AI-edit fixtures continue working unchanged).
- Mobile / responsive editor.
- Surfacing FlowGroup in the layer tree as an advanced debug view.

If a task surfaces a reason any of these become necessary, raise a Deviation per [CLAUDE.md](../../../CLAUDE.md) §15.8 — do not silently expand scope.
