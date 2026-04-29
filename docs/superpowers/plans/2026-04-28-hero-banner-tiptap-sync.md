# HeroBanner — TipTap / EditPanel sync, active-field indicator, edit-mode pause toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every text field in HeroBanner editable via both inline TipTap and the left edit panel with no sync gaps; render the banner heading via TipTap (drop rotation when formatted); add a subtle active-field indicator on every TipTap-active slot; add a topbar pause toggle that stops the slideshow in edit mode (and auto-pauses when the banner is selected).

**Architecture:** Reuse existing primitives — `EditableTextSlot` for inline editing, `RichTextMirror` for panel editing, the deep-patch `buildWritePatch` callback for array-index writes. Add four optional rich-text fields to the slide schema. Move heading rendering from the layouts down into `SlideContent`. Add `slideshowPaused` to the editor store mirroring `showComponentTypes`, with the slideshow hook subscribing to it plus `selectedComponentId` to auto-pause when the banner is selected.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Zustand for editor state, Zod for schema, @tiptap/react, lucide-react icons, Tailwind via shadcn `cn()` helper, Vitest for unit tests. Per [CLAUDE.md](../../../CLAUDE.md) §15: no `any`, kebab-case files, conventional commits, tests + build + biome must pass at sprint completion.

**Spec:** [docs/superpowers/specs/2026-04-28-hero-banner-tiptap-sync-design.md](../specs/2026-04-28-hero-banner-tiptap-sync-design.md)

---

## Conventions

### Test fixture style

Existing HeroBanner tests inline-build `ComponentNode` via a local `makeNode(props)` helper and inspect the rendered DOM via a `getRoot(container)` querySelector ([__tests__/HeroBanner.test.tsx:6-12](../../../apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx#L6-L12)). EditPanel tests use a `makeFixtureConfig(heroProps)` plus a `PanelHost` component that subscribes to the store and re-renders on prop changes ([__tests__/EditPanel.test.tsx:8-75](../../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx#L8-L75)). Match these patterns — do NOT introduce shared test helpers.

### Mid-task quality gates

Per [CLAUDE.md](../../../CLAUDE.md) "Token economy" section, run targeted verification after each task:

- Type-only / structural edits: `pnpm typecheck` + `pnpm biome check`.
- Logic edits: `pnpm test path/to/test-file.test.tsx`.
- Final task in each section: full `pnpm test` for the affected directory.

Full `pnpm test` + `pnpm build` + smoke test only at the end of the whole plan, per §15.7.

### Commit style

Conventional commits per [CLAUDE.md](../../../CLAUDE.md) §15.4: `feat(hero):`, `fix(hero):`, `feat(editor):`, `refactor(hero):`. One concern per commit. The plan groups commits by section.

### Pre-commit hooks

Do NOT use `--no-verify`. Fix the underlying issue if a hook fails.

---

## File Structure (created or modified)

### New files

- `apps/web/components/editor/topbar/PauseSlideshowToggle.tsx` — topbar button mirroring `ShowComponentTypesToggle`.
- `apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx` — toggle unit tests.
- `apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx` — active-field indicator tests.

### Modified files

- `apps/web/lib/editor-state/types.ts` — add `slideshowPaused: boolean` to `EditorState`; add `toggleSlideshowPaused` to `EditorActions`.
- `apps/web/lib/editor-state/store.ts` — initial value `false`; action; reset in `__resetEditorStoreForTests` and `hydrate`.
- `apps/web/lib/editor-state/__tests__/store.test.ts` — coverage for the new flag + action.
- `apps/web/components/editor/topbar/TopBar.tsx` — render `<PauseSlideshowToggle />` before `<ShowComponentTypesToggle />`.
- `apps/web/components/renderer/TipTapEditableSlot.tsx` — add active-field outline + transparent white background to wrapping `<Tag>`.
- `apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx` — swap heading / subheading / ctaLabel / secondaryCtaLabel from `<TextInput>` to `<RichTextMirror>`.
- `apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx` — extend with RichTextMirror sync coverage.
- `apps/web/components/site-components/HeroBanner/schema.ts` — add `richHeading`, `richSubheading`, `richCtaLabel`, `richSecondaryCtaLabel` to `slideContentFieldsSchema`.
- `apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx` — remove `headingSlot`; new `decideHeadingRender(...)` local; switch slide overrides to `EditableTextSlot` with array-index `buildWritePatch`. Take `slideIndex` prop.
- `apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx` — drop `heading` ReactNode; pass `slideIndex` and `prefersReducedMotion` through to `SlideContent`.
- `apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx` — same.
- `apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx` — same; delete `headingNode()` helper.
- `apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx` — `useHeroSlideshow` accepts `nodeId`, subscribes to store flags, returns composed `paused`.
- `apps/web/components/site-components/registry.ts` — add four `kind: "array"` text-field descriptors for HeroBanner per-slide rich fields.
- `apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx` — `ContentFields` swaps four `<TextInput>` to `<RichTextMirror>`; pass through `rawRichHeading`, etc., from each slide entry.
- `apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx` — update assertions where heading rendering changes.
- `apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx` — add per-slide rich-field render assertions; rotator-skipped-when-formatted test.

---

## Section A — Item 5: Edit-mode pause toggle

Lands first because it's purely additive and proves the topbar wiring before bigger changes.

### Task A.1: Add `slideshowPaused` flag to editor store types

**Files:**
- Modify: `apps/web/lib/editor-state/types.ts`

- [ ] **Step 1: Edit `types.ts` — add the state field**

Open [apps/web/lib/editor-state/types.ts](../../../apps/web/lib/editor-state/types.ts). Find the `EditorState` type (around line 65-84). Add a new field directly under `showComponentTypes`:

```ts
  // Phase 6 Task 6.1 — transient toggle, defaults ON each editor load (no persistence).
  showComponentTypes: boolean;
  // Editor-only: pause every HeroBanner slideshow on the canvas. Transient,
  // defaults OFF each editor load (no persistence). Mirrors the
  // showComponentTypes pattern. Visitor renders ignore this flag.
  slideshowPaused: boolean;
  // Rich-text Phase 1 — null when the floating rich-text toolbar is closed.
  textEditingScope: TextEditingScope | null;
```

- [ ] **Step 2: Add the action**

Find the `EditorActions` type. Below `toggleShowComponentTypes` (which doesn't exist as a typed line — search for `toggleShowComponentTypes` or insert near other transient toggles). Looking at existing pattern, add after the `// Phase 6 Task 6.1 — toggle the canvas-wide component type overlay.` block in `EditorActions`. Find the line `toggleShowComponentTypes: () => void;` (it's around line 159) and add directly below it:

```ts
  // Phase 6 Task 6.1 — toggle the canvas-wide component type overlay.
  toggleShowComponentTypes: () => void;
  // Editor-only — flip the slideshow pause flag for every HeroBanner.
  toggleSlideshowPaused: () => void;
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: FAIL with "Property 'slideshowPaused' is missing in type ..." — pointing at the store creator. Confirms the type addition reached the store.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/editor-state/types.ts
git commit -m "feat(editor-state): add slideshowPaused to EditorState types"
```

### Task A.2: Implement `slideshowPaused` in the store

**Files:**
- Modify: `apps/web/lib/editor-state/store.ts`
- Test: `apps/web/lib/editor-state/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

Open [apps/web/lib/editor-state/__tests__/store.test.ts](../../../apps/web/lib/editor-state/__tests__/store.test.ts). Add a new `describe` block at the bottom of the file (before the final closing `});` if any, or at end):

```ts
describe("slideshowPaused", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("defaults to false", () => {
    expect(useEditorStore.getState().slideshowPaused).toBe(false);
  });

  it("toggleSlideshowPaused flips the flag", () => {
    const { toggleSlideshowPaused } = useEditorStore.getState();
    toggleSlideshowPaused();
    expect(useEditorStore.getState().slideshowPaused).toBe(true);
    toggleSlideshowPaused();
    expect(useEditorStore.getState().slideshowPaused).toBe(false);
  });

  it("hydrate resets the flag to false", () => {
    useEditorStore.getState().toggleSlideshowPaused();
    expect(useEditorStore.getState().slideshowPaused).toBe(true);
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "w",
      initialConfig: {
        meta: { siteName: "x", siteSlug: "x" },
        brand: { palette: "ocean", fontFamily: "Inter" },
        global: {
          navBar: { links: [], logoPlacement: "left", sticky: false },
          footer: { columns: [], copyright: "" },
        },
        pages: [],
        forms: [],
      },
    });
    expect(useEditorStore.getState().slideshowPaused).toBe(false);
  });
});
```

If `beforeEach` and `__resetEditorStoreForTests` aren't already imported at the top, ensure they are. Existing tests already use them, so the import block at the top should already cover this.

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test apps/web/lib/editor-state/__tests__/store.test.ts -t slideshowPaused`
Expected: FAIL — `slideshowPaused` and `toggleSlideshowPaused` don't exist yet.

