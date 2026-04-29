# HeroBanner — TipTap / EditPanel sync, active-field indicator, edit-mode pause toggle

## Goals

The HeroBanner has three text-related bugs and is missing one editor affordance:

1. The banner-level **heading** is not editable via TipTap on the canvas. Right-clicking it sets selection but no editor mounts.
2. The left **EditPanel** and inline **TipTap** editors do not stay in sync. Typing in the panel writes only the plain field while the renderer prefers the rich field, so the canvas appears stuck. This is most visible on per-slide overrides, but the same shape exists on banner-level fields.
3. Per-slide override fields in the SlidesSection panel do not display TipTap formatting and (per the user) sometimes don't accept typing at all.
4. There's no way for an editor user to stop the slideshow from cycling while they're working on a slide.

This design fixes the four together because they share underlying machinery (the EditableTextSlot / RichTextMirror pair) and because solving one without the others leaves the user with a half-working surface.

## Non-goals

- Reworking how rich-text broadcast mode targets HeroBanner descendants. Broadcast already collects every text-bearing descendant via `getTextBearingDescendants`; once per-slide fields become EditableTextSlots it picks them up automatically.
- Changing the rotator effect's animation, timing, or token format. This design only changes *when* the rotator runs.
- Adding rich-text support to alt-text or href fields. Those are attributes, not visible text.
- Persisting the pause toggle. Like the X-ray toggle, it's transient — defaults off each editor load.

## Conflicts with existing data

If an existing site stores both a populated `richHeading` (with formatting) and a different `heading` plain string, the canvas already renders the rich version (RichTextRenderer prefers `doc` over `fallback`). This design preserves that precedence: rich wins. Site authors who want to revert use the existing "Edit as plain text" escape hatch on the new RichTextMirror controls.

---

## Item 1 — Heading is TipTap-editable

### Current behavior

