# AI Stock Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the AI editor and initial site generation a real catalog of image URLs to choose from when populating Image components, plus an editor UI for adding per-site images.

**Architecture:** Single `ai_stock_images` table with nullable `site_id` (null = global default, non-null = per-site). One `buildStockImagesProse` snippet reused by both AI prompts. Per-site uploads via the editor's Site Settings tab using a new `/api/ai-stock-images` route.

**Tech Stack:** Next.js 15 App Router (Node runtime), TypeScript, Supabase (Postgres + Storage), Vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-04-29-ai-stock-images-design.md`

---

## File Structure

### Created
- `supabase/migrations/<ts>_create_ai_stock_images_bucket.sql`
- `supabase/migrations/<ts>_create_ai_stock_images_table.sql`
- `supabase/migrations/<ts>_seed_ai_stock_images.sql`
- `scripts/seed-ai-stock-images.ts` — one-time upload helper that emits the seed migration
- `apps/web/lib/ai/prompts/snippets/stock-images.ts`
- `apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts`
- `apps/web/app/api/ai-stock-images/route.ts` (GET + POST)
- `apps/web/app/api/ai-stock-images/[id]/route.ts` (PATCH + DELETE)
- `apps/web/app/api/ai-stock-images/__tests__/route.test.ts`
- `apps/web/components/editor/sidebar/site-tab/AiStockImagesSection.tsx`
- `apps/web/components/editor/sidebar/site-tab/AiStockImageRow.tsx`
- `apps/web/components/editor/sidebar/site-tab/AiStockImageUploadModal.tsx`
- `apps/web/components/editor/sidebar/site-tab/useAiStockImages.ts`
- `apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx`

### Modified
- `apps/web/components/editor/sidebar/site-tab/SiteTab.tsx`
- `apps/web/lib/storage/index.ts`
- `apps/web/lib/storage/__tests__/index.test.ts`
- `apps/web/lib/ai/prompts/ai-edit.ts`
- `apps/web/lib/ai/prompts/initial-generation.ts`
- `apps/web/lib/ai/ai-edit.ts`
- `apps/web/lib/ai/generate-initial-site.ts`
- `apps/web/app/api/ai-edit/route.ts`
- `apps/web/app/api/generate-initial-site/route.ts`
- `apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts`
- `apps/web/lib/ai/__tests__/ai-edit.test.ts`
- `apps/web/lib/ai/__tests__/initial-generation.test.ts`

---

## Phase 1 — Data layer

### Task 1: Create the `ai-stock-images` bucket migration

**Files:**
- Create: `supabase/migrations/<ts>_create_ai_stock_images_bucket.sql`

- [ ] **Step 1: Generate the migration file**

Run:
```bash
cd /c/Users/maxwa/WTSZurWay
supabase migration new create_ai_stock_images_bucket
```

Expected: prints the generated path under `supabase/migrations/`.

- [ ] **Step 2: Write the bucket SQL**

Replace the new file's contents with:

```sql
-- Creates the `ai-stock-images` storage bucket. This bucket holds the
-- global stock images (under default/<category>/...) and per-site uploads
-- (under <site_id>/...) that the AI prompts read when populating Image
-- components — distinct from `site-media` (editor inspector uploads),
-- `logos` (setup-form brand uploads), and `ai-attachments` (inspiration
-- screenshots) so storage governance can diverge per surface later.
--
-- Public read matches the existing demo posture (other buckets are PUBLIC
-- per Sprint 2c). When real auth lands the bucket can be flipped to private
-- and replaced with a signed-URL flow.
--
-- Idempotent on bucket id so re-running the migration against an
-- environment where the bucket was created via dashboard is a no-op.

insert into storage.buckets (id, name, public)
values ('ai-stock-images', 'ai-stock-images', true)
on conflict (id) do nothing;
```

- [ ] **Step 3: Push and verify**

Run:
```bash
pnpm db:push
```

Expected: migration applies without error.

Verify in Supabase Studio: bucket `ai-stock-images` exists and is public.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_create_ai_stock_images_bucket.sql
git commit -m "feat(db): create ai-stock-images bucket"
```

---

### Task 2: Create the `ai_stock_images` table migration

**Files:**
- Create: `supabase/migrations/<ts>_create_ai_stock_images_table.sql`

- [ ] **Step 1: Generate the migration file**

```bash
supabase migration new create_ai_stock_images_table
```

- [ ] **Step 2: Write the table SQL**

```sql
-- Catalog table powering the AI's stock-image picker (PROJECT_SPEC.md §9).
-- Rows with `site_id IS NULL` are global defaults visible to every site;
-- rows with non-null `site_id` are per-site uploads visible only to that
-- site. The AI prompts SELECT WHERE site_id IS NULL OR site_id = $1 so
-- one query path serves both layers.
--
-- `category` is only meaningful on globals (folder of origin under the
-- demo seed) and is null for per-site uploads, where ordering is by
-- created_at desc instead.
--
-- `description` is required because it's the field the AI reads to choose
-- an image. An image without a description is invisible to the AI.
--
-- `unique (storage_path)` keeps the seed migration idempotent and prevents
-- a per-site upload from double-inserting if the route is retried.
--
-- RLS demo-permissive policy mirrors `rm_unit_images` and the rest of the
-- demo tables (PROJECT_SPEC.md §17 / §3.1 — replace once real auth lands).

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

- [ ] **Step 3: Push and verify**

```bash
pnpm db:push
```

Then in Studio: confirm table exists, RLS enabled, policy listed.

- [ ] **Step 4: Regenerate types**

```bash
pnpm db:types
```

Expected: `apps/web/types/database.ts` updates with the new `ai_stock_images` row type.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_create_ai_stock_images_table.sql apps/web/types/database.ts
git commit -m "feat(db): create ai_stock_images table"
```

---

### Task 3: Create the seed-upload script

**Files:**
- Create: `scripts/seed-ai-stock-images.ts`

- [ ] **Step 1: Write the script**