- [ ] **Step 3: Implement in store**

Open [apps/web/lib/editor-state/store.ts](../../../apps/web/lib/editor-state/store.ts). Find the initial-state block around line 71 (after `showComponentTypes: false,`). Add:

```ts
  showComponentTypes: false,
  // Editor-only slideshow pause flag. Transient — visitor renders ignore it.
  slideshowPaused: false,
  textEditingScope: null,
```

Find `toggleShowComponentTypes` action (around line 390). Add directly below it:

```ts
  toggleShowComponentTypes: () =>
    set((state) => ({ showComponentTypes: !state.showComponentTypes })),

  toggleSlideshowPaused: () =>
    set((state) => ({ slideshowPaused: !state.slideshowPaused })),
```

Find `__resetEditorStoreForTests` (around line 462). In the `useEditorStore.setState({...})` call, add `slideshowPaused: false,` next to `showComponentTypes: false,`.

Find `hydrate` (around line 76). In the `set({...})` payload, add `slideshowPaused: false,` after `textEditingScope: null,`.

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test apps/web/lib/editor-state/__tests__/store.test.ts -t slideshowPaused`
Expected: PASS, all 3 cases.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/editor-state/store.ts apps/web/lib/editor-state/__tests__/store.test.ts
git commit -m "feat(editor-state): implement slideshowPaused flag and toggle action"
```

### Task A.3: Build `PauseSlideshowToggle` component

**Files:**
- Create: `apps/web/components/editor/topbar/PauseSlideshowToggle.tsx`
- Create: `apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx`:

```tsx
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PauseSlideshowToggle } from "../PauseSlideshowToggle";

describe("PauseSlideshowToggle", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("flips the store flag on click", () => {
    render(<PauseSlideshowToggle />);
    expect(useEditorStore.getState().slideshowPaused).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow|resume slideshow/i }));
    expect(useEditorStore.getState().slideshowPaused).toBe(true);
  });

  it("uses the orange-400 active styling when paused", () => {
    render(<PauseSlideshowToggle />);
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow/i }));
    const btn = screen.getByRole("button", { name: /resume slideshow/i });
    expect(btn.className).toMatch(/text-orange-400/);
  });

  it("aria-pressed reflects the flag", () => {
    render(<PauseSlideshowToggle />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `apps/web/components/editor/topbar/PauseSlideshowToggle.tsx`:

```tsx
"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

// Editor-only slideshow pause toggle. When ON, every HeroBanner on the
// canvas freezes on its current slide — useful when editing a slide's
// text without it cycling away. Defaults OFF each editor load (no
// persistence), mirrors ShowComponentTypesToggle's shape.
export function PauseSlideshowToggle() {
  const paused = useEditorStore((s) => s.slideshowPaused);
  const toggle = useEditorStore((s) => s.toggleSlideshowPaused);
  const label = paused ? "Resume slideshow" : "Pause slideshow";
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={paused}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        paused
          ? "bg-zinc-800 text-orange-400"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx`
Expected: PASS, all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/topbar/PauseSlideshowToggle.tsx apps/web/components/editor/topbar/__tests__/PauseSlideshowToggle.test.tsx
git commit -m "feat(topbar): add PauseSlideshowToggle component"
```

### Task A.4: Mount the toggle in TopBar

**Files:**
- Modify: `apps/web/components/editor/topbar/TopBar.tsx`

- [ ] **Step 1: Edit TopBar.tsx**

Open [apps/web/components/editor/topbar/TopBar.tsx](../../../apps/web/components/editor/topbar/TopBar.tsx). Add the import alongside `ShowComponentTypesToggle`:

```tsx
import { PauseSlideshowToggle } from "./PauseSlideshowToggle";
import { ShowComponentTypesToggle } from "./ShowComponentTypesToggle";
```

In the JSX, insert the toggle directly before `<ShowComponentTypesToggle />`:

```tsx
      <div className="ml-auto flex items-center gap-3">
        <SaveIndicator />
        <PauseSlideshowToggle />
        <ShowComponentTypesToggle />
        <PreviewToggle />
        <DeployButton />
      </div>
```

- [ ] **Step 2: Run typecheck + biome**

Run: `pnpm typecheck && pnpm biome check apps/web/components/editor/topbar/TopBar.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/topbar/TopBar.tsx
git commit -m "feat(topbar): mount PauseSlideshowToggle next to X-ray toggle"
```

### Task A.5: Wire the pause flag into `useHeroSlideshow`

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx`

- [ ] **Step 1: Update `useHeroSlideshow` signature**

Open [apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx). Replace the existing `useHeroSlideshow` hook body. The new version takes `nodeId` and reads two store flags:

```tsx
"use client";

import { useRenderMode } from "@/components/renderer/RenderModeContext";
import { useEditorStore } from "@/lib/editor-state";
import { type CSSProperties, type RefObject, useCallback, useRef, useState } from "react";
import { KenBurns } from "../effects/KenBurns";
import { Parallax } from "../effects/Parallax";
import { useSlideshow } from "../hooks/useSlideshow";
import { useSwipe } from "../hooks/useSwipe";
import type { HeroBannerData } from "../schema";
import { ImageSlide } from "../slides/ImageSlide";
import { VideoSlide } from "../slides/VideoSlide";
import { Crossfade } from "../transitions/Crossfade";
import { FadeUp } from "../transitions/FadeUp";
import { SlideHorizontal } from "../transitions/SlideHorizontal";
import { Zoom } from "../transitions/Zoom";
import type { SlideRenderEntry, SlideTransitionKind } from "../transitions/types";

// Hook that returns everything a layout needs to render a slideshow:
// state, mouse handlers (for pause-on-hover), the pre-built SlideRenderEntry
// list, and controls. Each layout composes the rest of its DOM around this.
//
// Edit-mode pause: when the global slideshowPaused flag is on, OR this
// banner is the currently-selected component, the slideshow freezes on
// its active slide. Visitor renders ignore both flags.
export function useHeroSlideshow(
  data: HeroBannerData,
  prefersReducedMotion: boolean,
  nodeId: string,
  swipeTargetRef?: RefObject<HTMLElement | null>,
) {
  const [hoverPaused, setHoverPaused] = useState(false);
  const mode = useRenderMode();
  const globalPaused = useEditorStore((s) => s.slideshowPaused);
  const selectedId = useEditorStore((s) => s.selectedComponentId);

  const videoDurationsRef = useRef<Record<number, number>>({});
  const activeIndexRef = useRef(0);

  const getDwellMsOverride = useCallback((): number | null => {
    const i = activeIndexRef.current;
    const known = videoDurationsRef.current[i];
    return known ?? null;
  }, []);

  const hoverContribution = data.pauseOnHover ? hoverPaused : false;
  const editorContribution = mode === "edit" ? globalPaused || selectedId === nodeId : false;
  const paused = hoverContribution || editorContribution;

  const { index, goTo, next, prev } = useSlideshow({
    count: data.images.length,
    autoplay: data.autoplay,
    intervalMs: data.intervalMs,
    loop: data.loop,
    paused,
    prefersReducedMotion,
    getDwellMsOverride,
  });

  activeIndexRef.current = index;

  const handleVideoDuration = useCallback((slideIndex: number, durationMs: number) => {
    videoDurationsRef.current[slideIndex] = durationMs;
  }, []);

  const renderEntries: SlideRenderEntry[] = data.images.map((slide, i) => ({
    key: String(i),
    render: (style: CSSProperties) =>
      slide.kind === "image" ? (
        <KenBurns
          enabled={data.kenBurns}
          intervalMs={data.intervalMs}
          prefersReducedMotion={prefersReducedMotion}
        >
          <Parallax enabled={data.parallax} prefersReducedMotion={prefersReducedMotion}>
            <ImageSlide slide={slide} index={i} isFirst={i === 0} style={style} />
          </Parallax>
        </KenBurns>
      ) : (
        <VideoSlide
          slide={slide}
          index={i}
          prefersReducedMotion={prefersReducedMotion}
          onDurationKnown={(ms) => handleVideoDuration(i, ms)}
          style={style}
        />
      ),
  }));

  const mouseHandlers = data.pauseOnHover
    ? {
        onMouseEnter: () => setHoverPaused(true),
        onMouseLeave: () => setHoverPaused(false),
      }
    : {};

  useSwipe({
    ref: swipeTargetRef ?? { current: null },
    onSwipeLeft: data.images.length > 1 ? next : undefined,
    onSwipeRight: data.images.length > 1 ? prev : undefined,
  });

  return { index, goTo, next, prev, renderEntries, mouseHandlers };
}
```

(The rest of the file — `SlideshowSlides`, `SlideshowControls`, dot/arrow style constants — is unchanged.)

- [ ] **Step 2: Pass `node.id` from each layout**

Open [apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx). Find the `useHeroSlideshow(data, prefersReducedMotion, sectionRef)` call (around line 111). Change to:

```tsx
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
    sectionRef,
  );
