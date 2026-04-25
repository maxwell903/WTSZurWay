# Sprint 1: Mock RM data + RMX shell

## One-line summary
Apply the `rm_*` migrations, seed Aurora Property Group with realistic data, build typed `lib/rm-api/` helpers, and render the RMX shell chrome at `/setup` with an empty form skeleton — making the page feel like an actual Rent Manager X screen.

## Spec sections in scope
- `PROJECT_SPEC.md` §5 — Mock Rent Manager data (tables, seed, helper signatures)
- `PROJECT_SPEC.md` §7.1 — RMX shell (the chrome)
- `PROJECT_SPEC.md` §13.4 — Demo brand (Aurora Property Group)
- `PROJECT_SPEC.md` §15 — Coding standards

## Dependencies
- **Requires completion of:** Sprint 0.
- **Can run in parallel with:** Sprint 3 (disjoint owned paths).
- **Blocks:** Sprint 2 (uses the RMX shell as layout).

## File scope

### Owned (this sprint may create or modify)
- `supabase/migrations/0001_rm_tables.sql`
- `supabase/seed.sql` (full population, not just placeholder)
- `apps/web/lib/supabase/server.ts` (server client)
- `apps/web/lib/supabase/client.ts` (browser client)
- `apps/web/lib/supabase/types.ts` (generated DB types)
- `apps/web/lib/rm-api/index.ts`
- `apps/web/lib/rm-api/properties.ts`
- `apps/web/lib/rm-api/units.ts`
- `apps/web/lib/rm-api/company.ts`
- `apps/web/lib/rm-api/types.ts`
- `apps/web/lib/rm-api/__tests__/*.test.ts`
- `apps/web/components/rmx-shell/RmxShell.tsx`
- `apps/web/components/rmx-shell/RmxTopBar.tsx`
- `apps/web/components/rmx-shell/RmxSubBar.tsx`
- `apps/web/components/rmx-shell/CommandLaunch.tsx` (no-op `cmdk` palette for flavor)
- `apps/web/components/rmx-shell/__tests__/*.test.tsx`
- `apps/web/app/(rmx)/layout.tsx`
- `apps/web/app/(rmx)/setup/page.tsx` (skeleton — empty `<form>` with the section headers from §7.2 but no inputs yet)
- `apps/web/app/page.tsx` — replace the placeholder hello with a redirect or link to `/setup`.
- `scripts/seed.ts` — fully implemented, idempotent (deletes from `rm_*` tables then inserts).

### Shared (read-only)
- `PROJECT_SPEC.md`
- All Sprint 0 root configs (`package.json`, `tsconfig.json`, `biome.json`).

### Forbidden (do not touch)
- `apps/web/lib/site-config/` (Sprint 3 owns this).
- `apps/web/components/renderer/` (Sprint 3 owns this).
- `apps/web/components/site-components/` (Sprint 3+5 own this).
- `apps/web/components/editor/` (Sprint 6+ owns this).
- `apps/web/app/api/` (Sprint 4+ owns this).
- Anything else not in the Owned list.

## Definition of Done

- [ ] `supabase/migrations/0001_rm_tables.sql` creates: `rm_properties`, `rm_units`, `rm_unit_images`, `rm_property_amenities`, `rm_unit_amenities`, `rm_company` — exact column names, types, and constraints from `PROJECT_SPEC.md` §5.1.
- [ ] `supabase/seed.sql` populates Aurora Property Group with: 1 `rm_company` row (per §13.4), 8–10 `rm_properties` (residential-heavy, 1 commercial, 1 manufactured housing, all with realistic Cincinnati-area addresses and Unsplash hero image URLs), 30–60 `rm_units` distributed across the properties with realistic rents/sqft/bed/bath, 1–4 `rm_unit_images` per unit, and a realistic amenities mix on properties and units.
- [ ] `pnpm seed` runs `scripts/seed.ts` end-to-end and is **idempotent** — running it twice produces identical row counts (no duplicates). Implementation: `DELETE` from each `rm_*` table in dependency order, then re-insert.
- [ ] `apps/web/lib/rm-api/` exports the helpers from `PROJECT_SPEC.md` §5.3 with these exact signatures:
  - `getProperties(filters?: PropertyFilters): Promise<Property[]>`
  - `getUnits(filters?: UnitFilters): Promise<Unit[]>`
  - `getCompany(): Promise<Company>`
  - `getPropertyById(id: number): Promise<Property | null>`
  - `getUnitById(id: number): Promise<Unit | null>`