```ts
/**
 * Seed-uploads the demo stock-image library into the ai-stock-images bucket
 * and emits the seed SQL migration with the resolved public URLs.
 *
 * Usage:
 *   pnpm tsx scripts/seed-ai-stock-images.ts \
 *     --source "C:/Users/maxwa/OneDrive/Desktop/NebulaDemoPhotos/Property Images" \
 *     --out "supabase/migrations/<ts>_seed_ai_stock_images.sql"
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent: re-running upserts files (overwrites bucket objects) and the
 * generated SQL uses ON CONFLICT (storage_path) DO NOTHING.
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";

loadEnv({ path: ".env.local" });

const BUCKET = "ai-stock-images";
const SKIP_EXTENSIONS = new Set([".htm", ".html"]);

type Args = { source: string; out: string };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (k: string): string => {
    const i = args.indexOf(`--${k}`);
    if (i === -1 || !args[i + 1]) {
      throw new Error(`Missing --${k} <value>`);
    }
    return args[i + 1];
  };
  return { source: get("source"), out: get("out") };
}

type ImageEntry = {
  category: string;
  filename: string;
  storagePath: string;
  contentType: string;
};

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function walk(sourceDir: string): ImageEntry[] {
  const entries: ImageEntry[] = [];
  const subdirs = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const dirent of subdirs) {
    if (!dirent.isDirectory()) continue;
    const category = dirent.name;
    const folderPath = path.join(sourceDir, category);
    for (const file of fs.readdirSync(folderPath)) {
      const ext = path.extname(file).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) {
        console.warn(`[skip] ${category}/${file} (extension not an image)`);
        continue;
      }
      entries.push({
        category,
        filename: file,
        storagePath: `default/${category}/${file}`,
        contentType: contentTypeFor(file),
      });
    }
  }
  return entries;
}

async function main(): Promise<void> {
  const { source, out } = parseArgs();
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  }
  const admin = createClient(supabaseUrl, serviceKey);

  const entries = walk(source);
  console.log(`Found ${entries.length} images under ${source}`);

  const rows: { storagePath: string; publicUrl: string; category: string }[] = [];

  for (const entry of entries) {
    const localPath = path.join(source, entry.category, entry.filename);
    const buffer = fs.readFileSync(localPath);
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(
      entry.storagePath,
      buffer,
      { contentType: entry.contentType, upsert: true },
    );
    if (uploadError) {
      throw new Error(`Upload failed for ${entry.storagePath}: ${uploadError.message}`);
    }
    const { data } = admin.storage.from(BUCKET).getPublicUrl(entry.storagePath);
    if (!data?.publicUrl) {
      throw new Error(`No public URL for ${entry.storagePath}`);
    }
    rows.push({
      storagePath: entry.storagePath,
      publicUrl: data.publicUrl,
      category: entry.category,
    });
    console.log(`[ok] ${entry.storagePath}`);
  }

  const sqlLines: string[] = [
    "-- Generated by scripts/seed-ai-stock-images.ts.",
    "-- Re-run the script to regenerate after adding/removing source images.",
    "-- Descriptions are HAND-EDITED after generation; the script does not",
    "-- overwrite this file blindly — review before committing.",
    "",
    "insert into ai_stock_images (site_id, storage_path, public_url, category, description) values",
  ];
  const valueLines = rows.map((r, i) => {
    const sep = i === rows.length - 1 ? "" : ",";
    return `  (null, ${sqlString(r.storagePath)}, ${sqlString(r.publicUrl)}, ${sqlString(r.category)}, ${sqlString(`TODO: describe ${r.storagePath}`)})${sep}`;
  });
  sqlLines.push(...valueLines);
  sqlLines.push("on conflict (storage_path) do nothing;");
  sqlLines.push("");

  fs.writeFileSync(out, sqlLines.join("\n"), "utf8");
  console.log(`Wrote ${rows.length} rows to ${out}`);
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script lints**

```bash
pnpm biome check scripts/seed-ai-stock-images.ts
```

Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-ai-stock-images.ts
git commit -m "feat(seed): script for uploading AI stock images and emitting seed SQL"
```

---

### Task 4: Run the seed script and create the seed migration

**Files:**
- Create: `supabase/migrations/<ts>_seed_ai_stock_images.sql` (generated)

- [ ] **Step 1: Generate the migration filename**

```bash
supabase migration new seed_ai_stock_images
```

Note the printed path — pass it as `--out` in the next step.

- [ ] **Step 2: Run the seed script**

```bash
pnpm tsx scripts/seed-ai-stock-images.ts \
  --source "C:/Users/maxwa/OneDrive/Desktop/NebulaDemoPhotos/Property Images" \
  --out supabase/migrations/<paste-the-ts>_seed_ai_stock_images.sql
```

Expected: 25 lines of `[ok] default/<category>/<filename>` and `Wrote 25 rows`.

Verify in Studio: bucket browser shows files under `default/<category>/`.

- [ ] **Step 3: Replace the TODO descriptions with real ones**

Open the generated migration and replace each `TODO: describe ...` with a real description. Drafts (review and edit before committing):

```
default/CustomerPhotos/SmilingHeadshot1.jpg
  Smiling professional headshot, used for testimonials, team rosters, and customer-success sections.
default/CustomerPhotos/SmilingHeadshot2.jpg
  Smiling professional headshot, alternative composition for testimonial / about-us pages.
default/CustomerPhotos/SmilingHeadshot3.jpg
  Smiling professional headshot, third variant for team or testimonial grids.
default/InteriorPics/Interior1.jpg
  Modern apartment interior, neutral tones, good for unit-feature and amenity sections.
default/InteriorPics/Interior2.jpg
  Apartment interior, alternative angle for gallery rotations or unit detail pages.
default/InteriorPics/Interior3.jpg
  Apartment interior, third interior shot for unit galleries.
default/MFHPropertyPics/MFH1.jpg
  Multi-family housing exterior — apartment complex; use for property hero or featured-property sections.
default/MFHPropertyPics/MFH2.jpg
  Multi-family apartment-complex exterior, alternative composition.
default/MFHPropertyPics/MFH3.jpeg
  Multi-family apartment-complex exterior, third variant.
default/MFPropertyPics/MF1.jpg
  Manufactured-housing exterior — single mobile home; use for properties focused on manufactured / trailer housing.
default/MFPropertyPics/MF2.jpg
  Manufactured-home exterior, alternative composition.
default/MFPropertyPics/MF3.jpg
  Manufactured-home exterior, third variant.
default/MFPropertyPics/MFGroup1.jpg
  Manufactured-housing community — multiple mobile homes together; use for park / community sections.
default/MFPropertyPics/MFGroup2.jpg
  Manufactured-housing community, alternative angle.
default/MFPropertyPics/MfGroup3.jpg
  Manufactured-housing community, third community-scale variant.
default/ProfessionalPeoplePics/2peopleworkingonIpad.jpg
  Two professionals collaborating on a tablet; use for service / process / about-us sections.
default/ProfessionalPeoplePics/3peoplecollaborating.jpg
  Three professionals collaborating around a screen; use for team or services sections.
default/ProfessionalPeoplePics/ShakingHandsPhoto.jpg
  Two business people shaking hands; use for partnerships, agreements, or contact sections.
default/ProfessionalPeoplePics/TeamPhoto.jpg
  Group team photo; use for "about us" or team pages.
default/SFHPropertyPics/SFH1.jpg
  Single-family home exterior; use for SFH-focused property listings or hero sections.
default/SFHPropertyPics/SFH2.jpg
  Single-family home exterior, alternative composition.
default/SFHPropertyPics/SFH5.jpeg
  Single-family home exterior, third variant.
default/SFHPropertyPics/SFHGroup1.jpg
  Cluster of single-family homes — neighborhood / community shot.
default/SFHPropertyPics/SFHGroup2.jpg
  Single-family neighborhood, alternative composition.
default/SFHPropertyPics/SFHGroup3.avif
  Single-family neighborhood, third variant (AVIF format).
```

