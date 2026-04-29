# AI Stock Images — Design

**Date:** 2026-04-29
**Status:** Approved
**Scope:** Give the AI editor (and initial site generation) a real catalog of
image URLs to choose from when populating Image components. Today the AI can
emit `setProp` against an Image's `src` but has no idea what URLs are valid,
so it either invents a broken URL or refuses.

## Problem

The AI Edit prompt (`apps/web/lib/ai/prompts/ai-edit.ts`) and the initial
generation prompt (`apps/web/lib/ai/prompts/initial-generation.ts`) embed
the component catalog and data sources, but never tell the model which
image URLs exist. The same gap blocks initial site generation: a freshly
generated site has either placeholder images or hallucinated URLs that 404.

Fix: store a stock-image library in Supabase, expose it to the AI prompts
as a "pick from this list" catalog, and let users add their own per-site
images via a new section in the editor's Site tab.

## Library scope

**Global seed + per-site additions** (one shared table, nullable `site_id`):

- 25 demo images shipped via a seed migration. `site_id IS NULL` marks them
  as global defaults visible to every site.
- Per-site uploads written from the editor have `site_id = <site uuid>` and
  are visible only to that site.
- The AI prompt sees `WHERE site_id IS NULL OR site_id = <current site>`.

Rationale: every fresh site has a working library on day one; users grow
their own as needed; one query path; one UI list.

## Data model

### Bucket: `ai-stock-images` (public)

Mirrors the existing `site-media` / `logos` / `ai-attachments` posture: a
public bucket so the returned `getPublicUrl` works in `<img src>` without
signed URLs. New migration: `<timestamp>_create_ai_stock_images_bucket.sql`,
idempotent on `bucket id` (matches `20260428000001_create_site_media_bucket.sql`).

Storage paths:

- Globals: `default/<category>/<filename>` — e.g. `default/CustomerPhotos/SmilingHeadshot1.jpg`
- Per-site: `<site_id>/<timestamp>-<sanitized-filename>` — matches the
  `Date.now()`-prefix convention in `apps/web/lib/storage/index.ts`.

### Table: `ai_stock_images`

```sql
create table ai_stock_images (
  id           bigserial primary key,
  site_id      uuid null references sites(id) on delete cascade,
  storage_path text not null,
  public_url   text not null,
  category     text null,
  description  text not null,
  created_at   timestamptz default now(),
  unique (storage_path)
);

create index ai_stock_images_site_id_idx on ai_stock_images (site_id);

alter table ai_stock_images enable row level security;

create policy "ai_stock_images demo full access"
  on ai_stock_images
  for all
  using (true)
  with check (true);
```

- `site_id NULL` ⇒ global default; non-null ⇒ per-site upload.
- `category` is only set on globals (e.g. `CustomerPhotos`); null on
  per-site uploads. Per-site grouping is by `created_at` (descending).
- `description` is required (`not null`) — it's what the AI reads to pick.
- `unique (storage_path)` makes the seed migration idempotent and prevents
  the same per-site upload from double-inserting.
- RLS demo-permissive policy mirrors `rm_unit_images` and the rest of the
  demo tables. Replace once real auth lands per `PROJECT_SPEC.md` §17 / §3.1.

### Seed images (one-time)

Source: `C:\Users\maxwa\OneDrive\Desktop\NebulaDemoPhotos\Property Images\`,
across six subfolders:

| Folder                  | Files                                              | Category meaning                                  |
|-------------------------|----------------------------------------------------|---------------------------------------------------|
| `CustomerPhotos`        | `SmilingHeadshot1/2/3.jpg`                         | Headshots for testimonials / team                 |
| `InteriorPics`          | `Interior1/2/3.jpg`                                | Apartment / unit interiors                        |
| `MFHPropertyPics`       | `MFH1/2.jpg`, `MFH3.jpeg`                          | Multi-family housing — apartment complexes        |
| `MFPropertyPics`        | `MF1/2/3.jpg`, `MFGroup1/2.jpg`, `MfGroup3.jpg`    | Manufactured housing — trailers / mobile homes    |
| `ProfessionalPeoplePics`| `2peopleworkingonIpad.jpg`, `3peoplecollaborating.jpg`, `ShakingHandsPhoto.jpg`, `TeamPhoto.jpg` | Business / team / collaboration scenes |
| `SFHPropertyPics`       | `SFH1/2.jpg`, `SFH5.jpeg`, `SFHGroup1/2.jpg`, `SFHGroup3.avif` | Single-family homes — exteriors and groupings |

Skipped: `SFHPropertyPics/SFH3.htm` (HTML, not an image).

**Total seed rows: 25.**

Process:

1. A one-time upload script `scripts/seed-ai-stock-images.ts` (committed,
   so it's reproducible if a future env needs re-seeding) walks the disk
   folder and uploads each file to `default/<category>/<filename>` in the
   `ai-stock-images` bucket via the service-role client. The script reads
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` and the
   source folder path from a CLI arg, so it's not hardwired to one
   developer's machine.