- [ ] All `rm-api` types use `camelCase` field names (translate from `snake_case` columns at the boundary), per `PROJECT_SPEC.md` §15.3.
- [ ] Unit tests for each rm-api helper using a mock Supabase client (seed fixture). Tests assert: empty filter returns all rows; filter by `propertyType` works; `getCompany` returns Aurora; `getPropertyById(99999)` returns `null`.
- [ ] `RmxShell` component composes `RmxTopBar` + `RmxSubBar` and slots its `children` below. Used as the layout for the `(rmx)` route group.
- [ ] `RmxTopBar` recreates the chrome from `image.png` (mockup): home icon, hamburger, list view, star, **Command Launch** input, "Company Code my-company" badge, notifications bell with red `2` badge, user avatar circle with initials `WC` (yes — keep WC as a nod to Web Template Suite, the legacy product being replaced; this is a deliberate easter egg). All elements are visual-only; no behaviour required.
- [ ] `RmxSubBar` is the cyan band with the page title "Add Website Template" and a `?` help icon on the right. Background colour matches the mockup (use a Tailwind class — e.g. `bg-sky-500` — with the exact hex confirmed against the mockup; document the hex in a comment).
- [ ] `CommandLaunch` is a `cmdk`-based input that opens an empty palette on click or `⌘K`. The palette shows "No commands available — coming soon" — pure flavor.
- [ ] `/setup` route renders the `RmxShell` layout containing a section-header skeleton of the form (the section titles "General", "Brand", "Color Scheme", "Template Start", "Custom Instructions", "Advanced" appear in order — but with empty body content). This skeleton is what Sprint 2 fills in.
- [ ] `apps/web/app/page.tsx` redirects (or links prominently) to `/setup` so the dev's first action is consistent.
- [ ] All quality gates pass: `pnpm test`, `pnpm build`, `pnpm biome check`, manual smoke test below.
- [ ] No new dependencies beyond `cmdk` (already in §3 stack), `@supabase/supabase-js`, and `@supabase/ssr` (for Next.js 15 server clients).

## Manual smoke test (numbered, click-by-click)

1. Run `supabase start`. Wait for it to print local URLs.
2. Run `pnpm db:reset`. Verify the rm tables are created (you can `psql` into the local DB or use the Supabase Studio at `http://localhost:54323`).
3. Run `pnpm seed`. Verify it completes successfully.
4. Run `pnpm seed` again. Verify it still completes successfully and that row counts in `rm_properties` and `rm_units` are unchanged from step 3 (idempotency check).
5. Open Supabase Studio at `http://localhost:54323`. Open the table editor. Verify:
   - `rm_company` has 1 row (Aurora Property Group).
   - `rm_properties` has 8–10 rows.
   - `rm_units` has 30–60 rows.
   - `rm_unit_images` has rows; pick a unit and verify it has 1–4 image URLs.
6. Run `pnpm dev`.
7. Open `http://localhost:3000`. Verify it redirects to or links to `/setup`.
8. Open `http://localhost:3000/setup` directly.
9. Verify the RMX top bar matches the mockup: home icon, hamburger, list, star, Command Launch input, my-company badge, bell with `2` badge, WC avatar.
10. Verify the cyan sub-bar shows "Add Website Template" and a `?` icon.
11. Click the Command Launch input. Verify a `cmdk` palette opens with "No commands available — coming soon".
12. Press `⌘K` (or `Ctrl+K` on Windows). Verify the same palette opens.
13. Press Escape. Verify it closes.
14. Verify the form area shows section headers "General", "Brand", "Color Scheme", "Template Start", "Custom Instructions", "Advanced" in that order, with empty bodies.
15. Run `pnpm test`. Verify all tests pass (the rm-api tests should account for ≥10 new tests).
16. Run `pnpm build`. Verify zero TypeScript errors.
17. Run `pnpm biome check`. Verify zero warnings.

## Known risks & failure modes

- **Supabase `@supabase/ssr` for Next.js 15:** The recommended client setup changed across versions. **Watch for** cookie-handling errors. **If they appear:** follow the official Supabase + Next.js 15 App Router guide; don't roll your own.
- **Seed idempotency on FK constraints:** If you delete `rm_properties` before `rm_units`, FK violations. **Mitigation:** delete in reverse dependency order — `rm_unit_images`, `rm_unit_amenities`, `rm_property_amenities`, `rm_units`, `rm_properties`, `rm_company`.
- **Unsplash URLs in seed:** Some Unsplash URLs throttle on hot-reload. **Mitigation:** use `https://images.unsplash.com/photo-XXXX?w=1200&auto=format` form, which is stable.
- **`cmdk` v1 + Tailwind v4:** styling reset can hide the palette. **Mitigation:** explicitly set `bg-popover` / `text-popover-foreground` (shadcn tokens).
- **Color of the cyan sub-bar:** mockup is a specific cyan. **Mitigation:** sample the hex from the mockup with a color picker; record it in a comment with the rationale.
- **WC avatar interpretation:** WC stands for "Web Craft" in the mockup (the placeholder name). Keep it as initials but **do not** show "WebCraft" anywhere else — the product is Orion's Belt.

## Notes & hints (non-binding)

- Use `lucide-react` for every icon: `Home`, `Menu`, `List`, `Star`, `Search`, `Bell`, `HelpCircle`.
- The `(rmx)` route group is a Next.js App Router convention — folder name in parens does not contribute to the URL but lets you scope a layout.
- For Aurora properties, examples to inspire (do not copy verbatim — these are templates):
  - "Aurora Heights" — residential, 12 units, 2-bed/2-bath averaging $1,800/mo.
  - "The Northside Lofts" — residential, 18 units, mixed studios and 1-bed.
  - "Riverview Commerce Park" — commercial, 4 units.
  - "Oakwood Manufactured Community" — manufactured housing, 8 units.
- Pull realistic Cincinnati neighborhoods (Northside, Walnut Hills, Oakley, Hyde Park, Mt. Adams, Mason, West Chester, Florence KY, Covington KY).
- Keep all Aurora content data-only (in `seed.sql`) — never hardcode any property name in component code.