- [ ] **Step 4: Append `on conflict` is already present from the script. Push the migration.**

```bash
pnpm db:push
```

- [ ] **Step 5: Verify**

In Studio, run:
```sql
select count(*) from ai_stock_images where site_id is null;
```
Expected: `25`.

```sql
select category, count(*) from ai_stock_images
where site_id is null group by category order by category;
```
Expected:
```
CustomerPhotos          | 3
InteriorPics            | 3
MFHPropertyPics         | 3
MFPropertyPics          | 6
ProfessionalPeoplePics  | 4
SFHPropertyPics         | 6
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_seed_ai_stock_images.sql
git commit -m "feat(db): seed 25 default AI stock images"
```

---

## Phase 2 — AI prompt integration

### Task 5: Create the stock-images prose snippet

**Files:**
- Create: `apps/web/lib/ai/prompts/snippets/stock-images.ts`
- Create: `apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts`:

```ts
// @vitest-environment node

import { type StockImageRow, buildStockImagesProse } from "@/lib/ai/prompts/snippets/stock-images";
import { describe, expect, it } from "vitest";

const sample: StockImageRow[] = [
  {
    id: 1,
    site_id: null,
    storage_path: "default/CustomerPhotos/SmilingHeadshot1.jpg",
    public_url: "https://example.supabase.co/storage/v1/object/public/ai-stock-images/default/CustomerPhotos/SmilingHeadshot1.jpg",
    category: "CustomerPhotos",
    description: "Smiling professional headshot",
  },
  {
    id: 2,
    site_id: "11111111-1111-1111-1111-111111111111",
    storage_path: "11111111-1111-1111-1111-111111111111/1730000000-pool.jpg",
    public_url: "https://example.supabase.co/storage/v1/object/public/ai-stock-images/11111111-1111-1111-1111-111111111111/1730000000-pool.jpg",
    category: null,
    description: "Outdoor pool",
  },
];

describe("buildStockImagesProse", () => {
  it("returns empty string for an empty list", () => {
    expect(buildStockImagesProse([])).toBe("");
  });

  it("includes the directive text", () => {
    const out = buildStockImagesProse(sample);
    expect(out).toContain("# Available stock images");
    expect(out).toContain("Use the URL exactly as written");
    expect(out).toContain("Do not invent image URLs");
  });

  it("tags global rows with category and per-site rows distinctly", () => {
    const out = buildStockImagesProse(sample);
    expect(out).toContain("(default — CustomerPhotos)");
    expect(out).toContain("(per-site)");
  });

  it("emits the public URL and description for each row", () => {
    const out = buildStockImagesProse(sample);
    expect(out).toContain(sample[0].public_url);
    expect(out).toContain("Smiling professional headshot");
    expect(out).toContain(sample[1].public_url);
    expect(out).toContain("Outdoor pool");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd apps/web && pnpm test snippets/__tests__/stock-images.test.ts -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the snippet**

`apps/web/lib/ai/prompts/snippets/stock-images.ts`:

```ts
/**
 * Prose rendering of the stock-image catalog for the AI Edit and Initial
 * Generation system prompts. The list is dynamic (per-site uploads can
 * change between requests) so this is a build-from-rows function rather
 * than a static constant — see DATA_SOURCES_PROSE for the static-case
 * sibling.
 *
 * The directive is binding: the prompt tells the model to choose URLs
 * verbatim from this list and to ask a clarifying question if no image
 * fits, rather than guess. Without that guard the model invents URLs.
 */

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
    const tag =
      img.site_id === null
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

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm test snippets/__tests__/stock-images.test.ts -- --run
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ai/prompts/snippets/stock-images.ts apps/web/lib/ai/prompts/snippets/__tests__/stock-images.test.ts
git commit -m "feat(ai): stock-images prose snippet for AI prompts"
```

---

### Task 6: Wire stock-images into the AI Edit prompt

**Files:**
- Modify: `apps/web/lib/ai/prompts/ai-edit.ts`
- Modify: `apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts`

- [ ] **Step 1: Add a failing test**

Append to `apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts`:

```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";