2. A seed migration `<timestamp>_seed_ai_stock_images.sql` inserts 25 rows
   with `site_id NULL`, `category` set, `description` filled in. Idempotent
   via `on conflict (storage_path) do nothing`.
3. Descriptions are drafted by Claude based on filename + category and
   reviewed by the user before the migration is committed.

## Storage + upload flow (per-site)

### Browser-side upload

New `uploadStockImage(file, siteId)` in `apps/web/lib/storage/index.ts`,
mirroring the existing `uploadSiteMedia` / `uploadLogo` / `uploadAttachment`
helpers:

```ts
export const AI_STOCK_IMAGES_BUCKET = "ai-stock-images";

export function uploadStockImage(file: File, siteId: string): Promise<UploadResult> {
  const path = `${siteId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return uploadTo(AI_STOCK_IMAGES_BUCKET, file, path);
}
```

(`uploadTo` may need a small refactor to accept a custom path — today it
hardcodes `${Date.now()}-${sanitizeFilename(...)}`. The refactor is
behavior-preserving for existing callers.)

### Server route: `/api/ai-stock-images`

A single route file (`apps/web/app/api/ai-stock-images/route.ts` plus
`apps/web/app/api/ai-stock-images/[id]/route.ts`) exposes:

- **`GET /api/ai-stock-images?siteId=…`** — returns
  `{ defaults: StockImageRow[], perSite: StockImageRow[] }`. Defaults sorted
  by `category` then `id`; per-site sorted by `created_at desc`.
- **`POST /api/ai-stock-images`** — body `{ siteId, storage_path, public_url, description }`.
  Validates description is non-empty. Inserts row via service-role client.
  Returns the inserted row.
- **`PATCH /api/ai-stock-images/[id]`** — body `{ description }`. Updates
  description on a per-site row. 403 if target row has `site_id IS NULL`.
- **`DELETE /api/ai-stock-images/[id]`** — deletes the storage object AND
  the DB row in one handler. 403 if target row has `site_id IS NULL`.

All handlers use the service-role client so the DB writes don't require
adding a separate anon-write RLS policy. The browser still uploads to
storage directly with the anon key (matching existing demo posture).

### Edit / delete behavior

- Per-site rows: editable description (click → input → blur saves), delete
  button with `window.confirm("Delete this image? The AI won't see it
  anymore.")`.
- Global rows: read-only description, no delete button.

## UI

All under `apps/web/components/editor/sidebar/site-tab/`, inserted into
`SiteTab.tsx` between `<PaletteSelector />` and `<FontSelector />`:

```
site-tab/
├─ AiStockImagesSection.tsx     ← top-level section, fetches + renders
├─ AiStockImageRow.tsx          ← one image row (thumb + description + delete)
├─ AiStockImageUploadModal.tsx  ← file picker + description input on submit
└─ useAiStockImages.ts          ← hook: fetch + mutate (upload/edit/delete)
```

### Layout

```
┌─ AI Stock Images ──────────────────────────────┐
│ [+ Upload image]                               │
│                                                │
│ Default                                        │
│   ┌─────┐ Smiling professional headshot…       │
│   │ img │                                      │
│   └─────┘                                      │
│   ┌─────┐ Modern apartment interior…           │
│   …                                            │
│                                                │
│ Yours                                          │
│   ┌─────┐ [editable description input…]   [×]  │
│   …                                            │
│   (empty state if no per-site uploads:         │
│    "Upload images to expand the AI's library") │
└────────────────────────────────────────────────┘
```

### Behaviors

- Section header is collapsible (matches `PaletteSelector` patterns) so the
  25-image default list doesn't dominate the panel.
- Upload modal: file picker → preview thumbnail → required description
  textarea → "Upload" button. Disabled while uploading. Spinner on submit.
- File-type guard: accepts `image/jpeg, image/png, image/webp, image/avif`.
  Rejects others with inline error.
- Empty `Yours` state shows a hint: "Upload images to expand the AI's
  library."
- The hook `useAiStockImages(siteId)` mirrors `useSubmissionsList` —
  vanilla `useState + useEffect + fetch` with cancel tokens. No SWR.

## AI prompt integration — AI Edit

### New snippet

`apps/web/lib/ai/prompts/snippets/stock-images.ts`:

```ts
export type StockImageRow = {
  id: number;
  site_id: string | null;
  storage_path: string;
  public_url: string;
  category: string | null;
  description: string;
};

export function buildStockImagesProse(images: StockImageRow[]): string {
  if (images.length === 0) return "";
  const lines = images.map((img) => {
    const tag = img.site_id === null
      ? `(default — ${img.category ?? "uncategorized"})`
      : "(per-site)";
    return `- ${img.public_url} — ${tag} — ${img.description}`;
  });
  return [
    "# Available stock images",
    "",
    "When setting an Image component's `src` prop, choose from this catalog.",
    "Use the URL exactly as written. Do not invent image URLs. If no image",
    "in the catalog fits the user's request, ask a clarifying question",
    "rather than guess.",
    "",
    ...lines,
  ].join("\n");
}
```

### Prompt wiring

`AiEditPromptInput` in `apps/web/lib/ai/prompts/ai-edit.ts` gains
`stockImages?: StockImageRow[]`. The prose is inserted between the
`# Data sources` and `# Operations` sections (peer to the data-source
catalog). When `stockImages` is empty/undefined the section is omitted —
prompt remains backward-compatible with existing fixtures.

### Orchestrator wiring

`AiEditInput` in `apps/web/lib/ai/ai-edit.ts` gains
`stockImages?: StockImageRow[]`, passed straight through to
`buildAiEditSystemPrompt`. Default: empty.

### Route wiring

`apps/web/app/api/ai-edit/route.ts` fetches per-request:

```ts
const stockImages = await fetchStockImagesForSite(siteId);
// SELECT * FROM ai_stock_images WHERE site_id IS NULL OR site_id = $1
const result = await aiEdit({ ...input, stockImages });
```

No caching for now (~25 globals + small per-site lists, query is cheap).
Add an in-memory TTL cache only if profiling shows it.

### Fixture cache impact

`lookupAiEditFixture` (`apps/web/lib/ai/fixtures.ts`) hashes
`prompt + siteId + currentVersionId + selection`. Stock images are NOT
added to the hash. Existing fixture keys remain stable.

Edge case considered: a user could upload an image and then make an AI
edit without saving (so `currentVersionId` is unchanged), causing the
fixture to be keyed against a now-stale image list. Acceptable because
fixtures are only consulted on a *live* call failure — the happy path
always sees fresh images. A stale fixture returning operations that
reference an older URL set is no worse than today's behavior, where
fixtures know nothing about images at all.

### Token cost

~80 chars per row × ~30 rows = ~2,400 chars (~600 tokens). Negligible
relative to the existing prompt which embeds the full SiteConfig.

## AI prompt integration — Initial Site Generation

Same shape as AI Edit, smaller scope. At initial generation time there is
no `siteId` yet, so only globals are available.

### Reuse the same snippet

`buildStockImagesProse` is reused. No new file.

### Prompt wiring

`apps/web/lib/ai/prompts/initial-generation.ts` — its input type gains
the same `stockImages?: StockImageRow[]` field. Prose is inserted between
data sources and the schema directive (mirroring AI Edit's placement).

The directive wording differs slightly to match the generation context:

```
When populating Image components in the generated site, choose `src`
from this catalog. Prefer images whose category matches the property
type the user described. Do not invent image URLs.
```

### Orchestrator wiring

`InitialGenerationInput` in `apps/web/lib/ai/generate-initial-site.ts`
gains `stockImages?: StockImageRow[]`, passed straight through to
`buildInitialGenerationSystemPrompt`. Default: empty.

### Route wiring

`apps/web/app/api/generate-initial-site/route.ts` fetches globals once per
request:

```sql
SELECT * FROM ai_stock_images WHERE site_id IS NULL ORDER BY category, id
```

### Fixture cache impact

`lookupGenerationFixture` hashes the form payload only. Globals are stable
across generations, so existing fixture keys remain valid.

## Testing

Per `PROJECT_SPEC.md` §15.5: unit-test ops, unit-test renderer, one
Playwright E2E.

### Unit tests

- `apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts` —
  handcrafted image arrays → asserts the prose contains URL/category/
  description and the directive text. Asserts empty array returns empty
  string. Asserts site_id null vs non-null produces different tag output.
- `apps/web/lib/ai/__tests__/ai-edit.test.ts` (extend) — pass `stockImages`
  in input, assert the system prompt includes the catalog. One case
  asserts a model response that uses a stock URL via `setProp` validates
  and applies cleanly.
- `apps/web/lib/ai/__tests__/initial-generation.test.ts` (extend) — pass
  `stockImages` in input, assert system prompt contains the catalog. One
  case asserts the model's returned config contains an Image with `src`
  matching one of the catalog URLs.
- `apps/web/app/api/ai-stock-images/__tests__/route.test.ts` — POST /
  PATCH / DELETE / GET cases: happy paths + 400 on missing description +
  403 on attempting to PATCH or DELETE a global (`site_id IS NULL`).
- `apps/web/lib/storage/__tests__/index.test.ts` (extend) —
  `uploadStockImage` happy path against the mocked supabase client matching
  existing patterns.
- `apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx`
  — renders with mocked hook returning `{defaults, perSite}`; clicks
  delete on per-site row; types in description input; submits upload modal.
  Asserts globals show no delete button and no editable description.

### Manual smoke (added to sprint smoke checklist)

1. Open editor → Site tab → "AI Stock Images" section appears between
   Palette and Font.
2. Section shows "Default" with 25 seed images visible.
3. Click "+ Upload image" → pick a JPEG → type description → click Upload
   → row appears under "Yours".
4. Edit the description inline → blur → reload page → edit persists.
5. Delete the per-site row → row disappears → reload → still gone, storage
   object also gone.
6. In AI chat, prompt: "Add a hero image of a smiling customer." → AI
   responds with `setProp` operation using one of the seeded
   `CustomerPhotos` URLs → image renders.
7. Run a fresh initial generation from the setup form → resulting site
   contains real stock-image URLs in Image components, not placeholders.

## Out of scope

- Bulk per-site upload (single-file flow only).
- Global-default management UI (admins use Studio / migrations).
- Per-site-image visibility toggle (every per-site image is visible to the
  AI for that site).
- Image vision auto-captioning (descriptions are written, not generated).
- Real-auth-gated RLS (matches existing demo posture; replace when
  PROJECT_SPEC.md §17 lands).

## Files added / modified

### Added

- `supabase/migrations/<ts>_create_ai_stock_images_bucket.sql`
- `supabase/migrations/<ts>_create_ai_stock_images_table.sql`
- `supabase/migrations/<ts>_seed_ai_stock_images.sql`
- `scripts/seed-ai-stock-images.ts` (one-time upload helper)
- `apps/web/lib/ai/prompts/snippets/stock-images.ts`
- `apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts`
- `apps/web/app/api/ai-stock-images/route.ts`
- `apps/web/app/api/ai-stock-images/[id]/route.ts`
- `apps/web/app/api/ai-stock-images/__tests__/route.test.ts`
- `apps/web/components/editor/sidebar/site-tab/AiStockImagesSection.tsx`
- `apps/web/components/editor/sidebar/site-tab/AiStockImageRow.tsx`
- `apps/web/components/editor/sidebar/site-tab/AiStockImageUploadModal.tsx`
- `apps/web/components/editor/sidebar/site-tab/useAiStockImages.ts`
- `apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx`

### Modified

- `apps/web/components/editor/sidebar/site-tab/SiteTab.tsx` — insert
  `<AiStockImagesSection />` between `<PaletteSelector />` and
  `<FontSelector />`.
- `apps/web/lib/storage/index.ts` — add `AI_STOCK_IMAGES_BUCKET`,
  `uploadStockImage`, refactor `uploadTo` to accept a custom path.
- `apps/web/lib/storage/__tests__/index.test.ts` — extend.
- `apps/web/lib/ai/prompts/ai-edit.ts` — add `stockImages` input field +
  insert prose section.
- `apps/web/lib/ai/prompts/initial-generation.ts` — same.
- `apps/web/lib/ai/ai-edit.ts` — add `stockImages` input + forward.
- `apps/web/lib/ai/generate-initial-site.ts` — add `stockImages` input +
  forward.
- `apps/web/app/api/ai-edit/route.ts` — fetch + pass `stockImages`.
- `apps/web/app/api/generate-initial-site/route.ts` — fetch + pass
  `stockImages`.
- `apps/web/lib/ai/__tests__/ai-edit.test.ts` — extend.
- `apps/web/lib/ai/__tests__/initial-generation.test.ts` — extend.
