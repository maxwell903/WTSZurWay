# Rich Text Editing — Manual Smoke Test

Last validated: 2026-04-28 (Phase 5 polish)

This is the click-by-click checklist that exercises the rich-text feature
end to end in the browser. Run it on a fresh `pnpm dev` whenever the
feature is touched. The automated suites (`pnpm test` for unit/integration,
the AI golden-prompt suite, and the bundle-isolation guards) cover most
regressions but a few flows can only be verified by a human driving the
real DOM:

- caret behavior inside contenteditable
- the floating toolbar's positioning
- the dashed broadcast ring across multiple components
- visitor render parity (formatted text round-trips through deploy)

## Setup

1. `pnpm install`
2. Confirm `.env.local` has `ANTHROPIC_API_KEY` and Supabase credentials
   (or you only need to test the editor canvas, not AI / deploy).
3. `pnpm dev` → http://localhost:3000.
4. Sign in and open any site's `/edit` route.
5. Drop a Section if the page is empty, then drop one each of: Heading,
   Paragraph, Button, HeroBanner, NavBar.

## Phase 1 — Heading single mode

- [ ] Right-click the Heading on the canvas. The floating top toolbar
      should appear (B / I / U / Strike / alignment / lists / etc.) and
      the existing left-side edit panel should also be visible.
- [ ] Type into the heading. The text changes in real time.
- [ ] Press **Ctrl+B** (or Cmd+B). The selected text turns bold.
- [ ] Press **Ctrl+I**. Italic.
- [ ] Press **Ctrl+U**. Underline.
- [ ] Click outside the heading. The toolbar closes.
- [ ] Press **F5** to reload. The heading still has the same formatting
      after re-hydration.
- [ ] Open the visitor preview (the `/preview` route or the live
      `/[site]/[[...slug]]` route). The same heading renders with the
      same bold/italic/underline marks (no contenteditable, just static
      HTML).

## Phase 2 — Paragraph + Button + full toolbar

- [ ] Right-click the Paragraph. Toolbar appears.
- [ ] Click the font-family dropdown → pick "Georgia". Paragraph font
      changes.
- [ ] Type a font size in the size box (e.g. `20px`) and press Enter.
      Font size changes for the current selection.
- [ ] Click the text-color picker → pick a red swatch. Selected text
      turns red.
- [ ] Click the highlight picker → pick yellow. Selected text gets a
      yellow background.
- [ ] Click Sub / Sup buttons. Selected text becomes subscript /
      superscript.
- [ ] Click the bullet list button. The current paragraph wraps in a
      `<ul>`.
- [ ] Inside the list item, click "Increase indent". The item nests one
      level deeper.
- [ ] Click the link button. The browser prompt asks for a URL; enter
      `https://example.com`. Selected text becomes a link.
- [ ] Open the spacing popover (Rows3 icon). Type `1.75` for line height
      and `0.05em` for letter spacing. The paragraph spacing changes.
- [ ] Open the case popover and pick UPPERCASE. The paragraph's
      `text-transform` changes.
- [ ] Click the LTR/RTL toggle. The paragraph flips direction.
- [ ] Right-click the **Button**. The toolbar appears, but lists / sub /
      headings should be gracefully disabled or scoped — Button uses the
      INLINE profile.
- [ ] Type into the button label. Type a single line of bold red text;
      verify the button's HTML is valid (no `<p>` inside `<button>`).

## Phase 3 — Broadcast mode

- [ ] Add 3 Headings inside a Section. Give them different text.
- [ ] **Double right-click** the Section (within ~400 ms, on the same
      element). The toolbar appears with a "Broadcasting to N elements"
      badge in the top-left.
- [ ] All three Headings show a **dashed orange ring**.
- [ ] Click the **Bold** button on the toolbar. All three Headings turn
      bold.
- [ ] Click **Bold** again. All three un-bold (Google-Docs toggle
      semantics).
- [ ] Click **Center**. All three centered.
- [ ] Click the **Link** button. It should be disabled (broadcast can't
      anchor a link to a specific selection).