describe("buildAiEditSystemPrompt — stock images", () => {
  const stockImages: StockImageRow[] = [
    {
      id: 1,
      site_id: null,
      storage_path: "default/CustomerPhotos/A.jpg",
      public_url: "https://example.com/a.jpg",
      category: "CustomerPhotos",
      description: "Headshot A",
    },
  ];

  it("omits the section when no stock images are passed", () => {
    const out = buildAiEditSystemPrompt({ config: makeConfig(), selection: null });
    expect(out).not.toContain("# Available stock images");
  });

  it("inserts the section when stock images are passed", () => {
    const out = buildAiEditSystemPrompt({
      config: makeConfig(),
      selection: null,
      stockImages,
    });
    expect(out).toContain("# Available stock images");
    expect(out).toContain("https://example.com/a.jpg");
    expect(out).toContain("Headshot A");
  });

  it("places the stock-images section between data sources and operations", () => {
    const out = buildAiEditSystemPrompt({
      config: makeConfig(),
      selection: null,
      stockImages,
    });
    const dataSourcesIdx = out.indexOf("# Data sources");
    const stockIdx = out.indexOf("# Available stock images");
    const opsIdx = out.indexOf("# Operations");
    expect(dataSourcesIdx).toBeGreaterThan(-1);
    expect(stockIdx).toBeGreaterThan(dataSourcesIdx);
    expect(opsIdx).toBeGreaterThan(stockIdx);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test ai-edit-prompt.test.ts -- --run
```

Expected: FAIL on the new tests — `stockImages` is not a valid input field.

- [ ] **Step 3: Modify the prompt builder**

In `apps/web/lib/ai/prompts/ai-edit.ts`:

Add to imports:
```ts
import { type StockImageRow, buildStockImagesProse } from "@/lib/ai/prompts/snippets/stock-images";
```

Update `AiEditPromptInput`:
```ts
export type AiEditPromptInput = {
  config: SiteConfig;
  selection: AiEditSelection | null;
  stockImages?: StockImageRow[];
};
```

In `buildAiEditSystemPrompt`, between the `# Data sources` block and the `# Operations` block, insert:

```ts
  const stockImagesProse = buildStockImagesProse(input.stockImages ?? []);
```

Modify the returned template literal so the section appears between data sources and operations. Find this region:

```
${DATA_SOURCES_PROSE}

# Operations
${OPERATIONS_VOCABULARY}
```

Replace with:

```
${DATA_SOURCES_PROSE}

${stockImagesProse ? `${stockImagesProse}\n` : ""}
# Operations
${OPERATIONS_VOCABULARY}
```

- [ ] **Step 4: Run, verify pass**

```bash
pnpm test ai-edit-prompt.test.ts -- --run
```

Expected: PASS, all tests.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/ai/prompts/ai-edit.ts apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts
git commit -m "feat(ai): inject stock-images catalog into AI Edit system prompt"
```

---

### Task 7: Forward stockImages through the AI Edit orchestrator

**Files:**
- Modify: `apps/web/lib/ai/ai-edit.ts`
- Modify: `apps/web/lib/ai/__tests__/ai-edit.test.ts`

- [ ] **Step 1: Add a failing test**

In `apps/web/lib/ai/__tests__/ai-edit.test.ts` (append a new `describe`):

```ts
describe("aiEdit — stockImages forwarding", () => {
  it("passes stockImages through to the system prompt", async () => {
    const captured: { system: string } = { system: "" };
    const mockClient = {
      messages: {
        create: async (args: { system: string }) => {
          captured.system = args.system;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ kind: "ok", summary: "noop", operations: [] }),
              },
            ],
          };
        },
      },
    } as unknown as Parameters<typeof aiEdit>[1];

    await aiEdit(
      {
        prompt: "do nothing",
        config: makeMinimalConfig(),
        selection: null,
        stockImages: [
          {
            id: 1,
            site_id: null,
            storage_path: "default/X/y.jpg",
            public_url: "https://example.com/x.jpg",
            category: "X",
            description: "test image",
          },
        ],
      },
      mockClient,
    );

    expect(captured.system).toContain("# Available stock images");
    expect(captured.system).toContain("https://example.com/x.jpg");
  });
});
```

(Reuse `makeMinimalConfig` from the existing test file; if it doesn't exist, use the same minimal config pattern as `ai-edit-prompt.test.ts`.)

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test ai-edit.test.ts -- --run
```

Expected: FAIL — `stockImages` not a valid `AiEditInput` field.

- [ ] **Step 3: Modify the orchestrator**

In `apps/web/lib/ai/ai-edit.ts`:

Add to imports:
```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
```

Update `AiEditInput`:
```ts
export type AiEditInput = {
  prompt: string;
  config: SiteConfig;
  selection: AiEditSelection | null;
  attachments?: AiEditAttachment[];
  history?: AiEditHistoryTurn[];
  siteId?: string;
  currentVersionId?: string;
  stockImages?: StockImageRow[];
};
```

In the body, change `promptInput`:
```ts
const promptInput: AiEditPromptInput = {
  config: input.config,
  selection: input.selection,
  stockImages: input.stockImages,
};
```

- [ ] **Step 4: Run, verify pass**

```bash
pnpm test ai-edit.test.ts -- --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ai/ai-edit.ts apps/web/lib/ai/__tests__/ai-edit.test.ts
git commit -m "feat(ai): forward stockImages through aiEdit orchestrator"
```

---

### Task 8: Fetch stock images in the AI Edit route

**Files:**
- Modify: `apps/web/app/api/ai-edit/route.ts`

- [ ] **Step 1: Add a fetch helper**

Append to the route file (above `POST`):

```ts
async function fetchStockImagesForSite(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  siteId: string,
): Promise<StockImageRow[]> {
  const { data, error } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path, public_url, category, description")
    .or(`site_id.is.null,site_id.eq.${siteId}`)
    .order("category", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    console.warn(`[ai-edit] stock-images fetch failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}