All three layouts ([CenteredLayout.tsx:41-49](../../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx#L41-L49), [FullBleedLayout.tsx:40-48](../../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx#L40-L48), [SplitLayout.tsx:195-205](../../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx#L195-L205)) build a literal `<h1><RotatingHeading heading={data.heading} ... /></h1>` and pass it to `SlideContent` as `headingSlot`. `SlideContent` only falls back to the `EditableTextSlot` for heading when `headingSlot` is missing, so the EditableTextSlot path is dead code.

### Target behavior

Banner-level heading rendering moves down into `SlideContent`. The layouts no longer construct a `headingSlot`. `SlideContent` decides between three render paths based on the data:

1. **Rich content path** (`richHeading` exists *and* the doc differs from `synthesizeDoc(heading, "block")`) — render `EditableTextSlot` with `propKey="heading"`, `richKey="richHeading"`. No rotation. The rotator token (if present in the plain text) is irrelevant once formatting exists.
2. **Rotator path** (no rich formatting *and* `heading` contains `{rotator}` *and* `rotatingWords` is non-empty) — render the existing `<h1><RotatingHeading ... /></h1>`. Read-only on the canvas; the user edits via the panel. (This matches today's behavior; the user can opt out by clearing the token.)
3. **Plain TipTap path** (default) — render `EditableTextSlot`. No rotation needed.

The decision lives inside `SlideContent` so the layouts stop carrying heading concerns. The `headingSlot` prop is removed from `SlideContentProps` since no caller still needs it. Per-slide heading overrides (Item 2) follow the same three-path decision against `slide.richHeading` / `slide.heading`.

### Why option A (drop rotation when formatted)

Option B (animate `{rotator}` inside a rich doc) would need to find the token across mark boundaries, splice it during animation, and re-mount the rich tree on every cycle — fragile and a fresh source of test failures. Option C (no TipTap on heading ever) was rejected by the user. Option A is consistent with the codebase's "rich wins; plain text round-trips through synthesizeDoc" rule already used by Heading and Paragraph.

### Files

- Modify [layouts/CenteredLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx) — remove the local `heading` ReactNode and the `headingSlot` argument to `SlideContent`.
- Modify [layouts/FullBleedLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx) — same.
- Modify [layouts/SplitLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx) — same; `headingNode()` helper is deleted.
- Modify [slides/SlideContent.tsx](../../../apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx) — remove `headingSlot` from props, add a `decideHeadingRender(...)` local that returns one of the three paths. Pass `prefersReducedMotion` through (currently lives in layouts).

### Tests

- Update [__tests__/HeroBanner.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/HeroBanner.test.tsx) and [__tests__/slide-content.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx) so banner-level heading without rich/rotator renders an EditableTextSlot in edit mode and a plain `<h1>` (via RichTextRenderer's plain branch) in preview/public.
- Add a test that asserts: with `richHeading` populated and `{rotator}` in the plain string, the rotator does NOT animate (rich path wins).
- Existing rotator tests stay green because the plain-rotator path is untouched.

---

## Item 2 — Per-slide overrides are inline TipTap-editable

### Schema additions

Add four optional rich-text fields to the slide content shape ([schema.ts:55-64](../../../apps/web/components/site-components/HeroBanner/schema.ts#L55-L64)):

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

These reuse `richTextDocSchema` so visitor-side validation rejects the same shapes it already rejects. Adding optional fields is non-breaking for stored configs.

### Renderer change

`SlideContent` swaps the existing plain-text branches for `EditableTextSlot` calls that target the active slide's array index. The deep-patch builder pattern is already proven on NavBar links ([TipTapEditableSlot.tsx:55-58, EditableTextSlot.tsx:55-58](../../../apps/web/components/renderer/TipTapEditableSlot.tsx#L55-L58)). For the active slide at `images[index]`:

```ts
const activeIndex = /* slide's index in data.images */;
const buildSlideHeadingPatch = (json, plain) => {
  const next = data.images.slice();
  next[activeIndex] = { ...next[activeIndex], heading: plain, richHeading: json };
  return { images: next };
};
```

`SlideContent` already receives the active `slide` object but not its index. The layouts (`CenteredSlideshow`, `FullBleedSlideshow`, `SplitWithSlideshow`) pass `data.images[index]` — they will additionally pass `slideIndex={index}` so the patch builder can write back to the right element.

The rich-content / plain-TipTap / rotator decision from Item 1 applies per slide: a slide with `richHeading` formatting renders TipTap; a slide with `{rotator}` in `slide.heading` and `data.rotatingWords` renders the rotator (rotator config stays banner-level only); otherwise plain TipTap.

When the slide override is empty for a field, the banner-level `EditableTextSlot` (Item 1) is used as the visible/editable surface.

### EditPanel change

`SlideshowImagesEditor.ContentFields` ([SlideshowImagesEditor.tsx:420-494](../../../apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx#L420-L494)) replaces each `<TextInput>` for heading / subheading / ctaLabel / secondaryCtaLabel with `<RichTextMirror>` (Item 3 details the control). `alt`, `ctaHref`, `secondaryCtaHref` keep `<TextInput>` / `<HrefInput>` since they're attributes, not visible rich text.

### Investigation: "can't type" in overrides

The user reports the override fields don't accept typing. The current `<TextInput>` is a controlled `<Input>` whose `onChange` calls `update(idx, patch)` which immutably replaces `images[idx]`. There's no obvious reason this would block typing. Two things will be verified during implementation:

1. **Stale closure.** `update` reads `value` from props every render — fine.
2. **dnd-kit interference.** The drag listeners are spread onto the grip button only, not the row, so input focus is unaffected. The DndContext sensor activation distance is 4 px — clicking an input without dragging is fine.

The most plausible cause is the user clicked into the field but the row was collapsed, or some upstream re-render unmounted the input mid-keystroke. The `RichTextMirror` swap removes the suspect surface entirely and is the same shape Heading/Paragraph already use successfully — if a typing bug exists, this also fixes it. If after the swap typing still fails, that'll be a separate, narrower investigation.

### Files

- Modify [HeroBanner/schema.ts](../../../apps/web/components/site-components/HeroBanner/schema.ts) — add the four optional rich fields to `slideContentFieldsSchema`.
- Modify [HeroBanner/slides/SlideContent.tsx](../../../apps/web/components/site-components/HeroBanner/slides/SlideContent.tsx) — switch slide overrides to `EditableTextSlot` with array-index `buildWritePatch`.
- Modify [HeroBanner/layouts/CenteredLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/CenteredLayout.tsx), [FullBleedLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/FullBleedLayout.tsx), [SplitLayout.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SplitLayout.tsx) — pass `slideIndex` to `SlideContent`.
- Modify [SlideshowImagesEditor.tsx](../../../apps/web/components/editor/edit-panels/controls/SlideshowImagesEditor.tsx) — replace `<TextInput>` with `<RichTextMirror>` in `ContentFields` for the four rich-eligible fields.
- Modify [components/site-components/registry.ts](../../../apps/web/components/site-components/registry.ts) — add the four per-slide rich fields as array-style `TextFieldDescriptor`s under HeroBanner so broadcast mode (`getTextBearingDescendants`) can target them. (Each becomes a `kind: "array"` descriptor with `arrayKey: "images"`, `itemPropKey`, `itemRichKey`.)

### Tests

- Update [__tests__/slide-content.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/slide-content.test.tsx) — slide-override fields render via EditableTextSlot in edit mode; legacy plain-only slides still render correctly (the lazy-migration path uses `synthesizeDoc` once the user types in TipTap).
- Add coverage to [__tests__/EditPanel.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx) for the RichTextMirror swap on slide overrides: typing in the textarea writes both `images[idx].heading` and `images[idx].richHeading`.
- Backwards-compat test: a slide with only legacy `{src, alt}` still renders without errors; the override fields are simply absent.

---

## Item 3 — Bidirectional sync via RichTextMirror

### Banner-level fields

[CtaSection.tsx:14-55](../../../apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx#L14-L55) currently uses `<TextInput>` for `heading`, `subheading`, `ctaLabel`, `secondaryCtaLabel`. Each calls `writePartial({ [key]: next })` with only the plain key — the rich key stays stale, and on next render `RichTextRenderer` keeps showing the rich text.

Replace each with `<RichTextMirror>` (the existing Heading/Paragraph control, [RichTextMirror.tsx](../../../apps/web/components/editor/edit-panels/controls/RichTextMirror.tsx)). RichTextMirror:
- Writes both keys (`{ [plainKey]: next, [richKey]: synthesizeDoc(next, profile) }`) on every keystroke when no formatting is present.
- Switches to a read-only mirror with an "Edit as plain text (clears formatting)" button when the rich doc has formatting beyond a plain paragraph. This protects the user from silently losing TipTap formatting by accidentally typing in the panel.

`alt`, `ctaHref`, `secondaryCtaHref`, and `backgroundImage` stay as `<TextInput>` / `<HrefInput>` — they're attribute strings, not editable rich text.

### Why not always overwrite both keys

A naive "panel writes both" would clobber user-applied marks (bold, color, font) the moment they touched the panel. RichTextMirror's "formatted" badge + escape hatch makes the destructive path explicit. This is exactly the pattern Heading/Paragraph use today.

### Per-slide fields

Item 2 already covers the slide-override panel using RichTextMirror. The banner-level fields use the same control with `profile="block"` for heading/subheading and `profile="inline"` for the two CTA labels (matching the registry's existing TextField profiles).

### Files

- Modify [HeroBanner/edit-panel/CtaSection.tsx](../../../apps/web/components/site-components/HeroBanner/edit-panel/CtaSection.tsx) — swap heading / subheading / ctaLabel / secondaryCtaLabel to RichTextMirror.

### Tests

- Add coverage to [__tests__/EditPanel.test.tsx](../../../apps/web/components/site-components/HeroBanner/__tests__/EditPanel.test.tsx): after typing in the heading textarea, both `props.heading` and `props.richHeading` are written and equal `synthesizeDoc(text, "block")`.
- Test that a node with rich formatting on `richHeading` shows the read-only mirror with the "Formatted" badge.
- Bidirectional canvas test: simulate a TipTap edit on the heading slot (calls `setComponentProps` with both keys), assert the panel reflects the new plain text on next render.

---

## Item 4 — Active-field visual indicator

### Current behavior

When a text field becomes the active TipTap target (`textEditingScope.mode === "single"` matching `(nodeId, propKey)`), `EditableTextSlot` swaps to `TipTapEditableSlot`. There is no visual treatment on `TipTapEditableSlot` itself. The user perceives a delay because `EditModeWrapper`'s component-level selection ring appears via `selectedComponentId`, but no field-level chrome confirms which text node is active.

### Target behavior

`TipTapEditableSlot`'s wrapping `<Tag>` element ([TipTapEditableSlot.tsx:128-138](../../../apps/web/components/renderer/TipTapEditableSlot.tsx#L128-L138)) gets two new style additions when active:

- 1px outline at `rgba(255,255,255,0.5)` with 4px border-radius and outline-offset 2px (subtle, contrasts against typical hero backgrounds).
- Background `rgba(255,255,255,0.06)` — the "slight, very transparent white" the user described.

These styles compose with the user-supplied `style` prop. They appear on the same render tick the editor mounts, which is the same React tick `enterTextEditing` is called from `onContextMenu`. So: first right-click → store updates → EditableTextSlot re-renders → TipTapEditableSlot mounts with the indicator visible. No left click needed.

### Scope

Because `TipTapEditableSlot` is the shared component for every text-bearing field across the registry, this indicator applies to Heading / Paragraph / Button / NavBar links / Footer titles / HeroBanner / PropertyCard / UnitCard automatically.

### Files

- Modify [components/renderer/TipTapEditableSlot.tsx](../../../apps/web/components/renderer/TipTapEditableSlot.tsx) — add the outline + background to the wrapping `<Tag>` style.

### Tests

- Add coverage to [components/renderer/__tests__/](../../../apps/web/components/renderer) (a new `TipTapEditableSlot.test.tsx` if absent, otherwise extend existing): in edit mode after `enterTextEditing(nodeId, propKey)`, the rendered slot has the indicator class/style; in preview/public mode no indicator appears.

---

## Item 5 — Edit-mode pause toggle

### Store

Add to [editor-state/types.ts](../../../apps/web/lib/editor-state/types.ts) and [editor-state/store.ts](../../../apps/web/lib/editor-state/store.ts):

```ts
type EditorState = {
  // ...
  slideshowPaused: boolean;  // transient, default false
};
type EditorActions = {
  // ...
  toggleSlideshowPaused: () => void;
};
```

Mirrors `showComponentTypes` shape exactly. Defaults `false` on each editor load. Reset to `false` in `hydrate`.

### Topbar button

New file [components/editor/topbar/PauseSlideshowToggle.tsx](../../../apps/web/components/editor/topbar/PauseSlideshowToggle.tsx) — same shape as `ShowComponentTypesToggle.tsx`. Uses Lucide's `Play` / `Pause` icons. Inserted into [TopBar.tsx:25-30](../../../apps/web/components/editor/topbar/TopBar.tsx#L25-L30) directly before `<ShowComponentTypesToggle />`.

### Slideshow wiring

[useHeroSlideshow](../../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx#L25-L52) already takes a `paused` arg. The hook subscribes to:

- `useEditorStore((s) => s.slideshowPaused)` — global toggle
- `useEditorStore((s) => s.selectedComponentId)` — auto-pause when this banner's id is selected
- `useRenderMode()` — only enable the editor-side pause logic when `mode === "edit"`. In public/preview the slideshow plays normally regardless of store state.

The composed `paused` argument to the inner `useSlideshow` becomes:

```ts
// hoverPaused is the existing local state set by mouseHandlers.
const hoverContribution = data.pauseOnHover ? hoverPaused : false;
const editorContribution = mode === "edit"
  ? (globalSlideshowPaused || selectedComponentId === nodeId)
  : false;
const paused = hoverContribution || editorContribution;
```

This preserves the existing pause-on-hover behavior (gated by `data.pauseOnHover`) and additively contributes the editor flags only when in edit mode. Visitor renders ignore the editor flags entirely.

The hook needs the banner's node id, so `useHeroSlideshow` takes a `nodeId` parameter (currently it doesn't). The three layout files that call it pass `node.id`.

### Visitor bundle safety

`useEditorStore` is already safe to import from a "use client" component shared across editor and visitor bundles — on the visitor side it returns the empty default state. The pause logic guards on `mode === "edit"` so visitors never see paused autoplay even if some renderer accidentally subscribed.

### Files

- Modify [editor-state/types.ts](../../../apps/web/lib/editor-state/types.ts) — add `slideshowPaused` to `EditorState`, `toggleSlideshowPaused` to `EditorActions`.
- Modify [editor-state/store.ts](../../../apps/web/lib/editor-state/store.ts) — initial value, action, reset in `hydrate` and `deselectAll`-style places (only `hydrate` needs reset; `deselectAll` should NOT toggle pause).
- Create [topbar/PauseSlideshowToggle.tsx](../../../apps/web/components/editor/topbar/PauseSlideshowToggle.tsx).
- Modify [topbar/TopBar.tsx](../../../apps/web/components/editor/topbar/TopBar.tsx) — insert toggle.
- Modify [HeroBanner/layouts/SlideshowFrame.tsx](../../../apps/web/components/site-components/HeroBanner/layouts/SlideshowFrame.tsx) — `useHeroSlideshow` reads store, accepts `nodeId`.
- Modify the three layout files to pass `node.id` to `useHeroSlideshow`.

### Tests

- Store unit test: `toggleSlideshowPaused` flips the flag; default is `false`; `hydrate` resets to `false`.
- Topbar test: button toggles aria-pressed, swaps Pause/Play icon.
- Slideshow test: when `slideshowPaused === true`, `useSlideshow` is called with `paused: true`. When `selectedComponentId === banner.id`, same.
- Visitor test: in `mode === "preview"` with `slideshowPaused === true`, slideshow still autoplays (the editor flag is ignored).

---

## Existing-data migration

Per the user's directive: "If right now for existing sites there is a contradiction between the displayed tiptap text on the hero banner and the overrides in the slideshow section of the edit panel opt for the tippy tap for existing sites." This is already the renderer's behavior (`RichTextRenderer` prefers `doc` over `fallback`). After this design lands:

- **Banner-level** existing data: untouched. `richHeading` continues to win on render. Panel switches to RichTextMirror, which detects the formatting and shows the read-only mirror with the escape hatch.
- **Per-slide** existing data: also untouched. Slides historically had no `richX` fields at all, so the rich path is empty for legacy data, and `EditableTextSlot` falls back to the plain `slide.heading` via `synthesizeDoc` on first edit.

No data backfill, no migration script, no version bump.

## Quality gates and ordering

Per CLAUDE.md §15.7, the implementation plan (next step, written by the writing-plans skill) will deliver these items in independent commits:

1. Item 5 (pause toggle) — additive, no schema impact, can ship first.
2. Item 4 (active-field indicator) — additive style change in shared TipTapEditableSlot, no schema impact.
3. Item 3 (banner-level RichTextMirror in CtaSection) — replaces controls but keeps the field surface stable.
4. Item 1 (heading TipTap + rotator decision) — touches layouts and SlideContent.
5. Item 2 (per-slide overrides + schema additions + registry array fields) — biggest blast radius, lands last.

Each item has its own tests; all pass before commit.