```

Open [apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx). Find the `useHeroSlideshow(data, prefersReducedMotion)` call (around line 125). Change to:

```tsx
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
  );
```

Open [apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx). Find the `useHeroSlideshow(data, prefersReducedMotion)` call (around line 96). Change to:

```tsx
  const { index, goTo, next, prev, renderEntries, mouseHandlers } = useHeroSlideshow(
    data,
    prefersReducedMotion,
    node.id,
  );
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Run hero banner test suite**

Run: `pnpm test apps/web/components/site-components/HeroBanner`
Expected: PASS — no test should depend on the old hook signature, but verify.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx
git commit -m "feat(hero): wire slideshowPaused + selected-banner auto-pause into useHeroSlideshow"
```

### Task A.6: Coverage test for the auto-pause behavior

**Files:**
- Test: `apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx`

- [ ] **Step 1: Add a test for global pause + selected-id auto-pause**

Open [apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx). At the end of the file, add a new `describe` block:

```tsx
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { RenderModeProvider } from "@/components/renderer/RenderModeContext";

describe("<HeroBanner> — edit-mode pause", () => {
  beforeEach(() => __resetEditorStoreForTests());
  afterEach(() => vi.useRealTimers());

  it("freezes on slide 0 when slideshowPaused is true (edit mode)", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeProvider value="edit">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().toggleSlideshowPaused();
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("freezes when this banner is the selected component (edit mode)", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeProvider value="edit">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().selectComponent("cmp_hero");
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("0");
  });

  it("ignores slideshowPaused in preview mode", () => {
    vi.useFakeTimers();
    const { container } = render(
      <RenderModeContext.Provider value="preview">
        <HeroBanner
          node={makeNode({
            heading: "X",
            autoplay: true,
            intervalMs: 1000,
            images: [
              { src: "https://x/1.png", alt: "1" },
              { src: "https://x/2.png", alt: "2" },
            ],
          })}
          cssStyle={{}}
        />
      </RenderModeProvider>,
    );
    act(() => {
      useEditorStore.getState().toggleSlideshowPaused();
    });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    const root = requireRoot(container);
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
  });
});
```

If `vi` and `act` aren't already imported at the top of the file, ensure they are: `import { act, fireEvent, render } from "@testing-library/react";` and `import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";`.

- [ ] **Step 2: Run the new tests**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx -t "edit-mode pause"`
Expected: PASS, all 3 cases.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx
git commit -m "test(hero): cover slideshow auto-pause on global flag and banner selection"
```

---

## Section B — Item 4: Active-field visual indicator

Lands second because it's a single-file edit on `TipTapEditableSlot` and unblocks visual feedback for everything that follows.

### Task B.1: Add active-field outline + transparent white background

**Files:**
- Modify: `apps/web/components/renderer/TipTapEditableSlot.tsx`
- Create: `apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx`:

```tsx
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { RenderModeProvider } from "../RenderModeContext";
import { TipTapEditableSlot } from "../TipTapEditableSlot";

describe("<TipTapEditableSlot> — active-field indicator", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("renders a 1px white-outline + transparent white background on the wrapping tag", () => {
    act(() => {
      useEditorStore.getState().enterTextEditing("cmp_x", "text");
    });
    const { container } = render(
      <RenderModeProvider value="edit">
        <TipTapEditableSlot
          nodeId="cmp_x"
          propKey="text"
          richKey="richText"
          doc={undefined}
          fallback="hi"
          profile="block"
          fullProps={{ text: "hi" }}
          as="h1"
        />
      </RenderModeProvider>,
    );
    const wrapper = container.querySelector("h1");
    expect(wrapper).not.toBeNull();
    const style = wrapper?.getAttribute("style") ?? "";
    expect(style).toContain("outline");
    expect(style).toContain("rgba(255, 255, 255, 0.5)");
    expect(style).toContain("rgba(255, 255, 255, 0.06)");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx`
Expected: FAIL — outline + rgba styles aren't applied yet.

- [ ] **Step 3: Add the indicator styles**

Open [apps/web/components/renderer/TipTapEditableSlot.tsx](../../../apps/web/components/renderer/TipTapEditableSlot.tsx). Find the JSX return (around line 127-138). Update the wrapping `<Tag>` to merge an indicator style:

```tsx
  const Tag = (as ?? "div") as ElementType;
  // Active-field indicator: when this slot is mounted (i.e., the user is
  // actively editing here), draw a subtle 1px white outline + a slight
  // translucent white background. Visible from the FIRST right-click
  // because TipTapEditableSlot mounts in the same render tick the
  // textEditingScope is set.
  const indicatorStyle: CSSProperties = {
    outline: "1px solid rgba(255, 255, 255, 0.5)",
    outlineOffset: "2px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  };
  const composedStyle: CSSProperties = { ...indicatorStyle, ...(style ?? {}) };
  return (
    <Tag
      {...(passthroughAttrs ?? {})}
      style={composedStyle}
      className={className}
      onPointerDown={swallowPointer}
      onMouseDown={swallowPointer}
    >
      <EditorContent editor={editor} />
    </Tag>
  );
```

The user-supplied `style` overrides the indicator if there's a conflict (good — heading sizing wins), but our bg + outline are normally additive.

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full renderer suite to catch regressions**

Run: `pnpm test apps/web/components/renderer`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/renderer/TipTapEditableSlot.tsx apps/web/components/renderer/__tests__/TipTapEditableSlot.test.tsx
git commit -m "feat(renderer): add active-field outline + transparent white bg to TipTapEditableSlot"
```

---

## Section C — Item 3: Banner-level CtaSection RichTextMirror swap

Lands third — converts the heading/subheading/ctaLabel/secondaryCtaLabel panel inputs from plain `<TextInput>` to `<RichTextMirror>` so panel typing stays in lockstep with rich docs. No schema or rendering changes — purely an EditPanel swap. The same shape Heading/Paragraph already use.

### Task C.1: Replace TextInput with RichTextMirror in CtaSection

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx`

- [ ] **Step 1: Replace the four text fields**

Open [apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx](../../../apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx). Replace the file contents with:

```tsx
"use client";

import { HrefInput } from "@/components/editor/edit-panels/controls/HrefInput";
import { RichTextMirror } from "@/components/editor/edit-panels/controls/RichTextMirror";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { type SectionProps, readString } from "./utils";

// Wave 2 CtaSection holds heading + sub-heading + (single) CTA + the static
// background image URL. Heading / subheading / CTA labels use RichTextMirror
// so panel edits stay in lockstep with the canvas's TipTap docs:
// `RichTextMirror.handlePlainChange` writes both the plain key AND a
// synthesized rich doc. When formatting exists, the panel switches to a
// read-only mirror with an "Edit as plain text" escape hatch.
export function CtaSection({ node, writePartial }: SectionProps) {
  return (
    <>
      <RichTextMirror
        fieldId="hero-heading"
        fieldLabel="Heading"
        plainKey="heading"
        richKey="richHeading"
        plain={readString(node.props, "heading")}
        rawRich={node.props.richHeading}
        profile="block"
        writePartial={writePartial}
      />
      <RichTextMirror
        fieldId="hero-subheading"
        fieldLabel="Sub-heading"
        plainKey="subheading"
        richKey="richSubheading"
        plain={readString(node.props, "subheading")}
        rawRich={node.props.richSubheading}
        profile="block"
        writePartial={writePartial}
      />
      <RichTextMirror
        fieldId="hero-cta-label"
        fieldLabel="CTA label"
        plainKey="ctaLabel"
        richKey="richCtaLabel"
        plain={readString(node.props, "ctaLabel")}
        rawRich={node.props.richCtaLabel}
        profile="inline"
        writePartial={writePartial}
      />
      <HrefInput
        id="hero-cta-href"
        label="CTA link"
        value={readString(node.props, "ctaHref", "#")}
        testId="hero-cta-href"
        tooltip="Where the primary CTA button links to. Pick a page in the site, or enter an external URL."
        onChange={(next) => writePartial({ ctaHref: next })}
      />
      <RichTextMirror
        fieldId="hero-secondary-cta-label"
        fieldLabel="Secondary CTA label"
        plainKey="secondaryCtaLabel"
        richKey="richSecondaryCtaLabel"
        plain={readString(node.props, "secondaryCtaLabel")}
        rawRich={node.props.richSecondaryCtaLabel}
        profile="inline"
        writePartial={writePartial}
      />
      <HrefInput
        id="hero-secondary-cta-href"
        label="Secondary CTA link"
        value={readString(node.props, "secondaryCtaHref")}
        testId="hero-secondary-cta-href"
        tooltip="Where the secondary CTA links to. Pick a page in the site, or enter an external URL."
        onChange={(next) => writePartial({ secondaryCtaHref: next === "" ? undefined : next })}
      />
      <TextInput
        id="hero-bg-image"
        label="Background image URL"
        value={readString(node.props, "backgroundImage")}
        placeholder="https://... (used when no slides are added)"
        testId="hero-bg-image"
        tooltip="Static background image — used only when the slideshow has no slides."
        onChange={(next) => writePartial({ backgroundImage: next === "" ? undefined : next })}
      />
    </>
  );
}
```

Notes:
- `richSecondaryCtaLabel` is a new prop key. The schema already accepts unknown extra props (Zod's default for `z.object` strips unknown keys). To keep this prop persisted, also extend `heroBannerPropsSchema` to declare it (Task C.2).
- `placeholder` and `tooltip` props on `TextInput` were nice-to-haves; `RichTextMirror` doesn't support them. Acceptable trade-off — the panel section already labels each field clearly.

- [ ] **Step 2: Run typecheck + biome**

Run: `pnpm typecheck && pnpm biome check apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx`
Expected: PASS.

- [ ] **Step 3: DO NOT COMMIT YET**

C.1 leaves `richSecondaryCtaLabel` undeclared in the schema — Zod will strip it on parse, breaking the round-trip. Task C.2 fixes that before commit.

### Task C.2: Add `richSecondaryCtaLabel` to the banner schema

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/schema.ts`

- [ ] **Step 1: Add the field**

Open [apps/web/components/site-components/HeroBanner/schema.ts](../../../apps/web/components/site-components/HeroBanner/schema.ts). Find the `heroBannerPropsSchema` block (around line 112). Add `richSecondaryCtaLabel` next to `secondaryCtaLabel`:

```ts
  // v2 — dual-CTA banner-level secondary
  secondaryCtaLabel: z.string().optional(),
  richSecondaryCtaLabel: richTextDocSchema.optional(),
  secondaryCtaHref: z.string().optional(),
```

- [ ] **Step 2: Add `secondaryCtaLabel` to the registry textFields entry for HeroBanner**

Open [apps/web/components/site-components/registry.ts](../../../apps/web/components/site-components/registry.ts). Find the HeroBanner `textFields` block (around line 216). Add a fourth flat descriptor at the end of the existing list:

```ts
      textFields: [
        { propKey: "heading", richKey: "richHeading", label: "Hero heading", profile: "block" },
        {
          propKey: "subheading",
          richKey: "richSubheading",
          label: "Hero subheading",
          profile: "block",
        },
        {
          propKey: "ctaLabel",
          richKey: "richCtaLabel",
          label: "CTA label",
          profile: "inline",
        },
        {
          propKey: "secondaryCtaLabel",
          richKey: "richSecondaryCtaLabel",
          label: "Secondary CTA label",
          profile: "inline",
        },
      ],
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit C.1 + C.2 together**

```bash
git add apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx apps/web/components/site-components/HeroBanner/schema.ts apps/web/components/site-components/registry.ts
git commit -m "feat(hero): use RichTextMirror for banner-level heading/subheading/CTA labels"
```

### Task C.3: Coverage tests for bidirectional sync

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx`

- [ ] **Step 1: Add `describe` block for RichTextMirror behavior**

Open [apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx). Add at the end:

```tsx
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";

describe("<HeroBannerEditPanel> — RichTextMirror bidirectional sync", () => {
  it("writes both plain and rich keys when the user types in the heading textarea", () => {
    hydrateWith({ heading: "" });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    const textarea = screen.getByTestId("hero-heading");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    const after = getNode("cmp_hero").props;
    expect(after.heading).toBe("Hello");
    expect(after.richHeading).toEqual(synthesizeDoc("Hello", "block"));
  });

  it("shows the read-only mirror when richHeading has formatting", () => {
    hydrateWith({
      heading: "Hello",
      richHeading: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
          },
        ],
      },
    });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    expect(screen.getByTestId("hero-heading-formatted-badge")).toBeInTheDocument();
    expect(screen.getByTestId("hero-heading-readonly")).toHaveTextContent("Hello");
    expect(screen.queryByTestId("hero-heading")).toBeNull();
  });

  it("re-renders heading textarea after a TipTap-style write to richHeading + heading", () => {
    hydrateWith({ heading: "" });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    expect((screen.getByTestId("hero-heading") as HTMLTextAreaElement).value).toBe("");
    act(() => {
      useEditorStore.getState().setComponentProps("cmp_hero", {
        heading: "Inline edit",
        richHeading: synthesizeDoc("Inline edit", "block"),
      });
    });
    expect((screen.getByTestId("hero-heading") as HTMLTextAreaElement).value).toBe("Inline edit");
  });
});
```

If the file's existing imports lack `act`, ensure: `import { act, fireEvent, render, screen } from "@testing-library/react";`.

- [ ] **Step 2: Run the new tests**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx -t "RichTextMirror bidirectional sync"`
Expected: PASS, all 3 cases.

- [ ] **Step 3: Run the full EditPanel test file to catch regressions**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx`
Expected: PASS — existing tests for the heading TextInput will need the testId update. The previous `data-testid="hero-heading"` was on a `<input>`; it's now on a `<textarea>` rendered by `RichTextMirror`. Both accept `fireEvent.change`, so the existing tests should still work. If a test asserts the element's tagName or input-specific attribute, update it to match the new textarea.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx
git commit -m "test(hero): cover RichTextMirror bidirectional sync in CtaSection"
```

---

## Section D — Item 1: Banner heading via TipTap (drop rotation when formatted)

Lands fourth because it touches three layouts plus `SlideContent`'s rendering decision tree. Section C must land first so the panel for the heading already writes both keys.

### Task D.1: Add a `decideHeadingRender` helper inside SlideContent

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx`

- [ ] **Step 1: Replace the file with the new shape**

Open [apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx](../../../apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx). Replace its contents with:

```tsx
"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { RichTextDoc } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties, ReactNode } from "react";
import { RotatingHeading } from "../effects/RotatingHeading";
import type { HeroBannerData, Slide } from "../schema";