- [ ] Press **Esc**. The broadcast scope clears; the dashed rings go
      away.

## Phase 4 — Long-tail components

- [ ] Right-click the HeroBanner's heading. Toolbar opens for the
      heading specifically. Format it. Verify the subheading and CTA
      label remain unchanged.
- [ ] Right-click the HeroBanner's subheading. Toolbar opens for the
      subheading. Format it.
- [ ] Right-click the HeroBanner's CTA label (the button-shaped element
      inside). Toolbar opens; INLINE profile (no headings/lists).
- [ ] Drop a PropertyCard or UnitCard. Verify the same right-click
      behavior on its heading / body / CTA.

## Phase 4.5 — NavBar and Footer (per-item)

- [ ] Drop a NavBar with 3 links. **Right-click link 2** specifically
      (not the NavBar background). Toolbar opens for THAT link only.
- [ ] Format the link (bold, color). Verify links 1 and 3 are
      unchanged.
- [ ] Right-click the NavBar's empty area (e.g. logo slot or right
      padding). Single-mode opens the toolbar but no link is targeted —
      the FIRST FLAT field would normally surface, but NavBar has none.
      The toolbar may show but be a no-op. Acceptable.
- [ ] Drop a Footer with 2 columns. Right-click a column title. Toolbar
      opens; format the title. Verify only that column's title changes.
- [ ] If the Footer has copyright text, right-click it. Toolbar opens
      INLINE; format it.

## Phase 5 — AI flows

- [ ] Open the AI panel. Type: **"make all the headings on this page
      bold and centered"**. Submit.
- [ ] The AI's reply summary should mention bolding/centering the
      headings.
- [ ] Click Accept. Every heading on the page is bold and centered.
- [ ] Type: **"change the welcome heading to say 'Hello World' in
      italics"**. Submit. Accept.
- [ ] The heading text is updated and italic.
- [ ] Type: **"change the about button label to plain 'Apply now'"** —
      using a `setText` style instruction. Accept.
- [ ] The button label changes to plain text; if it had prior
      formatting, it's cleared.
- [ ] Reload the page. All AI changes persist.

## Visitor render parity

- [ ] Deploy the site (or open the public visitor route with the
      current draft). Every formatting change above should render with
      identical marks.
- [ ] Open DevTools → Network → JS chunks loaded on the visitor route.
      Search the chunk names; **`@tiptap/react` and `@tiptap/pm` should
      NOT appear** (only `@tiptap/html` is allowed on this path). The
      bundle-isolation unit test guards this at the source level too.

## Edge cases worth a 30-second poke

- [ ] Press **Esc** while typing inside the heading. The toolbar
      closes; the canvas keeps your text.
- [ ] Right-click a Heading, then click somewhere else on the canvas
      WITHOUT typing first. The toolbar closes; the heading's `richText`
      stays in sync (no orphan empty doc).
- [ ] In broadcast mode, hit **Ctrl+B**. The shortcut should work in
      broadcast (toggles bold across every selected component).
- [ ] In single mode, click the left-panel "Edit as plain text (clears
      formatting)" button. Confirm dialog appears; on accept, all
      formatting is stripped and the textarea becomes editable again.
- [ ] Open a NavBar via the AI: ask for **"underline link 2 of the
      navbar"**. AI returns `setRichText` with propKey
      `"links.1.richLabel"`. Accept. Verify only link 2 is underlined.

## Known limitations (not bugs)

- Right-clicking *on* a NavBar link doesn't trigger broadcast — the
  inner element captures the right-click. To broadcast across all NavBar
  links, double-right-click the NavBar's surrounding (logo / spacer /
  padding) area.
- The toolbar's `applyTextFormat` broadcast does NOT iterate array
  fields (NavBar links, Footer columns). To format every NavBar link in
  one go, the AI emits one `setRichText` per link with a path-style
  propKey. Toolbar broadcast on a NavBar is currently a visual no-op for
  array fields.
- Footer link labels (inside columns) are NOT yet rich-text editable.
  Only column titles and the footer-wide copyright are.