```

Add the import at the top:

```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
```

- [ ] **Step 2: Wire the fetch into the orchestrator call**

Find the `aiEdit({...})` call and add `stockImages`:

```ts
const stockImages = await fetchStockImagesForSite(supabase, body.siteId);
const orchestrator = await aiEdit({
  prompt: body.prompt,
  config,
  selection: body.selection ?? null,
  attachments: body.attachments,
  history: body.history,
  siteId: body.siteId,
  currentVersionId: body.currentVersionId,
  stockImages,
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Run existing route tests**

```bash
pnpm test app/api/ai-edit/__tests__/route.test.ts -- --run
```

Expected: existing tests still pass (this change is additive — empty stockImages on a site with no rows behaves identically to today).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/ai-edit/route.ts
git commit -m "feat(ai): fetch stock images for AI Edit route"
```

---

### Task 9: Wire stock-images into the Initial Generation prompt

**Files:**
- Modify: `apps/web/lib/ai/prompts/initial-generation.ts`
- Modify: `apps/web/lib/ai/__tests__/initial-generation.test.ts`

- [ ] **Step 1: Add a failing test**

In `apps/web/lib/ai/__tests__/initial-generation.test.ts` add a new `describe` matching the AI Edit tests' shape:

```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";

describe("buildInitialGenerationSystemPrompt — stock images", () => {
  const stockImages: StockImageRow[] = [
    {
      id: 1,
      site_id: null,
      storage_path: "default/InteriorPics/Interior1.jpg",
      public_url: "https://example.com/interior.jpg",
      category: "InteriorPics",
      description: "Modern interior",
    },
  ];

  it("omits the section when no stock images are passed", () => {
    const out = buildInitialGenerationSystemPrompt({ form: makeForm() });
    expect(out).not.toContain("# Available stock images");
  });

  it("inserts the section when stock images are passed", () => {
    const out = buildInitialGenerationSystemPrompt({
      form: makeForm(),
      stockImages,
    });
    expect(out).toContain("# Available stock images");
    expect(out).toContain("https://example.com/interior.jpg");
    expect(out).toContain("Prefer images whose category matches");
  });
});
```

(Reuse the existing `makeForm` helper from the same file or copy the pattern.)

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test initial-generation.test.ts -- --run
```

Expected: FAIL — `stockImages` not a valid input.

- [ ] **Step 3: Modify the prompt builder**

In `apps/web/lib/ai/prompts/initial-generation.ts`:

Add to imports:
```ts
import { type StockImageRow, buildStockImagesProse } from "@/lib/ai/prompts/snippets/stock-images";
```

Add `stockImages?: StockImageRow[]` to the input type.

In the builder function, build the prose and inject it. Use this directive wording (different from AI Edit because the context is generation, not edit):

```ts
const stockImagesProse = buildStockImagesProse(input.stockImages ?? []);
const stockImagesSection = stockImagesProse
  ? `${stockImagesProse}

When populating Image components in the generated site, choose \`src\`
from this catalog. Prefer images whose category matches the property
type the user described. Do not invent image URLs.

`
  : "";
```

Insert `${stockImagesSection}` between the data-sources block and the schema directive (mirror the AI Edit placement).

- [ ] **Step 4: Run, verify pass**

```bash
pnpm test initial-generation.test.ts -- --run
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/ai/prompts/initial-generation.ts apps/web/lib/ai/__tests__/initial-generation.test.ts
git commit -m "feat(ai): inject stock-images catalog into initial-generation prompt"
```

---

### Task 10: Forward stockImages through the Initial Generation orchestrator

**Files:**
- Modify: `apps/web/lib/ai/generate-initial-site.ts`

- [ ] **Step 1: Add `stockImages` to `InitialGenerationInput`**

```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";

export type InitialGenerationInput = {
  form: SetupFormValues;
  inspirationImages?: InspirationImage[];
  stockImages?: StockImageRow[];
};
```

- [ ] **Step 2: Forward into the prompt builder**

Find the `buildInitialGenerationSystemPrompt(input)` call. The `input` object already includes `stockImages` because we pass `input` through, so no change needed here — verify by reading the call site. If the call destructures, update it to include `stockImages`.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Existing tests still pass**

```bash
pnpm test generate-initial-site -- --run
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ai/generate-initial-site.ts
git commit -m "feat(ai): forward stockImages through generateInitialSite orchestrator"
```

---

### Task 11: Fetch stock images in the Initial Generation route

**Files:**
- Modify: `apps/web/app/api/generate-initial-site/route.ts`

- [ ] **Step 1: Add the fetch helper**

Append above `POST`:

```ts
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";

async function fetchGlobalStockImages(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
): Promise<StockImageRow[]> {
  const { data, error } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path, public_url, category, description")
    .is("site_id", null)
    .order("category", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    console.warn(`[generate-initial-site] stock-images fetch failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}
```

- [ ] **Step 2: Wire into the orchestrator call**

Find:
```ts
const generation = await generateInitialSite({ form, inspirationImages });
```

Replace with:
```ts
const supabaseForFetch = createServiceSupabaseClient();
const stockImages = await fetchGlobalStockImages(supabaseForFetch);
const generation = await generateInitialSite({ form, inspirationImages, stockImages });
```

(The `supabase` client used later for inserts is created separately — keeping the fetch client here for clarity.)

- [ ] **Step 3: Typecheck + existing tests**

```bash
pnpm typecheck
pnpm test app/api/generate-initial-site -- --run
```

Expected: zero errors, existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/generate-initial-site/route.ts
git commit -m "feat(ai): fetch global stock images for initial-generation route"
```

---

## Phase 3 — Editor UI

### Task 12: Refactor `uploadTo` and add `uploadStockImage`

**Files:**
- Modify: `apps/web/lib/storage/index.ts`
- Modify: `apps/web/lib/storage/__tests__/index.test.ts`

- [ ] **Step 1: Refactor `uploadTo` to accept an optional path override**

Current `uploadTo` hardcodes the path. Change it to:

```ts
async function uploadTo(
  bucket: string,
  file: File,
  pathOverride?: string,
): Promise<UploadResult> {
  const supabase = createBrowserSupabaseClient();
  const path = pathOverride ?? `${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(`Upload to ${bucket} failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(`Failed to read public URL for ${bucket}/${path}`);
  }

  return { url: data.publicUrl, path };
}
```

Existing callers (`uploadLogo`, `uploadAttachment`, `uploadSiteMedia`) pass no override and behave identically.

- [ ] **Step 2: Add `AI_STOCK_IMAGES_BUCKET` and `uploadStockImage`**

Add near the other constants:

```ts
export const AI_STOCK_IMAGES_BUCKET = "ai-stock-images";
```

Add at the bottom:

```ts
export function uploadStockImage(file: File, siteId: string): Promise<UploadResult> {
  const path = `${siteId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  return uploadTo(AI_STOCK_IMAGES_BUCKET, file, path);
}
```

- [ ] **Step 3: Extend the integration test**

Append to `apps/web/lib/storage/__tests__/index.test.ts` inside the `describe.skipIf(skipIntegration)` block:

```ts
it("uploadStockImage prefixes the path with siteId", async () => {
  const fakeSiteId = "11111111-1111-1111-1111-111111111111";
  const file = makeTinyPngFile("integration-stock.png");
  const { url, path: storedPath } = await uploadStockImage(file, fakeSiteId);

  expect(url).toMatch(/^https?:\/\//);
  expect(url).toContain("ai-stock-images");
  expect(storedPath.startsWith(`${fakeSiteId}/`)).toBe(true);
  expect(storedPath).toMatch(/\d+-integration-stock\.png$/);

  uploadedPaths.push({ bucket: "ai-stock-images", path: storedPath });
}, 30_000);
```

Add the import at the top: `import { uploadStockImage } from "@/lib/storage";`.

- [ ] **Step 4: Typecheck + run the unit tests in this file**

```bash
pnpm typecheck
pnpm test lib/storage -- --run
```

Expected: unit tests pass; integration tests skip unless `SUPABASE_STORAGE_INTEGRATION=1`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/storage/index.ts apps/web/lib/storage/__tests__/index.test.ts
git commit -m "feat(storage): uploadStockImage with site-id-prefixed path"
```

---

### Task 13: Create the GET + POST route for `/api/ai-stock-images`

**Files:**
- Create: `apps/web/app/api/ai-stock-images/route.ts`
- Create: `apps/web/app/api/ai-stock-images/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for GET and POST**

`apps/web/app/api/ai-stock-images/__tests__/route.test.ts`:

```ts
// @vitest-environment node

import { GET, POST } from "@/app/api/ai-stock-images/route";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

import { createServiceSupabaseClient } from "@/lib/supabase";

function mockSupabaseFor(handlers: {
  select?: () => Promise<{ data: unknown; error: unknown }>;
  insert?: (row: unknown) => Promise<{ data: unknown; error: unknown }>;
}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(function (this: unknown) {
      // last `.order(...)` resolves the chain — return the promise from `select`.
      return handlers.select ? handlers.select() : Promise.resolve({ data: [], error: null });
    }),
    single: vi.fn().mockImplementation(() => {
      return handlers.insert
        ? handlers.insert(undefined)
        : Promise.resolve({ data: null, error: null });
    }),
  };
  return {
    from: vi.fn(() => builder),
  };
}

describe("GET /api/ai-stock-images", () => {
  it("returns 400 when siteId is missing", async () => {
    const req = new Request("http://test/api/ai-stock-images");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns defaults + perSite split", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseFor({
        select: () =>
          Promise.resolve({
            data: [
              { id: 1, site_id: null, storage_path: "default/A/x.jpg", public_url: "u1", category: "A", description: "d1" },
              { id: 2, site_id: "11111111-1111-1111-1111-111111111111", storage_path: "11111111-1111-1111-1111-111111111111/x.jpg", public_url: "u2", category: null, description: "d2" },
            ],
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images?siteId=11111111-1111-1111-1111-111111111111");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { defaults: unknown[]; perSite: unknown[] };
    expect(body.defaults).toHaveLength(1);
    expect(body.perSite).toHaveLength(1);
  });
});

describe("POST /api/ai-stock-images", () => {
  it("returns 400 on missing description", async () => {
    const req = new Request("http://test/api/ai-stock-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: "11111111-1111-1111-1111-111111111111",
        storage_path: "p",
        public_url: "u",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("inserts a row and returns it", async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      mockSupabaseFor({
        insert: () =>
          Promise.resolve({
            data: {
              id: 99,
              site_id: "11111111-1111-1111-1111-111111111111",
              storage_path: "p",
              public_url: "u",
              category: null,
              description: "d",
            },
            error: null,
          }),
      }) as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: "11111111-1111-1111-1111-111111111111",
        storage_path: "p",
        public_url: "u",
        description: "d",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number };
    expect(body.id).toBe(99);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test app/api/ai-stock-images -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

`apps/web/app/api/ai-stock-images/route.ts`:

```ts
/**
 * GET  /api/ai-stock-images?siteId=<uuid>
 *   → { defaults: StockImageRow[], perSite: StockImageRow[] }
 *
 * POST /api/ai-stock-images
 *   body: { siteId: string, storage_path: string, public_url: string, description: string }
 *   → inserted row (StockImageRow)
 *
 * Browser direct-uploads the file to the bucket via lib/storage helpers,
 * then POSTs here to register the description + DB row. Service-role
 * client is used so the table doesn't need a permissive write RLS path
 * for the anon role (matches the route-vs-storage split used elsewhere
 * in the demo).
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import { z } from "zod";
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  siteId: z.string().uuid(),
  storage_path: z.string().min(1),
  public_url: z.string().url(),
  description: z.string().min(1, "description is required"),
});

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return jsonError(400, "siteId query param is required");
  }
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path, public_url, category, description")
    .or(`site_id.is.null,site_id.eq.${siteId}`)
    .order("category", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    return jsonError(503, error.message);
  }
  const rows = (data ?? []) as StockImageRow[];
  const defaults = rows.filter((r) => r.site_id === null);
  const perSite = rows.filter((r) => r.site_id !== null);
  return json(200, { defaults, perSite });
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Body is not valid JSON");
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, JSON.stringify(parsed.error.issues));
  }
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ai_stock_images")
    .insert({
      site_id: parsed.data.siteId,
      storage_path: parsed.data.storage_path,
      public_url: parsed.data.public_url,
      category: null,
      description: parsed.data.description,
    })
    .select("id, site_id, storage_path, public_url, category, description")
    .single();
  if (error || !data) {
    return jsonError(503, error?.message ?? "insert returned no row");
  }
  return json(200, data);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm test app/api/ai-stock-images -- --run
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/ai-stock-images/route.ts apps/web/app/api/ai-stock-images/__tests__/route.test.ts
git commit -m "feat(api): GET + POST /api/ai-stock-images"
```

---

### Task 14: Create the PATCH + DELETE route for `/api/ai-stock-images/[id]`

**Files:**
- Create: `apps/web/app/api/ai-stock-images/[id]/route.ts`
- Modify: `apps/web/app/api/ai-stock-images/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests**

Append to the existing `route.test.ts`:

```ts
import { DELETE, PATCH } from "@/app/api/ai-stock-images/[id]/route";

describe("PATCH /api/ai-stock-images/[id]", () => {
  it("returns 400 on missing description", async () => {
    const req = new Request("http://test/api/ai-stock-images/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when target row has site_id null", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, site_id: null },
        error: null,
      }),
    };
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      { from: vi.fn(() => builder) } as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "new" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/ai-stock-images/[id]", () => {
  it("returns 403 when target row is global (site_id null)", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, site_id: null, storage_path: "p" },
        error: null,
      }),
    };
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      { from: vi.fn(() => builder) } as unknown as ReturnType<typeof createServiceSupabaseClient>,
    );

    const req = new Request("http://test/api/ai-stock-images/1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test app/api/ai-stock-images -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

`apps/web/app/api/ai-stock-images/[id]/route.ts`:

```ts
/**
 * PATCH  /api/ai-stock-images/[id]   body: { description: string }
 * DELETE /api/ai-stock-images/[id]
 *
 * Both reject (403) when the target row has site_id IS NULL — globals
 * are read-only from the editor surface and managed via migration.
 * DELETE removes the storage object first (best-effort) then the DB row.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_STOCK_BUCKET = "ai-stock-images";

const patchSchema = z.object({
  description: z.string().min(1, "description is required"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) return jsonError(400, "id must be numeric");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Body is not valid JSON");
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, JSON.stringify(parsed.error.issues));
  }

  const supabase = createServiceSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("ai_stock_images")
    .select("id, site_id")
    .eq("id", numericId)
    .single();
  if (fetchError || !existing) return jsonError(404, "row not found");
  if (existing.site_id === null) {
    return jsonError(403, "globals cannot be edited from the editor");
  }

  const { data: updated, error: updateError } = await supabase
    .from("ai_stock_images")
    .update({ description: parsed.data.description })
    .eq("id", numericId)
    .select("id, site_id, storage_path, public_url, category, description")
    .single();
  if (updateError || !updated) return jsonError(503, updateError?.message ?? "update failed");

  return json(200, updated);
}

export async function DELETE(_request: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) return jsonError(400, "id must be numeric");

  const supabase = createServiceSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path")
    .eq("id", numericId)
    .single();
  if (fetchError || !existing) return jsonError(404, "row not found");
  if (existing.site_id === null) {
    return jsonError(403, "globals cannot be deleted from the editor");
  }

  // Best-effort storage cleanup. If it fails, log and continue — the DB
  // delete is the source of truth for AI visibility.
  const { error: storageError } = await supabase.storage
    .from(AI_STOCK_BUCKET)
    .remove([existing.storage_path]);
  if (storageError) {
    console.warn(`[ai-stock-images] storage cleanup failed for ${existing.storage_path}: ${storageError.message}`);
  }

  const { error: dbError } = await supabase
    .from("ai_stock_images")
    .delete()
    .eq("id", numericId);
  if (dbError) return jsonError(503, dbError.message);

  return new Response(null, { status: 204 });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 4: Run, verify pass**

```bash
pnpm test app/api/ai-stock-images -- --run
```

Expected: all PATCH + DELETE tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/ai-stock-images/[id]/route.ts apps/web/app/api/ai-stock-images/__tests__/route.test.ts
git commit -m "feat(api): PATCH + DELETE /api/ai-stock-images/[id] (globals read-only)"
```

---

### Task 15: Create `useAiStockImages` hook

**Files:**
- Create: `apps/web/components/editor/sidebar/site-tab/useAiStockImages.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { useCallback, useEffect, useRef, useState } from "react";

export type AiStockImagesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; defaults: StockImageRow[]; perSite: StockImageRow[] };

const GENERIC_ERROR = "Couldn't load stock images.";

export function useAiStockImages(siteId: string | null): {
  state: AiStockImagesState;
  refetch: () => void;
  uploadAndRegister: (args: {
    storage_path: string;
    public_url: string;
    description: string;
  }) => Promise<void>;
  updateDescription: (id: number, description: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
} {
  const [state, setState] = useState<AiStockImagesState>({ status: "loading" });
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(() => {
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    if (!siteId) {
      setState({ status: "ready", defaults: [], perSite: [] });
      return;
    }
    setState({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch(
          `/api/ai-stock-images?siteId=${encodeURIComponent(siteId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
          return;
        }
        const body = (await res.json()) as {
          defaults: StockImageRow[];
          perSite: StockImageRow[];
        };
        if (!token.cancelled) {
          setState({ status: "ready", defaults: body.defaults, perSite: body.perSite });
        }
      } catch {
        if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
      }
    })();
  }, [siteId]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, [load]);

  const uploadAndRegister = useCallback(
    async (args: { storage_path: string; public_url: string; description: string }) => {
      if (!siteId) throw new Error("No siteId");
      const res = await fetch("/api/ai-stock-images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, ...args }),
      });
      if (!res.ok) throw new Error(`Register failed: ${res.status}`);
      load();
    },
    [siteId, load],
  );

  const updateDescription = useCallback(
    async (id: number, description: string) => {
      const res = await fetch(`/api/ai-stock-images/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/ai-stock-images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      load();
    },
    [load],
  );

  return { state, refetch: load, uploadAndRegister, updateDescription, remove };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/sidebar/site-tab/useAiStockImages.ts
git commit -m "feat(editor): useAiStockImages hook"
```

---

### Task 16: Create `AiStockImageRow` component

**Files:**
- Create: `apps/web/components/editor/sidebar/site-tab/AiStockImageRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { useState } from "react";

type Props = {
  row: StockImageRow;
  editable: boolean;
  onUpdateDescription?: (id: number, description: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
};

export function AiStockImageRow({ row, editable, onUpdateDescription, onDelete }: Props) {
  const [draft, setDraft] = useState(row.description);
  const [busy, setBusy] = useState(false);

  async function handleBlur() {
    if (!editable || !onUpdateDescription || draft === row.description) return;
    setBusy(true);
    try {
      await onUpdateDescription(row.id, draft);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!editable || !onDelete) return;
    if (!window.confirm("Delete this image? The AI won't see it anymore.")) return;
    setBusy(true);
    try {
      await onDelete(row.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-2 py-1">
      <img
        src={row.public_url}
        alt=""
        className="h-12 w-12 flex-shrink-0 rounded object-cover"
      />
      {editable ? (
        <input
          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <p className="flex-1 text-xs text-neutral-700">{row.description}</p>
      )}
      {editable && (
        <button
          type="button"
          aria-label="Delete image"
          className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
          disabled={busy}
          onClick={handleDelete}
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/sidebar/site-tab/AiStockImageRow.tsx
git commit -m "feat(editor): AiStockImageRow component"
```

---

### Task 17: Create `AiStockImageUploadModal` component

**Files:**
- Create: `apps/web/components/editor/sidebar/site-tab/AiStockImageUploadModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { uploadStockImage } from "@/lib/storage";
import { useState } from "react";

type Props = {
  siteId: string;
  onClose: () => void;
  onUploaded: (args: {
    storage_path: string;
    public_url: string;
    description: string;
  }) => Promise<void>;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function AiStockImageUploadModal({ siteId, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (next && !ACCEPTED_TYPES.includes(next.type)) {
      setError("File must be JPG, PNG, WEBP, or AVIF.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleUpload() {
    if (!file || description.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { url, path } = await uploadStockImage(file, siteId);
      await onUploaded({
        storage_path: path,
        public_url: url,
        description: description.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <h2 className="text-base font-semibold">Upload stock image</h2>

        <input
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={busy}
          className="mt-3 block w-full text-sm"
        />

        {file && (
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="mt-3 h-32 w-full rounded object-cover"
          />
        )}

        <textarea
          className="mt-3 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          rows={3}
          placeholder="Describe what's in this image (used by the AI to choose it)"
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border border-neutral-300 px-3 py-1 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || !file || description.trim().length === 0}
            className="rounded bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/sidebar/site-tab/AiStockImageUploadModal.tsx
git commit -m "feat(editor): AiStockImageUploadModal component"
```

---

### Task 18: Create `AiStockImagesSection` component + tests

**Files:**
- Create: `apps/web/components/editor/sidebar/site-tab/AiStockImagesSection.tsx`
- Create: `apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx`

- [ ] **Step 1: Write the section**

`apps/web/components/editor/sidebar/site-tab/AiStockImagesSection.tsx`:

```tsx
"use client";

import { AiStockImageRow } from "./AiStockImageRow";
import { AiStockImageUploadModal } from "./AiStockImageUploadModal";
import { useAiStockImages } from "./useAiStockImages";
import { useState } from "react";

type Props = {
  siteId: string | null;
};

export function AiStockImagesSection({ siteId }: Props) {
  const { state, uploadAndRegister, updateDescription, remove } = useAiStockImages(siteId);
  const [modalOpen, setModalOpen] = useState(false);

  if (!siteId) return null;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Stock Images</h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded bg-neutral-900 px-2 py-1 text-xs text-white"
        >
          + Upload image
        </button>
      </header>

      {state.status === "loading" && (
        <p className="text-xs text-neutral-500">Loading…</p>
      )}
      {state.status === "error" && (
        <p className="text-xs text-red-600">{state.message}</p>
      )}
      {state.status === "ready" && (
        <>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Default
            </p>
            {state.defaults.map((row) => (
              <AiStockImageRow key={row.id} row={row} editable={false} />
            ))}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Yours
            </p>
            {state.perSite.length === 0 ? (
              <p className="py-2 text-xs text-neutral-500">
                Upload images to expand the AI's library.
              </p>
            ) : (
              state.perSite.map((row) => (
                <AiStockImageRow
                  key={row.id}
                  row={row}
                  editable
                  onUpdateDescription={updateDescription}
                  onDelete={remove}
                />
              ))
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <AiStockImageUploadModal
          siteId={siteId}
          onClose={() => setModalOpen(false)}
          onUploaded={uploadAndRegister}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Write the tests**

`apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx`:

```tsx
// @vitest-environment jsdom

import { AiStockImagesSection } from "@/components/editor/sidebar/site-tab/AiStockImagesSection";
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/editor/sidebar/site-tab/useAiStockImages", () => ({
  useAiStockImages: vi.fn(),
}));

import { useAiStockImages } from "@/components/editor/sidebar/site-tab/useAiStockImages";

const defaults: StockImageRow[] = [
  {
    id: 1,
    site_id: null,
    storage_path: "default/A/x.jpg",
    public_url: "https://example.com/x.jpg",
    category: "A",
    description: "Default image",
  },
];

const perSite: StockImageRow[] = [
  {
    id: 2,
    site_id: "11111111-1111-1111-1111-111111111111",
    storage_path: "11111111-1111-1111-1111-111111111111/y.jpg",
    public_url: "https://example.com/y.jpg",
    category: null,
    description: "Per-site image",
  },
];

afterEach(() => vi.clearAllMocks());

describe("AiStockImagesSection", () => {
  it("renders Default and Yours sections", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-1111-1111-111111111111" />);
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Yours")).toBeInTheDocument();
    expect(screen.getByText("Default image")).toBeInTheDocument();
  });

  it("does not show delete button for global rows", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite: [] },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-1111-1111-111111111111" />);
    expect(screen.queryByLabelText("Delete image")).not.toBeInTheDocument();
  });

  it("shows the empty-state hint when no per-site images", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite: [] },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-1111-1111-111111111111" />);
    expect(
      screen.getByText("Upload images to expand the AI's library."),
    ).toBeInTheDocument();
  });

  it("calls remove when the delete button on a per-site row is clicked", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AiStockImagesSection siteId="11111111-1111-1111-1111-111111111111" />);
    fireEvent.click(screen.getByLabelText("Delete image"));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(2));
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test AiStockImagesSection.test.tsx -- --run
```

Expected: PASS, 4 tests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/editor/sidebar/site-tab/AiStockImagesSection.tsx apps/web/components/editor/sidebar/site-tab/__tests__/AiStockImagesSection.test.tsx
git commit -m "feat(editor): AiStockImagesSection with default/yours split"
```

---

### Task 19: Wire `AiStockImagesSection` into `SiteTab`

**Files:**
- Modify: `apps/web/components/editor/sidebar/site-tab/SiteTab.tsx`

- [ ] **Step 1: Modify `SiteTab.tsx`**

Replace contents:

```tsx
"use client";

import { useEditorStore } from "@/lib/editor-state";
import { AiStockImagesSection } from "./AiStockImagesSection";
import { CanvasSettings } from "./CanvasSettings";
import { FontSelector } from "./FontSelector";
import { PaletteSelector } from "./PaletteSelector";

export function SiteTab() {
  const siteId = useEditorStore((s) => s.siteId);
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <PaletteSelector />
      <AiStockImagesSection siteId={siteId} />
      <FontSelector />
      <CanvasSettings />
    </div>
  );
}
```

(`useEditorStore` is the same hook the AI chat uses — see `apps/web/components/editor/ai-chat/useAiEditChat.ts:40` for the canonical pattern.)

- [ ] **Step 2: Typecheck + run editor tests**

```bash
pnpm typecheck
pnpm test components/editor/sidebar/site-tab -- --run
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/editor/sidebar/site-tab/SiteTab.tsx
git commit -m "feat(editor): wire AiStockImagesSection into SiteTab"
```

---

## Phase 4 — Verification

### Task 20: Full quality-gate + manual smoke

- [ ] **Step 1: Run the full §15.7 gate**

```bash
pnpm typecheck && pnpm test --run && pnpm build && pnpm biome check
```

Expected: zero failures, zero warnings.

- [ ] **Step 2: Run the manual smoke**

Start dev server (`pnpm dev`), then:

1. Open editor → Site tab → "AI Stock Images" section appears between Palette and Font.
2. Section shows "Default" with 25 seed images visible.
3. Click "+ Upload image" → pick a JPEG → type description → click Upload → row appears under "Yours".
4. Edit the description inline → blur → reload page → edit persists.
5. Delete the per-site row → row disappears → reload → still gone, storage object also gone (verify in Studio).
6. In AI chat, prompt: "Add a hero image of a smiling customer." → AI responds with `setProp` operation using one of the seeded `CustomerPhotos` URLs → image renders.
7. Run a fresh initial generation from the setup form → resulting site contains real stock-image URLs in Image components, not placeholders.

If any step fails, do not declare the sprint complete — fix the failure and re-run from step 1 of this task.

- [ ] **Step 3: Final commit if anything was tweaked during smoke**

```bash
git add -p   # selectively stage smoke fixes
git commit -m "fix(ai-stock-images): post-smoke fixes"
```

---

## Self-Review Notes

Spec coverage check (against `docs/superpowers/specs/2026-04-29-ai-stock-images-design.md`):

- ✅ Bucket migration → Task 1
- ✅ Table migration with nullable `site_id`, RLS, `unique (storage_path)` → Task 2
- ✅ Seed script (`scripts/seed-ai-stock-images.ts`) → Task 3
- ✅ Seed migration (25 rows, descriptions, idempotent) → Task 4
- ✅ Snippet `buildStockImagesProse` → Task 5
- ✅ AI Edit prompt wiring → Task 6
- ✅ AI Edit orchestrator wiring → Task 7
- ✅ AI Edit route fetch → Task 8
- ✅ Initial Generation prompt wiring → Task 9
- ✅ Initial Generation orchestrator wiring → Task 10
- ✅ Initial Generation route fetch → Task 11
- ✅ `uploadStockImage` storage helper → Task 12
- ✅ GET + POST route → Task 13
- ✅ PATCH + DELETE route (globals 403) → Task 14
- ✅ `useAiStockImages` hook → Task 15
- ✅ `AiStockImageRow` → Task 16
- ✅ `AiStockImageUploadModal` → Task 17
- ✅ `AiStockImagesSection` + tests (defaults read-only, perSite editable) → Task 18
- ✅ SiteTab insertion → Task 19
- ✅ Quality gate + smoke → Task 20

No open dependencies. The `siteId` hook is `useEditorStore((s) => s.siteId)` from `@/lib/editor-state` — the same one used at `apps/web/components/editor/ai-chat/useAiEditChat.ts:40`.