export type SlideContentProps = {
  node: ComponentNode;
  data: HeroBannerData;
  // Optional active slide. When provided, per-slide overrides apply with
  // banner-level fallback per the spec's Feature 1 fallback rule.
  slide?: Slide;
  // Index of `slide` within `data.images`. Required when `slide` is given —
  // the EditableTextSlot deep-patch builders need it to write back to the
  // correct array element.
  slideIndex?: number;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

// Per-slide overrides take precedence; when missing, fall back to the
// banner-level field; when both are missing, hide the field entirely.
function pickString(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

// Heading render decision (Item 1 of the design):
//  1. Rich content path — `richHeading` exists AND differs from
//     synthesizeDoc(plain, "block"). Render TipTap. No rotation.
//  2. Rotator path — no rich formatting AND plain string contains
//     "{rotator}" AND rotatingWords is non-empty. Render RotatingHeading
//     read-only.
//  3. Plain TipTap path — default. Render TipTap, no rotation.
type HeadingDecision =
  | { kind: "rich" }
  | { kind: "rotator"; plain: string; rotatingWords: readonly string[] }
  | { kind: "plain" };

function decideHeadingRender(
  plain: string,
  rich: RichTextDoc | undefined,
  rotatingWords: readonly string[] | undefined,
): HeadingDecision {
  if (rich !== undefined) {
    const synthesized = synthesizeDoc(plain, "block");
    if (JSON.stringify(rich) !== JSON.stringify(synthesized)) {
      return { kind: "rich" };
    }
  }
  if (
    plain.includes("{rotator}") &&
    rotatingWords !== undefined &&
    rotatingWords.length > 0
  ) {
    return { kind: "rotator", plain, rotatingWords };
  }
  return { kind: "plain" };
}

export function SlideContent({
  node,
  data,
  slide,
  slideIndex,
  contentStyle,
  ctaStyle,
  prefersReducedMotion,
}: SlideContentProps) {
  const subheading = pickString(slide?.subheading, data.subheading);
  const ctaLabel = pickString(slide?.ctaLabel, data.ctaLabel);
  const ctaHref = pickString(slide?.ctaHref, data.ctaHref);
  const secondaryCtaLabel = pickString(slide?.secondaryCtaLabel, data.secondaryCtaLabel);
  const secondaryCtaHref = pickString(slide?.secondaryCtaHref, data.secondaryCtaHref);

  const align = slide?.align;
  const verticalAlign = slide?.verticalAlign;
  const composedContentStyle: CSSProperties = {
    ...contentStyle,
    ...(align ? { alignItems: alignToFlex(align), textAlign: align } : {}),
    ...(verticalAlign ? { justifyContent: vAlignToFlex(verticalAlign) } : {}),
  };

  const headingNode = renderHeading({
    node,
    data,
    slide,
    slideIndex,
    prefersReducedMotion,
  });

  const subheadingNode = subheading ? (
    slide?.subheading ? (
      <p style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}>{slide.subheading}</p>
    ) : (
      <EditableTextSlot
        nodeId={node.id}
        propKey="subheading"
        richKey="richSubheading"
        doc={data.richSubheading}
        fallback={data.subheading}
        fullProps={node.props}
        profile="block"
        as="p"
        style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}
      />
    )
  ) : null;

  const secondaryCtaStyle: CSSProperties = {
    ...ctaStyle,
    background: "transparent",
    color: ctaStyle.color ?? "#0f3a5f",
    border: `2px solid ${ctaStyle.color ?? "#0f3a5f"}`,
  };

  return (
    <div style={composedContentStyle}>
      {headingNode}
      {subheadingNode}
      {(ctaLabel || secondaryCtaLabel) && (
        <div data-hero-cta-row="true" style={{ display: "flex", gap: 12 }}>
          {ctaLabel ? (
            <a href={ctaHref || "#"} data-hero-cta="primary" style={ctaStyle}>
              {slide?.ctaLabel ? (
                ctaLabel
              ) : (
                <EditableTextSlot
                  nodeId={node.id}
                  propKey="ctaLabel"
                  richKey="richCtaLabel"
                  doc={data.richCtaLabel}
                  fallback={data.ctaLabel}
                  fullProps={node.props}
                  profile="inline"
                  as="span"
                />
              )}
            </a>
          ) : null}
          {secondaryCtaLabel ? (
            <a href={secondaryCtaHref || "#"} data-hero-cta="secondary" style={secondaryCtaStyle}>
              {secondaryCtaLabel}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function renderHeading({
  node,
  data,
  slide,
  slideIndex: _slideIndex,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
  prefersReducedMotion: boolean;
}): ReactNode {
  // Per-slide override path is added in Section E (Task E.2). For now, when
  // a slide.heading override is set we render plain text (existing behavior)
  // and leave the banner-level heading alone.
  if (slide?.heading) {
    return (
      <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{slide.heading}</h1>
    );
  }

  const decision = decideHeadingRender(
    data.heading,
    data.richHeading,
    data.rotatingWords,
  );
  const baseStyle: CSSProperties = { fontSize: "40px", fontWeight: 700, margin: 0 };

  if (decision.kind === "rotator") {
    return (
      <h1 style={baseStyle}>
        <RotatingHeading
          heading={decision.plain}
          rotatingWords={[...decision.rotatingWords]}
          prefersReducedMotion={prefersReducedMotion}
        />
      </h1>
    );
  }

  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="heading"
      richKey="richHeading"
      doc={data.richHeading}
      fallback={data.heading}
      fullProps={node.props}
      profile="block"
      as="h1"
      style={baseStyle}
    />
  );
}

function alignToFlex(a: "left" | "center" | "right"): CSSProperties["alignItems"] {
  if (a === "left") return "flex-start";
  if (a === "right") return "flex-end";
  return "center";
}

function vAlignToFlex(a: "top" | "center" | "bottom"): CSSProperties["justifyContent"] {
  if (a === "top") return "flex-start";
  if (a === "bottom") return "flex-end";
  return "center";
}
```

The `headingSlot` prop is gone. The layouts that used to construct it become simpler (Task D.2).

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: FAIL — the layouts still pass `headingSlot`. Fix in Task D.2.

### Task D.2: Strip `headingSlot` construction from each layout

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx`

- [ ] **Step 1: Update CenteredLayout**

Open [apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx). Make these changes:

1. Remove the `RotatingHeading` import (no longer used here):

```tsx
import { CountdownTimer } from "../effects/CountdownTimer";
import { CursorSpotlight } from "../effects/CursorSpotlight";
import { Particles } from "../effects/Particles";
// (removed) import { RotatingHeading } from "../effects/RotatingHeading";
```

2. Delete the `heading` ReactNode block (lines 41-49):

```tsx
  // (removed) const heading = (...);
```

3. Inside the no-images branch, change the SlideContent call:

```tsx
  if (data.images.length === 0) {
    return (
      <section ...>
        {particles}
        {data.backgroundImage ? overlay : null}
        {spotlight}
        <SlideContent
          node={node}
          data={data}
          contentStyle={contentStyle}
          ctaStyle={ctaStyle}
          prefersReducedMotion={prefersReducedMotion}
        />
        ...
      </section>
    );
  }
```

4. Update the slideshow branch to drop `heading` from props passed to `CenteredSlideshow` and from `CenteredSlideshow`'s signature. Inside `CenteredSlideshow`, change the `<SlideContent>` call to:

```tsx
        <SlideContent
          node={node}
          data={data}
          slide={data.images[index]}
          slideIndex={index}
          contentStyle={contentStyle}
          ctaStyle={ctaStyle}
          prefersReducedMotion={prefersReducedMotion}
        />
```

And drop `heading: React.ReactNode` from the `CenteredSlideshow` Props type.

- [ ] **Step 2: Update FullBleedLayout**

Open [apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx). Same shape as CenteredLayout:

1. Remove `RotatingHeading` import.
2. Delete the `heading` ReactNode block (lines 40-48).
3. In the no-images branch, drop `headingSlot={heading}` and add `prefersReducedMotion={prefersReducedMotion}` and `slideIndex={...}` (slideIndex is undefined for static no-slides path; pass nothing).
4. In `FullBleedSlideshow`, drop `heading` from its Props type and pass `slideIndex={index}` to SlideContent.

- [ ] **Step 3: Update SplitLayout**

Open [apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx). Changes:

1. Remove `RotatingHeading` import.
2. Delete the `headingNode()` helper at the bottom of the file (lines 195-205).
3. In `SplitStatic` and `SplitWithSlideshow`, delete the `const heading = headingNode(data, prefersReducedMotion)` line and stop passing `heading` to `<TextPanel>`. Pass `prefersReducedMotion` instead, and (in `SplitWithSlideshow`) pass `slideIndex={index}`.

`SplitStatic`'s `TextPanel` call becomes:

```tsx
      <TextPanel
        node={node}
        data={data}
        slide={undefined}
        slideIndex={undefined}
        contentStyle={contentStyle}
        ctaStyle={ctaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
```

`SplitWithSlideshow`'s `TextPanel` call becomes:

```tsx
      <TextPanel
        node={node}
        data={data}
        slide={data.images[index]}
        slideIndex={index}
        contentStyle={contentStyle}
        ctaStyle={ctaStyle}
        textOnLeft={textOnLeft}
        prefersReducedMotion={prefersReducedMotion}
      />
```

4. Update `TextPanel`'s props type — drop `heading: ReactNode`, add `slideIndex: number | undefined` and `prefersReducedMotion: boolean`. Update its `<SlideContent>` call:

```tsx
      <SlideContent
        node={node}
        data={data}
        slide={slide}
        slideIndex={slideIndex}
        contentStyle={textPanelContentStyle}
        ctaStyle={{ ...ctaStyle, background: "#0f3a5f", color: "#ffffff" }}
        prefersReducedMotion={prefersReducedMotion}
      />
```

5. Drop the `headingSlot` references entirely.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Run hero banner test suite**

Run: `pnpm test apps/web/components/site-components/HeroBanner`
Expected: Many pre-existing tests still pass. Some that asserted heading text via `RotatingHeading`-rendered output may need updating: in edit mode the heading is now rendered through `EditableTextSlot` → `RichTextRenderer` (since no editor is active), which still produces the same `<h1>` with the same text. Confirm by inspecting any failures and adjusting assertions to look for `<h1>` regardless of its inner wrapper.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx
git commit -m "feat(hero): render heading via EditableTextSlot; drop rotation when formatted"
```

### Task D.3: Coverage tests for the heading decision

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx`

- [ ] **Step 1: Add the new tests**

Open [apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx). Add at the end of the file:

```tsx
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";

describe("SlideContent — heading decision tree", () => {
  it("renders RotatingHeading when {rotator} token + rotatingWords present and no rich formatting", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hello {rotator} world",
          rotatingWords: ["beautiful"],
          autoplay: false,
          images: [],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    // RotatingHeading renders the surrounding text inside a <span> wrapper.
    expect(root?.querySelector("[data-hero-rotator]")).not.toBeNull();
  });

  it("DOES NOT animate the rotator when richHeading has formatting", () => {
    const formattedDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello {rotator} world", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Hello {rotator} world",
          richHeading: formattedDoc,
          rotatingWords: ["beautiful"],
          autoplay: false,
          images: [],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("[data-hero-rotator]")).toBeNull();
  });

  it("renders TipTap path (no RotatingHeading) when richHeading is plain (matches synthesize)", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Plain heading",
          richHeading: synthesizeDoc("Plain heading", "block"),
          autoplay: false,
          images: [],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Plain heading");
    expect(root?.querySelector("[data-hero-rotator]")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx -t "heading decision tree"`
Expected: PASS, all 3 cases.

- [ ] **Step 3: Run the full file to catch regressions**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx`
Expected: PASS. Per-slide-override tests are unchanged behavior (they still render `<h1>` with slide.heading text).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx
git commit -m "test(hero): cover heading rich/rotator/plain decision tree"
```

---

## Section E — Item 2: Per-slide overrides as inline TipTap

Lands last because it has the biggest blast radius — adds four schema fields, four registry array descriptors, four EditableTextSlot calls in SlideContent with deep-patch builders, and four RichTextMirror swaps in SlideshowImagesEditor.

### Task E.1: Schema additions for slide-level rich fields

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/schema.ts`

- [ ] **Step 1: Extend `slideContentFieldsSchema`**

Open [apps/web/components/site-components/HeroBanner/schema.ts](../../../apps/web/components/site-components/HeroBanner/schema.ts). Find the `slideContentFieldsSchema` block (around line 55):

```ts
const slideContentFieldsSchema = {
  heading: z.string().optional(),
  richHeading: richTextDocSchema.optional(),
  subheading: z.string().optional(),
  richSubheading: richTextDocSchema.optional(),
  ctaLabel: z.string().optional(),
  richCtaLabel: richTextDocSchema.optional(),
  ctaHref: z.string().optional(),
  secondaryCtaLabel: z.string().optional(),
  richSecondaryCtaLabel: richTextDocSchema.optional(),
  secondaryCtaHref: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "center", "bottom"]).optional(),
};
```

The four new keys are interleaved next to their plain counterparts. The schema is a plain object spread into both `imageSlideSchema` and `videoSlideSchema`, so both slide kinds pick up the new fields automatically.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/schema.ts
git commit -m "feat(hero): add per-slide rich-text fields to slide schema"
```

### Task E.2: SlideContent renders slide overrides via EditableTextSlot

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx`

- [ ] **Step 1: Add deep-patch builders + EditableTextSlot for overrides**

Open [apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx](../../../apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx). Replace the body of `renderHeading` and the slide-override branches in the main return so each slide override goes through `EditableTextSlot` with a deep-patch builder. Replace the file's `renderHeading` and the subheading / ctaLabel branches:

First, add a helper near the top (above `decideHeadingRender`):

```tsx
function makeSlideFieldPatcher(
  data: HeroBannerData,
  slideIndex: number,
  plainKey: keyof Slide,
  richKey: string,
): (json: RichTextDoc, plain: string) => Record<string, unknown> {
  return (json, plain) => {
    const next = data.images.slice();
    const current = next[slideIndex];
    if (!current) return {};
    next[slideIndex] = { ...current, [plainKey]: plain, [richKey]: json };
    return { images: next };
  };
}
```

Then rewrite `renderHeading` to dispatch on slide-override presence:

```tsx
function renderHeading({
  node,
  data,
  slide,
  slideIndex,
  prefersReducedMotion,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
  prefersReducedMotion: boolean;
}): ReactNode {
  const baseStyle: CSSProperties = { fontSize: "40px", fontWeight: 700, margin: 0 };

  // Per-slide override path
  if (slide && slideIndex !== undefined && (slide.heading !== undefined || slide.richHeading !== undefined)) {
    const slidePlain = slide.heading ?? "";
    const slideRich = slide.richHeading;
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.heading`}
        richKey={`images.${slideIndex}.richHeading`}
        doc={slideRich}
        fallback={slidePlain}
        fullProps={node.props}
        profile="block"
        as="h1"
        style={baseStyle}
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "heading", "richHeading")}
      />
    );
  }

  // Banner-level path (rich / rotator / plain)
  const decision = decideHeadingRender(
    data.heading,
    data.richHeading,
    data.rotatingWords,
  );

  if (decision.kind === "rotator") {
    return (
      <h1 style={baseStyle}>
        <RotatingHeading
          heading={decision.plain}
          rotatingWords={[...decision.rotatingWords]}
          prefersReducedMotion={prefersReducedMotion}
        />
      </h1>
    );
  }

  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="heading"
      richKey="richHeading"
      doc={data.richHeading}
      fallback={data.heading}
      fullProps={node.props}
      profile="block"
      as="h1"
      style={baseStyle}
    />
  );
}
```

Now replace the `subheadingNode` block in `SlideContent` so per-slide subheadings also use EditableTextSlot:

```tsx
  const subheadingNode = renderSubheading({ node, data, slide, slideIndex });
```

Add a new helper:

```tsx
function renderSubheading({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide && (slide.subheading !== undefined || slide.richSubheading !== undefined);
  const subheading = slideHasOverride ? slide?.subheading ?? "" : data.subheading;
  if (!subheading && !(slideHasOverride && slide?.richSubheading)) return null;

  const baseStyle: CSSProperties = { fontSize: "18px", margin: 0, maxWidth: "640px" };

  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.subheading`}
        richKey={`images.${slideIndex}.richSubheading`}
        doc={slide.richSubheading}
        fallback={slide.subheading ?? ""}
        fullProps={node.props}
        profile="block"
        as="p"
        style={baseStyle}
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "subheading", "richSubheading")}
      />
    );
  }

  if (!data.subheading && !data.richSubheading) return null;
  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="subheading"
      richKey="richSubheading"
      doc={data.richSubheading}
      fallback={data.subheading}
      fullProps={node.props}
      profile="block"
      as="p"
      style={baseStyle}
    />
  );
}
```

Replace the `ctaLabel` rendering inline with a similar dispatcher. Replace the existing `{slide?.ctaLabel ? (...) : (<EditableTextSlot ... />)}` ternary with:

```tsx
          {ctaLabel ? (
            <a href={ctaHref || "#"} data-hero-cta="primary" style={ctaStyle}>
              {renderCtaLabel({ node, data, slide, slideIndex })}
            </a>
          ) : null}
```

And add the helper:

```tsx
function renderCtaLabel({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide && (slide.ctaLabel !== undefined || slide.richCtaLabel !== undefined);
  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.ctaLabel`}
        richKey={`images.${slideIndex}.richCtaLabel`}
        doc={slide.richCtaLabel}
        fallback={slide.ctaLabel ?? ""}
        fullProps={node.props}
        profile="inline"
        as="span"
        buildWritePatch={makeSlideFieldPatcher(data, slideIndex, "ctaLabel", "richCtaLabel")}
      />
    );
  }
  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="ctaLabel"
      richKey="richCtaLabel"
      doc={data.richCtaLabel}
      fallback={data.ctaLabel}
      fullProps={node.props}
      profile="inline"
      as="span"
    />
  );
}
```

Same pattern for `secondaryCtaLabel`. Replace the existing `{secondaryCtaLabel ? (<a>...{secondaryCtaLabel}</a>) : null}` with:

```tsx
          {secondaryCtaLabel ? (
            <a href={secondaryCtaHref || "#"} data-hero-cta="secondary" style={secondaryCtaStyle}>
              {renderSecondaryCtaLabel({ node, data, slide, slideIndex })}
            </a>
          ) : null}
```

Add helper:

```tsx
function renderSecondaryCtaLabel({
  node,
  data,
  slide,
  slideIndex,
}: {
  node: ComponentNode;
  data: HeroBannerData;
  slide: Slide | undefined;
  slideIndex: number | undefined;
}): ReactNode {
  const slideHasOverride =
    slide &&
    (slide.secondaryCtaLabel !== undefined || slide.richSecondaryCtaLabel !== undefined);
  if (slideHasOverride && slide && slideIndex !== undefined) {
    return (
      <EditableTextSlot
        nodeId={node.id}
        propKey={`images.${slideIndex}.secondaryCtaLabel`}
        richKey={`images.${slideIndex}.richSecondaryCtaLabel`}
        doc={slide.richSecondaryCtaLabel}
        fallback={slide.secondaryCtaLabel ?? ""}
        fullProps={node.props}
        profile="inline"
        as="span"
        buildWritePatch={makeSlideFieldPatcher(
          data,
          slideIndex,
          "secondaryCtaLabel",
          "richSecondaryCtaLabel",
        )}
      />
    );
  }
  return (
    <EditableTextSlot
      nodeId={node.id}
      propKey="secondaryCtaLabel"
      richKey="richSecondaryCtaLabel"
      doc={data.richSecondaryCtaLabel}
      fallback={data.secondaryCtaLabel ?? ""}
      fullProps={node.props}
      profile="inline"
      as="span"
    />
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS. The `RichTextDoc` import was added in Task D.1; verify it's still present.

- [ ] **Step 3: Run the hero banner suite**

Run: `pnpm test apps/web/components/site-components/HeroBanner`
Expected: PASS. The slide-override tests now route through `EditableTextSlot` → `RichTextRenderer` (in non-edit-mode) which produces the same DOM.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx
git commit -m "feat(hero): per-slide override fields render via EditableTextSlot with deep-patch builders"
```

### Task E.3: Register array text-fields for HeroBanner

**Files:**
- Modify: `apps/web/components/site-components/registry.ts`

- [ ] **Step 1: Add four array descriptors**

Open [apps/web/components/site-components/registry.ts](../../../apps/web/components/site-components/registry.ts). Find the `HeroBanner.meta.textFields` array (around line 216-230 — already updated in Task C.2 to include `secondaryCtaLabel`). Append four `kind: "array"` entries:

```ts
      textFields: [
        { propKey: "heading", richKey: "richHeading", label: "Hero heading", profile: "block" },
        {
          propKey: "subheading",
          richKey: "richSubheading",
          label: "Hero subheading",
          profile: "block",
        },
        {
          propKey: "ctaLabel",
          richKey: "richCtaLabel",
          label: "CTA label",
          profile: "inline",
        },
        {
          propKey: "secondaryCtaLabel",
          richKey: "richSecondaryCtaLabel",
          label: "Secondary CTA label",
          profile: "inline",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "heading",
          itemRichKey: "richHeading",
          label: "Slide heading",
          profile: "block",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "subheading",
          itemRichKey: "richSubheading",
          label: "Slide subheading",
          profile: "block",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "ctaLabel",
          itemRichKey: "richCtaLabel",
          label: "Slide CTA label",
          profile: "inline",
        },
        {
          kind: "array",
          arrayKey: "images",
          itemPropKey: "secondaryCtaLabel",
          itemRichKey: "richSecondaryCtaLabel",
          label: "Slide secondary CTA label",
          profile: "inline",
        },
      ],
```

The array descriptors document the existence of these fields; broadcast skips arrays today (`applyMarkBroadcast.ts:67-69`) so this addition is purely declarative — it won't change runtime behavior, but keeps the registry truthful.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/site-components/registry.ts
git commit -m "feat(registry): document HeroBanner per-slide rich text fields as array descriptors"
```

### Task E.4: SlideshowImagesEditor uses RichTextMirror for the four slide-content fields

**Files:**
- Modify: `apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx`

- [ ] **Step 1: Replace four `<TextInput>` calls with `<RichTextMirror>`**

Open [apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx](../../../apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx).

1. Add import:

```tsx
import { RichTextMirror } from "./RichTextMirror";
```

2. Extend `SlideshowImage` to declare the rich keys:

```tsx
export type SlideshowImage = {
  src?: string;
  alt?: string;
  kind?: "image" | "video";
  videoSrc?: string;
  videoSrcWebm?: string;
  videoPoster?: string;
  // Per-slide content overrides (Sprint 8) + their rich-text companions.
  heading?: string;
  richHeading?: unknown;
  subheading?: string;
  richSubheading?: unknown;
  ctaLabel?: string;
  richCtaLabel?: unknown;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  richSecondaryCtaLabel?: unknown;
  secondaryCtaHref?: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
};
```

(Use `unknown` rather than re-importing `RichTextDoc` to avoid coupling the editor controls to the rich-text type module — the rich docs are validated when persisted via the schema.)

3. Replace `ContentFields` with the RichTextMirror version:

```tsx
function ContentFields({
  idPrefix,
  slide,
  inheritance,
  testId,
  onChange,
}: {
  idPrefix: string;
  slide: SlideshowImage;
  inheritance?: BannerInheritance;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
}) {
  // Bridge RichTextMirror's writePartial into our `update(idx, patch)` model.
  // Each call site builds a localized patch that targets one slide field.
  const writePartialFor = (
    plainKey: keyof SlideshowImage,
    richKey: keyof SlideshowImage,
  ) => (patch: Record<string, unknown>) => {
    onChange({
      [plainKey]: patch[plainKey as string] as string | undefined,
      [richKey]: patch[richKey as string],
    } as Partial<SlideshowImage>);
  };

  const placeholderFor = (val: string | undefined) =>
    val && val.length > 0 ? `(inherits "${val}")` : "(inherits banner)";

  return (
    <div className="space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/30 p-1.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Per-slide content</p>
      <RichTextMirror
        fieldId={`${idPrefix}-heading`}
        fieldLabel="Heading"
        plainKey="heading"
        richKey="richHeading"
        plain={slide.heading ?? ""}
        rawRich={slide.richHeading}
        profile="block"
        writePartial={writePartialFor("heading", "richHeading")}
      />
      <RichTextMirror
        fieldId={`${idPrefix}-subheading`}
        fieldLabel="Sub-heading"
        plainKey="subheading"
        richKey="richSubheading"
        plain={slide.subheading ?? ""}
        rawRich={slide.richSubheading}
        profile="block"
        writePartial={writePartialFor("subheading", "richSubheading")}
      />
      <RichTextMirror
        fieldId={`${idPrefix}-cta-label`}
        fieldLabel="Primary CTA label"
        plainKey="ctaLabel"
        richKey="richCtaLabel"
        plain={slide.ctaLabel ?? ""}
        rawRich={slide.richCtaLabel}
        profile="inline"
        writePartial={writePartialFor("ctaLabel", "richCtaLabel")}
      />
      <HrefInput
        id={`${idPrefix}-cta-href`}
        label="Primary CTA link"
        value={slide.ctaHref ?? ""}
        placeholder={placeholderFor(inheritance?.ctaHref)}
        testId={testId ? `${testId}-cta-href` : undefined}
        tooltip="Overrides where the primary CTA links to on this slide. Pick a page or enter an external URL."
        onChange={(next) => onChange({ ctaHref: next === "" ? undefined : next })}
      />
      <RichTextMirror
        fieldId={`${idPrefix}-secondary-cta-label`}
        fieldLabel="Secondary CTA label"
        plainKey="secondaryCtaLabel"
        richKey="richSecondaryCtaLabel"
        plain={slide.secondaryCtaLabel ?? ""}
        rawRich={slide.richSecondaryCtaLabel}
        profile="inline"
        writePartial={writePartialFor("secondaryCtaLabel", "richSecondaryCtaLabel")}
      />
      <HrefInput
        id={`${idPrefix}-secondary-cta-href`}
        label="Secondary CTA link"
        value={slide.secondaryCtaHref ?? ""}
        placeholder={placeholderFor(inheritance?.secondaryCtaHref)}
        testId={testId ? `${testId}-secondary-cta-href` : undefined}
        tooltip="Where the secondary CTA links to. Pick a page or enter an external URL."
        onChange={(next) => onChange({ secondaryCtaHref: next === "" ? undefined : next })}
      />
    </div>
  );
}
```

The placeholder `(inherits banner)` hint that the old TextInput had for empty slide overrides goes away — RichTextMirror doesn't surface placeholders. The user already sees the banner-level value rendered on the canvas as fallback, so this is acceptable.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx
git commit -m "feat(editor): use RichTextMirror for per-slide override text fields"
```

### Task E.5: Coverage tests for slide-override sync + rich rendering

**Files:**
- Modify: `apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx`
- Modify: `apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx`

- [ ] **Step 1: Add slide-rich rendering test**

Open [apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx). Add at the end:

```tsx
describe("SlideContent — per-slide rich-text overrides", () => {
  it("renders per-slide richHeading via the rich-text path", () => {
    const formattedDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bold slide", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Banner heading",
          autoplay: false,
          images: [
            {
              src: "https://x/1.png",
              alt: "1",
              heading: "Bold slide",
              richHeading: formattedDoc,
            },
          ],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    const h1 = root?.querySelector("h1");
    expect(h1?.textContent).toBe("Bold slide");
    expect(h1?.querySelector("strong")).not.toBeNull();
  });

  it("falls back to per-slide plain heading when no richHeading is set", () => {
    const { container } = render(
      <HeroBanner
        node={makeNode({
          heading: "Banner heading",
          autoplay: false,
          images: [{ src: "https://x/1.png", alt: "1", heading: "Slide-specific heading" }],
        })}
        cssStyle={{}}
      />,
    );
    const root = getRoot(container);
    expect(root?.querySelector("h1")?.textContent).toBe("Slide-specific heading");
  });
});
```

- [ ] **Step 2: Add slide-override panel sync test**

Open [apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx). Add at the end:

```tsx
describe("<HeroBannerEditPanel> — per-slide override RichTextMirror", () => {
  it("typing in slide-0 heading writes both plain and rich keys on images[0]", () => {
    hydrateWith({
      heading: "",
      images: [{ src: "https://x/1.png", alt: "1" }],
    });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    // Expand slide row 0 first.
    const expandToggle = screen.getByTestId("hero-slides-0-toggle");
    fireEvent.click(expandToggle);
    const headingTextarea = screen.getByTestId("hero-slides-0-heading");
    fireEvent.change(headingTextarea, { target: { value: "Slide override" } });
    const after = getNode("cmp_hero").props as { images: Array<Record<string, unknown>> };
    const firstSlide = after.images[0];
    expect(firstSlide).toBeDefined();
    if (!firstSlide) throw new Error("no slide");
    expect(firstSlide.heading).toBe("Slide override");
    expect(firstSlide.richHeading).toEqual(synthesizeDoc("Slide override", "block"));
  });
});
```

The existing `hero-slides-0-heading` testId is preserved by RichTextMirror's `data-testid={fieldId}` on its textarea ([RichTextMirror.tsx:108](../../../apps/web/components/editor/edit-panels/controls/RichTextMirror.tsx#L108)).

- [ ] **Step 3: Run the new tests**

Run: `pnpm test apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx -t "per-slide rich-text overrides" && pnpm test apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx -t "per-slide override RichTextMirror"`
Expected: PASS.

- [ ] **Step 4: Run the full hero banner suite**

Run: `pnpm test apps/web/components/site-components/HeroBanner`
Expected: PASS. Pre-existing slide-override tests should still work — the override fields now route through RichTextRenderer's plain branch (no doc) which produces equivalent DOM.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx
git commit -m "test(hero): cover per-slide rich-text overrides + panel sync"
```

---

## Section F — Final quality gate (CLAUDE.md §15.7)

### Task F.1: Run all gates and the manual smoke test

- [ ] **Step 1: Full Vitest run**

Run: `pnpm test`
Expected: ZERO failures, zero warnings.

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: PASS, zero TypeScript errors, zero warnings.

- [ ] **Step 3: Biome check**

Run: `pnpm biome check`
Expected: PASS, zero warnings.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`, open the editor with a hero-banner-bearing page, then:

1. Right-click the heading on the canvas. Verify: a 1px white outline + slight white background appears on the heading immediately (first right-click).
2. Type into the inline editor. Verify: the left panel's "Heading" textarea reflects the new text.
3. Type into the left panel's "Heading" textarea. Verify: the canvas heading updates inline.
4. Apply bold to the inline heading. Verify: panel switches to read-only mirror with "Formatted" badge + "Edit as plain text" button.
5. Add a slide via the SlidesSection panel. Expand the slide. Type into the slide's "Heading" textarea. Verify: typing works (no input freezing) and the canvas's slide heading updates.
6. Right-click the slide-heading inline on the canvas. Apply italics. Verify: the slide's per-slide override gets a richHeading entry; the panel switches to read-only mirror.
7. Click the new Pause button next to the X-ray toggle. Verify: every HeroBanner on the canvas freezes on its current slide. Click again — slides resume.
8. Click on the HeroBanner (select it). Verify: even with pause OFF, this banner stops rotating. Click outside to deselect — it resumes.
9. Set `heading` to `Find your {rotator} home` with rotatingWords `["dream", "perfect"]`. Verify: rotator animates as before. Now bold the heading. Verify: rotation stops, bold heading renders.

If any step fails, treat as a Deviation per [CLAUDE.md](../../../CLAUDE.md) §15.8.

- [ ] **Step 5: Final commit (if any cleanup needed)**

If the smoke test surfaces a small fix, land it as a `fix(hero): ...` commit. Otherwise no extra commit needed — the plan's incremental commits already cover the work.

---

## Self-review notes

**Spec coverage:**
- Item 1 (heading TipTap + drop rotation) → Tasks D.1, D.2, D.3.
- Item 2 (per-slide overrides inline TipTap) → Tasks E.1, E.2, E.3, E.4, E.5.
- Item 3 (RichTextMirror sync, banner-level) → Tasks C.1, C.2, C.3.
- Item 4 (active-field indicator) → Task B.1.
- Item 5 (pause toggle) → Tasks A.1, A.2, A.3, A.4, A.5, A.6.

**Existing-data migration:** No backfill needed; renderer already prefers rich docs.

**Type consistency:** `slideIndex` propagates through SlideContent → all three layouts. `nodeId` propagates to `useHeroSlideshow`. `richHeading` / `richSubheading` / `richCtaLabel` / `richSecondaryCtaLabel` are the four rich keys used consistently in schema (Section E), registry (Section E), CtaSection (Section C), SlideContent (Section D + E), SlideshowImagesEditor (Section E).

**Risk:** Section D's heading swap is the most visible change. If pre-existing tests assert on the exact DOM shape inside the `<h1>` (e.g., expecting a span from RotatingHeading), they'll need adjusting. The plan handles this in Task D.2 step 5 (run-and-fix).
