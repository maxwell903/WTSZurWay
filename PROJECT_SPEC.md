# Orion's Belt — Master Project Specification
 
> Generative website builder for Rent Manager. Authoritative spec for all sprints, prompts, and Claude Code sessions.
 
---
 
## 0. How to Use This Document
 
This is the single source of truth for building Orion's Belt. It is meant to be:
 
1. Pasted into a Claude **Project Instructions** field as long-lived context.
2. Referenced by every Claude Code sprint as the canonical spec.
3. Sliced into smaller `CLAUDE.md` files for individual sprints (template at the bottom).
4. Updated as decisions evolve — but only via this document. If a decision is not written here, it is not real.
Conventions used in this doc:
 
- **MUST / MUST NOT** = non-negotiable for the demo.
- **SHOULD** = strong preference, can defer if blocked.
- **MAY** = nice to have; out of scope unless time permits.
- **OUT OF SCOPE** = explicitly excluded; do not build.
When this doc and the brainstorm doc disagree, **this doc wins.**
 
---
 
## 1. Product Overview
 
### 1.1 What we are building
 
**Orion's Belt** is a generative AI website builder embedded in Rent Manager X (RMX). Property managers fill out a short form, click generate, and get a fully-styled marketing website populated with their live Rent Manager data (units, properties, contact forms). They can then continue editing the site either by chatting with the AI or by manually using a Wix-style drag-and-drop editor. When they're happy, they hit "Deploy" and the site is live at their custom URL.
 
It replaces (or supersedes) Web Template Suite, the existing — and outdated — website tool inside Rent Manager.
 
### 1.2 Why we are building it
 
This is the entry for the **LCS AI Competition** (Pitch Day: April 30). Goals of the build:
 
1. Win the competition.
2. Convince the judges (Brittany Christerson, Dave Hegemann, Ali Ferryman, Tony Little) that this is fundable as a real product.
3. Produce a demo that would make a Rent Manager customer say "I want to use this today."
### 1.3 Target user
 
- Property managers using Rent Manager.
- Specifically: Per Unit Plus subscribers who need a website to qualify for SMS texting compliance, and small-to-mid-sized PMs who want a professional web presence without paying a custom dev shop.
- Non-technical. Expect users who have never written HTML.
### 1.4 What this is NOT
 
- Not a Wix or Webflow competitor in the open market.
- Not a general-purpose CMS.
- Not best-in-industry across the board — we win on **AI generation + native Rent Manager integration**, not on editor breadth.
- For the April 30 demo, not a multi-tenant deployed system. One demo site, one demo user.
### 1.5 Product name
 
The product is **Orion's Belt**. The mockup says "WebCraft" — that's a placeholder; ignore. Use Orion's Belt in all UI, copy, and pitch materials.
 
---
 
## 2. The Three Elements (Architecture)
 
The product is one app with three modes/routes. They share state, components, and a renderer.
 
| Element | Route | Purpose |
|---|---|---|
| **Element 1** | `/setup` (or RMX-embedded `/rmx/wts/new`) | The RMX-shell form where the user enters brand info, uploads logos, picks a palette, optionally writes a prompt. Generates the initial site. |
| **Element 2** | `/{site-slug}/edit` | The editor. Manual drag-and-drop on the left, AI chat on the right, live preview in the center. Where 90% of customer time is spent. |
| **Element 3** | `/{site-slug}` (or `https://www.your-company.com`) | The deployed public website. Renders the site config exactly as Element 2 preview shows it, minus the editor chrome. |
 
### 2.1 Architecture Principles
 
- **One repo. One app. Three routes.** Not three projects.
- **Shared renderer.** Element 2 preview, Element 3 public site, and Element 1 iframe all use the same React renderer reading the same site-config JSON. Build it once.
- **Single source of truth.** A site is a row in `sites` with a `config` JSONB column. Everything renders from that config. Versions are snapshots of that JSON.
- **Element 1 is loosely coupled.** Element 1 fills out the initial config and hands off to Element 2. After that, Element 1 is not authoritative — Element 2 is.
### 2.2 The Element 1 → Element 2 handoff
 
1. User fills Element 1 form.
2. User clicks **Ready to Preview & Edit?**
3. We POST the form payload to `/api/generate-initial-site`. That endpoint calls Claude to produce a site-config JSON.
4. We save the config as version 1 of a new `site` row.
5. The "preview" iframe in Element 1 loads `/{site-slug}/preview` — a read-only render of version 1.
6. User can use the **Request adjustments** chat to send follow-up prompts. Each prompt creates a new version of the config and re-renders the iframe.
7. When the user clicks **Open in Editor**, they jump to `/{site-slug}/edit` (Element 2).
### 2.3 The Element 2 → Element 3 handoff
 
1. User edits in Element 2.
2. User clicks **Deploy**.
3. The current working config is snapshotted as a new version with `is_deployed = true`.
4. Element 3 (`/{site-slug}` or live URL) reads `WHERE is_deployed = true ORDER BY created_at DESC LIMIT 1`.
---
 
## 3. Tech Stack
 
Locked in. Do not deviate without amending this doc.
 
### 3.1 Core
 
- **Next.js 15** (App Router, React Server Components where useful).
- **React 19**, **TypeScript** (strict mode, no `any`).
- **Tailwind CSS** + **shadcn/ui** for component primitives.
- **Supabase** for database (Postgres), auth (placeholder/single user OK for demo), and file storage (logos, images).
- **Anthropic SDK** (`@anthropic-ai/sdk`) for Claude calls. Use `claude-sonnet-4-5` for all generation; fall back to `claude-haiku-4-5` only for trivial classification tasks.
### 3.2 Editor & UI libraries
 
- **dnd-kit** for drag-and-drop (sidebar → canvas, reorder).
- **react-querybuilder** for the visual filter builder.
- **react-colorful** for color pickers.
- **react-hook-form** + **zod** for form validation.
- **Framer Motion** for animation presets (also used for editor micro-interactions).
- **lucide-react** for all iconography.
- **Sonner** for toast notifications.
- **cmdk** for command palette (the "Command Launch" input in the mockup).
### 3.3 State & data
 
- **Zustand** for editor state (selection, sidebar mode, dirty flag).
- **TanStack Query** for server data (sites, versions, mock RM data).
- **jsondiffpatch** for version diffs.
- **superjson** for serializing complex types over the wire.
### 3.4 Infra
 
- Local dev: `pnpm dev`, Supabase local via Docker, `.env.local` for keys.
- Hosting (post-demo): Netlify or Vercel. Stick with Vercel for simpler Next.js deploys.
- Anthropic API key in env, server-side only. Never expose to the client.
### 3.5 Dev tooling
 
- **pnpm** as package manager.
- **Biome** for lint + format (faster than ESLint/Prettier combo).
- **Vitest** for unit tests, **Playwright** for one happy-path E2E (the demo flow).
- **TypeScript strict** + `noUncheckedIndexedAccess`.
---
 
## 4. Repository Layout
 
```
orions-belt/
├── apps/
│   └── web/                       # The Next.js app
│       ├── app/
│       │   ├── (rmx)/             # Element 1 — RMX shell
│       │   │   └── setup/page.tsx
│       │   ├── [site]/
│       │   │   ├── edit/page.tsx  # Element 2 — Editor
│       │   │   ├── preview/page.tsx
│       │   │   └── page.tsx       # Element 3 — Public site
│       │   └── api/
│       │       ├── generate-initial-site/route.ts
│       │       ├── ai-edit/route.ts
│       │       ├── sites/[id]/versions/route.ts
│       │       └── form-submissions/route.ts
│       ├── components/
│       │   ├── rmx-shell/         # Element 1 chrome
│       │   ├── editor/            # Element 2 chrome (sidebars, canvas wrapper)
│       │   ├── renderer/          # Shared Element 2 preview + Element 3 renderer
│       │   ├── site-components/   # The 20+ buildable components (see §6)
│       │   └── ui/                # shadcn/ui primitives
│       ├── lib/
│       │   ├── ai/                # Claude prompts, tool defs, response parsing
│       │   ├── site-config/       # Schema, validators, ops, diffs
│       │   ├── rm-api/            # Mock RM data fetchers (per §5)
│       │   └── supabase/
│       └── types/
├── supabase/
│   ├── migrations/
│   └── seed.sql                   # Mock RM data + demo site
├── PROJECT_SPEC.md                # This file
├── CLAUDE.md                      # Root-level Claude Code instructions
└── package.json
```
 
---
 
## 5. Mock Rent Manager Data
 
For the demo, all RM data is mocked in Supabase. Treat the schema below as the API contract — the renderer should look as if it's hitting a real RM API.
 
### 5.1 Tables (mocked)
 
```sql
-- Properties
create table rm_properties (
 id bigint primary key,
 name text not null,
 short_name text,
 property_type text check (property_type in ('Residential', 'Commercial', 'ManufacturedHousing')),
 email text,
 primary_phone text,
 street text,
 city text,
 state text,
 postal_code text,
 hero_image_url text
);
 
-- Units
create table rm_units (
 id bigint primary key,
 property_id bigint references rm_properties(id),
 unit_name text not null,
 square_footage int,
 bedrooms int,
 bathrooms numeric(3,1),
 current_market_rent numeric(10,2),
 is_available boolean default true,
 available_date date,
 primary_image_url text,
 description text
);
 
-- Unit images (one-to-many)
create table rm_unit_images (
 id bigserial primary key,
 unit_id bigint references rm_units(id),
 image_url text not null,
 display_order int default 0
);
 
-- Property amenities
create table rm_property_amenities (
 property_id bigint references rm_properties(id),
 amenity text,
 primary key (property_id, amenity)
);
 
-- Unit amenities
create table rm_unit_amenities (
 unit_id bigint references rm_units(id),
 amenity text,
 primary key (unit_id, amenity)
);
 
-- Company / tenant of the property manager (the Orion's Belt user's company)
create table rm_company (
 id bigint primary key,
 name text not null,
 legal_name text,
 primary_phone text,
 email text,
 street text,
 city text,
 state text,
 postal_code text,
 logo_url text
);
```
 
### 5.2 Seed data
 
The seed must include:
 
- **1 company row** (the demo company — see §13.4 for the chosen demo brand).
- **6–10 properties** spanning all three property types, with realistic names, addresses, and hero images (use Unsplash URLs).
- **30–60 units** distributed across the properties, with realistic rents, sqft, bed/bath counts, and 1–4 images each.
- **Amenities** that look real ("Pool", "Pet Friendly", "In-Unit Laundry", "Garage Parking", etc.).
Seed via `supabase/seed.sql`. Build a `pnpm seed` script that runs it idempotently.
 
### 5.3 The shape the renderer consumes
 
The renderer never reads tables directly. It calls typed helpers in `lib/rm-api/`:
 
```ts
getProperties(filters?: PropertyFilters): Promise<Property[]>
getUnits(filters?: UnitFilters): Promise<Unit[]>
getCompany(): Promise<Company>
getPropertyById(id: number): Promise<Property | null>
getUnitById(id: number): Promise<Unit | null>
```
 
These helpers wrap Supabase queries today. Tomorrow they become real Rent Manager API calls. Same signatures.
 
---
 
## 6. Component Library (Site Components)
 
Site components are the building blocks Element 2 lets users place on a page. Every component is:
 
- A React component in `components/site-components/{Name}/index.tsx`.
- Registered in `components/site-components/registry.ts` with metadata.
- Editable via a dedicated panel in `components/site-components/{Name}/EditPanel.tsx`.
- Drag-droppable from the left sidebar.
- AI-addressable via stable component IDs in the site config.
### 6.1 Demo target: 20 components
 
For April 30 we ship **20 components**. The rest of the 50-component vision is roadmap. Pick the 20 that maximize demo surface and product-market fit signal.
 
**Demo 20:**
 
1. **Section** — full-width container, holds rows.
2. **Row** — horizontal container, holds columns.
3. **Column** — vertical container, holds elements.
4. **Heading** — H1/H2/H3, configurable.
5. **Paragraph** — long-form text.
6. **Button** — link or action, multiple style presets.
7. **Image** — single image, with alt, fit, rounding.
8. **Logo** — pulls from uploaded primary/secondary logos.
9. **Spacer** — pure vertical whitespace.
10. **Divider** — horizontal rule.
11. **NavBar** — site-wide top nav, configurable links.
12. **Footer** — site-wide footer with company info and links.
13. **HeroBanner** — large image + overlay text + CTA.
14. **PropertyCard** — pre-bound display of one property.
15. **UnitCard** — pre-bound display of one unit.
16. **Repeater** — *the* data-binding component. Wraps a child template (typically a Card) and renders it once per row of a data source. Has a Filters panel.
17. **InputField** — text/email/phone/number input. Bindable to a form.
18. **Form** — wraps inputs + submit button. Submits to `form_submissions`.
19. **MapEmbed** — embedded Google Map for a property address.
20. **Gallery** — image grid (uses a unit's `rm_unit_images`).
### 6.2 Roadmap components (post-demo, not for April 30)
 
Slideshow, Popup, Accordion, Tabs, Testimonial, Pricing Table, FAQ, Contact Block, Social Links, Video Embed, Countdown, Counter Stat, Icon Box, Breadcrumb, Pagination, Search Bar, Filter Dropdown (standalone), Date Picker, Toggle, Checkbox, Radio Group, Select, Textarea, File Upload, Login Form, Signup Form, Tenant Portal Link, Apply Now Button, Schedule Tour Form, Newsletter Signup.
 
### 6.3 Component spec format
 
Every component has a spec at `components/site-components/{Name}/SPEC.md` with:
 
- **Props** (all editable fields with types and defaults).
- **Style controls** (which style properties are exposed in the edit panel).
- **AI ops supported** (which AI operations from §9.4 apply to this component).
- **Data binding** (if any RM fields are bindable — applies mainly to Card-style components).
- **Children policy** (none / one / many, and which component types are allowed as children).
### 6.4 Shared style controls
 
Every component (except primitives like Spacer) supports:
 
- Background color, gradient, or image.
- Padding (top/right/bottom/left, with linked toggle).
- Margin (top/right/bottom/left).
- Border (width, style, color, radius).
- Box shadow (preset list: none, sm, md, lg, xl).
- Width / max-width.
- Visibility (always / desktop only / mobile only).
- Animation preset on enter and on hover (see §6.5).
### 6.5 Animation presets
 
Ten presets, no custom animations:
 
`none`, `fadeIn`, `fadeInUp`, `fadeInDown`, `slideInLeft`, `slideInRight`, `zoomIn`, `bounceIn`, `hoverLift`, `hoverGlow`.
 
All implemented with Framer Motion. Stored as a string enum in component config.
 
---
 
## 7. Element 1 — RMX Shell + Setup Form
 
### 7.1 RMX shell (the chrome)
 
Recreate the chrome shown in the mockup (`image.png`). Specifically:
 
- Top bar: home icon, hamburger menu, list view icon, star icon, **Command Launch** input, company code badge ("my-company"), notifications bell with badge, user avatar ("WC").
- Sub-bar (cyan): page title — **Add Website Template**.
- All elements are visual only. None need to be wired. The Command Launch can be a no-op `cmdk` palette for flavor.
### 7.2 The form
 
Mirrors the mockup exactly. Sections in order:
 
#### General
- **Company Name** *(required)*. Single-line text. Placeholder "e.g. Acme Corporation".
- **Tagline / Slogan**. Single-line. Placeholder "e.g. Building the future, today".
- **Current Website URL**. Single-line. Placeholder "e.g. https://yoursite.com". Used as the slug for the site.
- **Target Audience**. Single-line. Placeholder "e.g. Small business owners aged 30–50".
#### Brand
- **Company Logo (Primary)**. Drag-drop or click-to-browse. PNG/SVG/JPG. Stored in Supabase Storage.
- **Company Logo (Secondary)** *(optional)*.
- **Additional Logos** *(optional, multi-upload)*.
#### Color Scheme
Six fixed palettes (radio cards): **Ocean, Forest, Sunset, Violet, Monochrome, Rose**. Each shows a 4-swatch preview. Required.
 
#### Template Start (new — not in mockup)
A radio group: **AI Generate** (default), **Blank**, **Template: Residential**, **Template: Commercial**, **Template: Manufactured Housing**. Sits above the prompt box.
 
#### Custom Instructions
- Free-text textarea. Placeholder "How would you like me to…? Describe your ideal website — pages, features, tone, inspiration sites, and anything else that matters."
- Inline image attach button (paperclip): user can attach screenshots as inspiration. These go to Claude as image content blocks. **Be explicit in the UI:** "Inspiration only — we won't copy designs pixel-for-pixel."
#### Advanced (collapsed accordion)
- **Property Types Featured** (multi-select: Residential / Commercial / MH).
- **Pages to Include** (multi-select: Home, Properties, Units, About, Contact, Apply Now, Testimonials).
- **Tone** (single select: Professional, Warm, Modern, Bold, Minimal).
- **Primary CTA** (single select: Schedule a Tour, Apply Now, Contact Us, Browse Listings).
- **Brand Voice Notes** (text).
- **Phone Number** (text, will be put in nav and footer).
- **Email** (text, will be put in footer and contact form).
- **Service Area** (text, e.g. "Greater Cincinnati").
- **Years in Business** (number).
- **Number of Properties** (number).
- **Number of Units** (number).
- **Hours of Operation** (text).
- **Social Links** (Facebook / Instagram / LinkedIn / X — text).
That gets us to ~28 fields, under the 30 cap.
 
### 7.3 The preview area
 
Mirrors `image_1.png`. Below the form on the same scrollable page:
 
- **Website Preview** header.
- A fake browser chrome (red/yellow/green dots, back/forward, refresh, URL field showing the user's chosen URL, "Pending" pill on the right that flips to "Live" once generated).
- The preview body:
 - Empty state: file icon + "Fill in your details above to see a live preview of your site."
 - Generating state: full-area loading animation with rotating narration messages (see §9.5).
 - Generated state: an iframe (or inline render) of the generated site config at `/{site-slug}/preview`.
- Below the preview frame:
 - **Request adjustments before going live** with chat input + send arrow + **Apply** button.
 - **Ready to publish?** with helper text and a green **Go Live** button (primary CTA when a version is ready).
- Footer of page: required-fields legend, **Cancel**, **Save**.
The user can also click **Open in Editor** (add this — not in mockup) to jump to Element 2 with the current generation as the working version.
 
### 7.4 Element 1 generate flow
 
1. Validate required fields (Company Name, Color Scheme).
2. Disable the Generate button, show shimmering preview.
3. POST `/api/generate-initial-site` with the full form payload + uploaded image references.
4. Endpoint calls Claude with the system prompt from §9.2 and returns a `SiteConfig`.
5. Insert into `sites` (new row) and `site_versions` (version 1, marked as deployed = false).
6. Redirect the iframe `src` to `/{site-slug}/preview?v=1`.
7. Surface errors with detailed messaging — see §9.6.
### 7.5 Adjustment chat (within Element 1)
 
- Prompt + image attach.
- POST `/api/ai-edit` with `{ siteId, currentVersionId, prompt, attachments }`.
- Receives an `Operation[]` diff (see §9.4), applies it to the current config, saves as new version.
- Iframe refreshes to `?v={newVersionId}`.
---
 
## 8. Element 2 — The Editor
 
### 8.1 Layout
 
```
┌─────────────────────────────────────────────────────────────────┐
│  Top Bar: [Logo] [Site name ▾] [Page selector ▾]    [Preview Toggle]  [Deploy]  [Avatar]  │
├──────────┬───────────────────────────────────────────┬──────────┤
│          │                                           │          │
│   LEFT   │                                           │  RIGHT   │
│  SIDEBAR │             CANVAS                        │ SIDEBAR  │
│          │           (live preview)                  │          │
│  Tabs:   │                                           │  AI chat │
│  - Site  │                                           │   /      │
│  - Pages │                                           │  Edit    │
│  - Add   │                                           │  Panel   │
│  - Data  │                                           │          │
│          │                                           │          │
└──────────┴───────────────────────────────────────────┴──────────┘
```
 
### 8.2 Top bar
 
- **Site name** dropdown: rename, settings.
- **Page selector**: switch between pages, add new page, delete page, reorder pages.
- **Preview Toggle**: switches between Edit Mode (with selection, drag handles, hover outlines) and Preview Mode (clean public-facing render — clicking links navigates within preview).
- **Deploy** button: greyed out if no unsaved changes since last deploy. On click, snapshots current config as a deployed version. Toast confirms.
- **Avatar**: profile menu (no-op for demo).
### 8.3 Left sidebar — primary mode
 
Four tabs:
 
#### Site
Site-wide settings that apply to every page:
- Site title, favicon, meta description.
- Global background, default font family (3–5 options + Google Fonts), default text color.
- Nav bar config (links, logo placement, sticky toggle).
- Footer config (columns, links, copyright text).
- Color palette (initially set from Element 1; editable here).
#### Pages
- List of pages in the site.
- Add new page (modal: name, slug, optional template).
- Delete page (with confirm; can't delete Home).
- Reorder via drag handles.
- Click a page to make it the active canvas page.
#### Add (component palette)
- Search bar.
- Categories: Layout, Content, Media, Data, Forms, Navigation.
- Each component is a draggable card with icon, name, and brief description.
#### Data
- List of data sources (always-on: `properties`, `units`, `company`).
- Custom forms (each form the user creates becomes an entry here showing how many submissions it has received).
### 8.4 Left sidebar — element edit mode (secondary)
 
When the user **right-clicks** a selected element on the canvas, the left sidebar swaps to **Element Edit** mode and shows:
 
#### Tabs (per-component)
- **Content** — props, text values, RM field bindings, child management.
- **Style** — all controls from §6.4 plus component-specific style props.
- **Animation** — entrance preset, hover preset, duration, delay.
- **Visibility** — always / desktop / mobile.
- **Advanced** — custom CSS class (escape hatch), HTML id.
- **Delete** button (with confirm) at the bottom.
A **back arrow** at the top returns to the primary sidebar mode and deselects.
 
### 8.5 The canvas
 
- Renders the current page using the shared renderer (§10).
- In Edit Mode, every component shows a thin outline on hover and a thicker accent outline when selected.
- **Selection model:** left-click selects. Click on empty area deselects. Shift-click adds to selection (multi-select supported for delete and move ops only).
- **Selection handles:** when a component is selected, show 8 resize handles + a move cursor on the component body. Resize is constrained — see §8.6.
- **Drop zones:** when dragging from the Add tab, valid drop zones highlight. Children policies (from each component's spec) determine validity.
- **Grid:** the canvas uses a section-based layout with a coarse 12-column responsive grid inside Rows. Snap to grid columns. **No free pixel positioning.** This is a deliberate simplification.
- **Resizing:** Sections, Rows, Columns, Images, Spacers, and Cards can be resized. Resizing changes width (in column units) and height (in fixed px or `auto`). Other components fill their parent.
- **Reorder:** drag a selected component to move it within its parent or to a sibling container.
### 8.6 Resize, position, and grid mechanics
 
Because the doc explicitly asked for resize-by-dragging:
 
- The canvas is a **12-column grid** at desktop widths, collapsing to **6-column** on tablet and **single-column** on mobile. The user toggles between viewports in the top bar.
- Sections span 12 columns by default and stack vertically.
- Rows can hold multiple Columns. Columns have a `span` (1–12) that the user adjusts by dragging the right edge.
- Vertical positioning is order-based (drag to reorder), not absolute.
- Heights are `auto` by default but can be set to fixed px by dragging a bottom handle on container components.
- This is **NOT pixel-perfect Webflow.** It is closer to Squarespace. Communicate that clearly to anyone asking.
### 8.7 Right sidebar — AI chat
 
The "talk to the site" experience.
 
- Toggle to expand/collapse.
- When collapsed, shows just an icon and a count of pending suggestions.
- When expanded:
 - Messages list (user / assistant turns).
 - Input box with image attach + send.
 - **Selection chip** at the top of the input: shows what's currently selected ("Editing: HeroBanner — `hero_main`"). If nothing is selected, shows "Editing: whole page".
 - **Suggested prompts** chips below the input: contextual to selection (e.g. for a HeroBanner: "Make this taller", "Change the headline", "Add a CTA").
**Flow:**
 
1. User types prompt + (optionally) attaches images.
2. Hit send.
3. Show user message in transcript.
4. Show assistant "thinking…" with rotating narration.
5. POST `/api/ai-edit` with `{ siteId, currentVersionId, prompt, attachments, selection }`.
6. Receives an `Operation[]` diff.
7. Show assistant message: "I made these changes:" + a bulleted summary + **Accept** and **Discard** buttons.
8. **Accept** applies the diff to the working version; canvas re-renders.
9. **Discard** drops the suggestion.
**No version history side-tab in the demo.** Per your call, we replaced version history with simple Accept/Discard against the working version. Deploy is the only durable snapshot.
 
### 8.8 Right sidebar — element edit panel mode
 
Alternative to AI chat. When the user **right-clicks** a selected element, the LEFT sidebar shows the edit panel (§8.4). The right sidebar stays as AI chat throughout. (Originally the doc described both being right-side; we put manual edits on the left for simpler keyboard ergonomics. This is a deliberate deviation from the brainstorm.)
 
### 8.9 Repeaters and filters
 
The most important data binding mechanic. Direct guidance for the implementation:
 
- **Repeater** is a component that wraps a single child template and renders it once per row of a data source.
- Drag a Repeater into a Section/Row/Column.
- In its Content tab:
 - **Data Source**: dropdown — `properties`, `units`, `units_with_property`, `company` (single — disables repeating).
 - **Filters**: a `react-querybuilder` instance configured against the chosen data source's fields. Multiple rules combinable with AND/OR groups.
 - **Connected Inputs**: a list of input fields elsewhere on the page that the user wants to act as live filters. Each connection picks the input and the data field it filters by, and the operator. When any connected input changes value, the Repeater re-queries.
 - **Sort**: field + direction.
 - **Limit**: optional max rows.
 - **Empty State**: rich-text shown when no rows match.
- Inside the Repeater, the user drops a **template component** (typically PropertyCard, UnitCard, or a custom Container with text/image children).
- Children of the template can use **RM Field tokens**: `{{ row.unit_name }}`, `{{ row.current_market_rent | money }}`, `{{ row.property.name }}`. The Content tab on Heading, Paragraph, Image, etc. exposes a "Bind to data" picker that inserts these tokens.
### 8.10 Forms and submissions
 
- Drop a **Form** component. It wraps **InputFields** and a **Button** (set to type=submit).
- In the Form's Content tab: **Form Name** (required, used as `form_id`).
- On submit, Element 3 POSTs to `/api/form-submissions` with `{ form_id, site_id, page_slug, submitted_data }` where `submitted_data` is a JSON object of input names → values.
- Single backing table:
 ```sql
 create table form_submissions (
   id bigserial primary key,
   site_id uuid references sites(id),
   form_id text not null,
   page_slug text,
   submitted_data jsonb not null,
   submitter_ip text,
   user_agent text,
   created_at timestamptz default now()
 );
 ```
- The Data tab in the editor shows a list of `form_id`s with submission counts. Click to see a table view of submissions. **No custom user-defined schema.** This is the simplification we agreed to.
### 8.11 Preview mode
 
- Top bar Preview Toggle hides:
 - Selection outlines.
 - Edit handles.
 - Drop zones.
 - Sidebars (collapse to icons).
- Clicking links navigates between pages in preview.
- Forms are functional (they actually submit).
- Looks identical to Element 3.
### 8.12 Deploy
 
- Click **Deploy** in the top bar.
- Confirmation modal: "Deploy current version to your live site?"
- On confirm: snapshot current config to `site_versions` with `is_deployed = true`. Mark previous deployed version's `is_deployed = false` (only one current deployed version).
- Toast: "Deployed. Your site is live at https://www.your-company.com" with a copy button.
---
 
## 9. AI System
 
### 9.1 The two AI surfaces
 
| Surface | Where | Input | Output |
|---|---|---|---|
| **Initial Generation** | Element 1, after form submit | Full form payload + image attachments | Complete `SiteConfig` JSON |
| **AI Edit** | Element 1 adjustment chat + Element 2 right sidebar | Prompt + attachments + current `SiteConfig` + selection (optional) | `Operation[]` diff to apply to current config |
 
Both run server-side via `/api/...` endpoints. Anthropic API key never leaves the server.
 
### 9.2 Initial Generation system prompt (high level)
 
The system prompt MUST:
 
- State that the model is generating a complete `SiteConfig` JSON for a property management website.
- Provide the full `SiteConfig` schema (TypeScript types, with descriptions).
- Provide the registered component list with their props.
- Provide the available data sources and their fields.
- Set strict output format: a single JSON object matching the schema, no prose, no markdown fences.
- Instruct the model to use only registered components (no invention).
- Instruct the model to use the chosen color palette consistently.
- Instruct the model to bind UnitCard / PropertyCard children to RM fields where appropriate.
- Tell the model to keep the design within a coherent style and not exceed N components per page (cap: 40 components per page).
- Tell the model that if the user attached inspiration screenshots, treat them as *vibe* references only — match feel, not structure.
### 9.3 AI Edit system prompt (high level)
 
The system prompt MUST:
 
- State that the model is producing a *diff* of operations against an existing `SiteConfig`.
- Provide the operations vocabulary (§9.4).
- Provide the current `SiteConfig` JSON.
- Provide the current selection (component IDs and their resolved metadata).
- Set strict output format: a JSON object with `summary: string` and `operations: Operation[]`.
- Instruct the model to ask a clarifying question instead of returning operations if the user's prompt is ambiguous (the response shape allows `{ kind: "clarify", question: string }` as an alternative).
- Forbid the model from inventing components, props, or fields not in the registry.
### 9.4 The Operations vocabulary
 
Define ~25 operations covering the full surface of meaningful edits. Tier them.
 
**Tier 1 (demo MUST-have):**
- `addComponent({ parentId, index, component })`
- `removeComponent({ targetId })`
- `moveComponent({ targetId, newParentId, newIndex })`
- `setProp({ targetId, propPath, value })`
- `setStyle({ targetId, stylePath, value })`
- `setAnimation({ targetId, on: "enter" | "hover", preset, duration?, delay? })`
- `setVisibility({ targetId, visibility })`
- `setText({ targetId, text })` — convenience for Heading/Paragraph/Button label.
- `bindRMField({ targetId, propPath, fieldExpression })`
- `addPage({ name, slug, atIndex?, fromTemplate? })`
- `removePage({ slug })`
- `renamePage({ slug, newName, newSlug? })`
- `setSiteSetting({ path, value })` — site-wide settings.
- `setPalette({ palette })` — switch palette wholesale.
**Tier 2 (nice-to-have for demo):**
- `duplicateComponent({ targetId })`
- `wrapComponent({ targetId, wrapper })`
- `unwrapComponent({ targetId })`
- `reorderChildren({ parentId, newOrder: string[] })`
- `setRepeaterDataSource({ targetId, dataSource })`
- `setRepeaterFilters({ targetId, query })`
- `setRepeaterSort({ targetId, sort })`
- `connectInputToRepeater({ inputId, repeaterId, field, operator })`
**Tier 3 (roadmap, not for demo):**
- Bulk style ops, theme overrides, custom CSS injection, etc.
Each operation is implemented as a pure function `(config, op) => config'` in `lib/site-config/ops.ts`. Apply with `for (const op of operations) config = applyOp(config, op);`.
 
### 9.5 Loading narration
 
Both AI surfaces have rotating narration during the wait. Define a small set per surface; rotate every 3–4 seconds.
 
**Initial Generation narration (in order):**
1. "Reading your brand details…"
2. "Choosing a layout…"
3. "Pulling your Rent Manager properties…"
4. "Generating components…"
5. "Applying your color palette…"
6. "Wiring up your forms…"
7. "Finishing touches…"
**AI Edit narration:**
1. "Reading your request…"
2. "Looking at the current page…"
3. "Planning the changes…"
4. "Writing the diff…"
### 9.6 Error messaging
 
The brainstorm explicitly called out **extensive** error messaging. Rules:
 
- Every AI failure surfaces a structured error in the UI: **what went wrong**, **why**, **what the user can try**.
- Categorize errors:
 - `network_error` → "We couldn't reach our AI service. Check your connection and try again." Retry button.
 - `timeout` → "The AI took too long to respond. Try a shorter or more specific prompt."
 - `model_clarification` → Render the clarifying question as the assistant's reply (not an error).
 - `invalid_output` → "The AI returned something we couldn't parse. Try rephrasing your request." (Don't expose JSON parse errors to the user.) Logs the raw output for us.
 - `operation_invalid` → "One of the AI's suggested changes wouldn't work on this page (e.g., it tried to put a NavBar inside a Button). The change was discarded."
 - `over_quota` / `auth_error` → admin-facing message; user-facing fallback says "Service unavailable, please try again later."
- Errors include a "Copy details" button that copies a structured error report to clipboard for support.
### 9.7 Model and API parameters
 
- Model: `claude-sonnet-4-5`.
- Output mode: structured (request JSON output, validate with Zod against `SiteConfig` for generation, `OperationsResponse` for edits).
- `max_tokens`: 16000 for initial generation, 6000 for edits.
- Temperature: 0.4 for generation (some creativity), 0.2 for edits (precision).
- Retry: one automatic retry on parse failure with a "your previous output failed validation; here's the schema again" follow-up.
### 9.8 Image inputs
 
Users can attach images in both AI surfaces. Send to Claude as image content blocks. Max 4 images per request. Client-side resize to max 1568px on the long edge before upload to keep token costs sane.
 
### 9.9 Cost guardrails
 
- Per-user (or per-site-id) request count and token-usage tracker. Surface in the demo only as an admin-side log.
- For the demo, hardcoded soft limits: 20 generations and 200 edits per site. After that, return a friendly "demo limit reached" error.
### 9.10 Demo fallback (the safety net)
 
Although the user wants live calls, **build a silent fallback path** for stage safety:
 
- Each AI endpoint catches errors and consults a `demo_fixtures` table keyed by a hash of the input.
- For the demo, pre-record 2–3 known-good responses for the canonical demo prompt and the canonical edit prompts. If the live call fails, return the fixture.
- Surface a discreet `[live]` or `[fixture]` indicator in dev mode only — production demo mode hides it.
This is an engineering safety net, not a deception. Disclose internally; don't put it on stage.
 
---
 
## 10. The Renderer (Shared)
 
`components/renderer/` is the heart of the system. One renderer drives:
 
- Element 1 preview iframe.
- Element 2 canvas (Edit and Preview modes).
- Element 3 public site.
### 10.1 Inputs
 
```ts
type RendererProps = {
 config: SiteConfig;
 page: string;          // slug of active page
 mode: "edit" | "preview" | "public";
 selection?: string[];  // component ids, only used in edit
 onSelect?: (id: string) => void;
 onContextMenu?: (id: string) => void;
}
```
 
### 10.2 Behavior
 
- Recursively renders the component tree for `page` from `config`.
- Resolves data bindings (Repeater queries, RM field tokens) by calling `lib/rm-api/`.
- In `edit` mode, wraps each component with a selection-aware shell that handles outline, click, and right-click.
- In `preview` and `public` modes, renders raw — no edit chrome.
- Memoize aggressively. Re-render only the subtree that changed when an op is applied.
### 10.3 Data fetching
 
- Repeater data is fetched at render time via TanStack Query.
- Cache key: `[dataSource, filtersHash, sortHash, limit, connectedInputsState]`.
- In `public` mode, fetching happens server-side via React Server Components when possible to avoid client waterfalls and SEO penalties.
### 10.4 Error boundaries
 
- Every component is wrapped in a per-component error boundary.
- A render error in one component shows a small inline "Component error — click to remove" placeholder; the rest of the page renders fine.
---
 
## 11. Site Config Schema
 
The center of the universe. Lock this early; everything else flows from it.
 
```ts
type SiteConfig = {
 meta: {
   siteName: string;
   siteSlug: string;
   description?: string;
   favicon?: string;
 };
 brand: {
   palette: PaletteId;          // "ocean" | "forest" | etc.
   primaryLogoUrl?: string;
   secondaryLogoUrl?: string;
   additionalLogos?: string[];
   fontFamily: string;
   customColors?: Record<string, string>;  // overrides on top of palette
 };
 global: {
   navBar: NavBarConfig;
   footer: FooterConfig;
 };
 pages: Page[];
 forms: FormDefinition[];       // all forms across all pages, indexed by id
};
 
type Page = {
 id: string;
 slug: string;
 name: string;
 meta?: { title?: string; description?: string };
 rootComponent: ComponentNode;  // always a Section or container
};
 
type ComponentNode = {
 id: string;                    // stable, used by AI ops
 type: ComponentType;           // "Section" | "Heading" | etc.
 props: Record<string, any>;    // type-specific props (validated per component)
 style: StyleConfig;
 animation?: AnimationConfig;
 visibility?: "always" | "desktop" | "mobile";
 children?: ComponentNode[];
 dataBinding?: DataBinding;     // present on Repeater
};
 
type StyleConfig = {
 background?: ColorOrGradient;
 padding?: Spacing;
 margin?: Spacing;
 border?: Border;
 borderRadius?: number;
 shadow?: ShadowPreset;
 width?: SizeUnit;
 height?: SizeUnit;
 textColor?: string;
 // ...
};
 
type DataBinding = {
 source: "properties" | "units" | "units_with_property" | "company";
 filters?: QueryBuilderJson;    // react-querybuilder shape
 connectedInputs?: { inputId: string; field: string; operator: string }[];
 sort?: { field: string; direction: "asc" | "desc" };
 limit?: number;
 emptyState?: ComponentNode;
};
 
type FormDefinition = {
 id: string;                    // user-set, e.g. "contact_us"
 inputIds: string[];            // ids of InputField components in this form
 submitButtonId: string;
 successMessage?: string;
};
```
 
All of this is defined in `lib/site-config/schema.ts` with Zod validators.
 
---
 
## 12. Database Schema (Supabase)
 
```sql
-- The site itself
create table sites (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 owner_id uuid,                        -- placeholder; not enforced for demo
 name text not null,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);
 
-- Versions of the config (every save = new row; every deploy flips is_deployed)
create table site_versions (
 id uuid primary key default gen_random_uuid(),
 site_id uuid references sites(id) on delete cascade,
 config jsonb not null,
 created_by text,                       -- "user" | "ai" | "system"
 source text,                           -- "initial_generation" | "ai_edit" | "manual_edit"
 created_at timestamptz default now(),
 is_working boolean default true,       -- the current edit target
 is_deployed boolean default false,
 parent_version_id uuid references site_versions(id)
);
 
-- Form submissions (single backing table for all user-defined forms)
create table form_submissions (
 id bigserial primary key,
 site_id uuid references sites(id),
 form_id text not null,
 page_slug text,
 submitted_data jsonb not null,
 submitter_ip text,
 user_agent text,
 created_at timestamptz default now()
);
 
-- Demo AI fixtures (for §9.10 fallback)
create table demo_fixtures (
 id bigserial primary key,
 surface text not null,                 -- "initial_generation" | "ai_edit"
 input_hash text not null,
 response jsonb not null,
 created_at timestamptz default now()
);
 
-- File storage handled via Supabase Storage buckets:
-- - "logos"
-- - "ai-attachments"
-- - "unit-images" (mock RM data)
```
 
Plus the `rm_*` tables from §5.
 
---
 
## 13. Demo Plan (April 30)
 
### 13.1 The narrative arc
 
15-minute pitch + Q&A. Suggested allocation:
 
1. **(2 min) Problem.** Show actual screenshots of WTS. Quote a real customer pain. The pitch slide.
2. **(1 min) Solution.** "Here's what we built."
3. **(8 min) Demo.** See script below.
4. **(2 min) Business case.** Pricing model, market sizing, integration story.
5. **(2 min) Roadmap and ask.** What we'd build next, what we need.
### 13.2 The demo script
 
The full demo runs against a single demo company. Pre-seed everything.
 
1. **(0:00–0:30) Open RMX.** Land on the simulated Rent Manager menu. Click into Web Template Suite. The Element 1 page loads.
2. **(0:30–2:00) Fill the form.** Type company name, tagline. Drag in the pre-staged logo file. Pick the Ocean palette. In the prompt: "We manage residential properties in the Cincinnati area. Highlight available units and make it easy for tenants to apply." Drop one inspiration screenshot.
3. **(2:00–3:00) Generate.** Click **Ready to Preview & Edit**. Loading narration plays. ~15 seconds. Site appears in the preview frame. Scroll through it on stage.
4. **(3:00–4:00) First AI adjustment.** "Make the hero darker and add a testimonials section." Apply. Site updates.
5. **(4:00–4:30) Open in editor.** Click into Element 2.
6. **(4:30–6:00) Quick manual edit.** Show the left sidebar. Drag in a Repeater. Bind it to `units`. Drop a UnitCard inside. Show how it auto-renders 8 cards. Add a property dropdown above and connect it as a filter.
7. **(6:00–7:30) AI edit in the editor.** Right sidebar. Select the testimonials section. Type "Replace the placeholder testimonials with three from real PMs in our area, and make this section dark with white text." Accept.
8. **(7:30–8:00) Deploy.** Click Deploy. Toast: "Live at https://www.aurora-cincy.com". Open the URL in a new tab. The site is live.
### 13.3 What you absolutely need ready before stage
 
- Pre-recorded video of the entire demo working, ready to play if anything dies.
- The exact form payload, prompt text, and edit prompts saved as `.txt` snippets for fast typing or paste.
- The seed data already in Supabase, idempotent.
- 2–3 fixture responses for the canonical prompts in `demo_fixtures` for the silent fallback.
- A wired ethernet connection or hotspot, not conference wifi.
- Laptop on AC, screen-sleep disabled, notifications off.
- Local dev running and the site loaded at the correct starting state.
### 13.4 Demo brand
 
Pick one demo company and commit. Suggested:
 
- **Name:** Aurora Property Group
- **Tagline:** "Where Cincinnati feels like home."
- **URL:** `aurora-cincy.com`
- **Palette:** Ocean
- **Property mix:** Residential heavy (8 properties), 1 commercial, 1 MH.
### 13.5 Backup plan tiers
 
- **Tier 1 (everything works):** live demo, live API.
- **Tier 2 (live API down):** silent fallback fixtures kick in, demo continues. No one notices.
- **Tier 3 (whole app down):** play recorded video. Acknowledge briefly: "We're going to play the recording of this morning's run since we have a tight window."
- **Tier 4 (nothing works):** walk through static slides with screenshots. Have the deck ready.
---
 
## 14. Sprint Roadmap
 
Sprints sized to fit a single Claude Code session each. Each sprint produces a working, demoable increment.
 
### Sprint 0 — Foundation
- pnpm monorepo + Next.js 15 app scaffolded.
- Supabase project + local dev configured.
- Tailwind, shadcn/ui, Biome, Vitest set up.
- `.env.local` template committed.
- `CLAUDE.md` at repo root.
- README with setup instructions.
### Sprint 1 — Mock RM data + RMX shell
- Apply migrations for `rm_*` tables and seed.
- Build the RMX shell chrome (top bar, sub-bar) as a layout component.
- Land at `/setup` showing the shell + an empty form skeleton.
### Sprint 2 — Element 1 form
- Build the full form per §7.2 with react-hook-form + Zod.
- Logo uploads to Supabase Storage.
- Color palette radio cards.
- Prompt textarea + image attach.
- "Ready to Preview & Edit" disabled until required fields valid.
### Sprint 3 — Site config schema + base renderer
- Implement `SiteConfig` schema in `lib/site-config/schema.ts`.
- Build the renderer skeleton with Section, Heading, Paragraph, Image.
- Unit tests for renderer with hand-written configs.
- A throwaway "preview a hardcoded config" page for development.
### Sprint 4 — Initial generation endpoint
- `/api/generate-initial-site` calling Claude.
- System prompt with full schema.
- Validator on the response.
- Save site + version 1 to DB.
- Hook up Element 1 generate button → call endpoint → load preview iframe.
- Loading narration component.
- Error UI per §9.6.
### Sprint 5 — More site components
- Add the remaining 16 demo components from §6.1.
- Per-component `EditPanel` skeleton (stub style controls, just to confirm shape).
- Registry wired to renderer.
### Sprint 6 — Element 2 layout shell
- Top bar, left sidebar (tabs), canvas, right sidebar.
- Page selector + add/delete page.
- Site tab with site-wide settings.
- Add tab with draggable component cards (no DnD yet — just static).
- Selection model + outline/handles in renderer's edit mode.
### Sprint 7 — Drag-and-drop
- dnd-kit wired: drag from Add tab to canvas, with valid drop zones.
- Reorder via drag within a parent.
- Resize (column span + height) with handles.
- The canvas now feels like an editor.
### Sprint 8 — Element edit mode (manual)
- Right-click → swap left sidebar to Element Edit.
- Content / Style / Animation / Visibility / Advanced tabs.
- Wire up shared style controls (§6.4) for every component.
- Component-specific content panels for Heading, Paragraph, Button, Image, NavBar, Footer.
### Sprint 9 — Repeaters and filters
- Repeater component + EditPanel.
- react-querybuilder integration against `properties` / `units`.
- Connected Inputs UI.
- Renderer fetches and iterates correctly.
- PropertyCard, UnitCard with RM field tokens.
### Sprint 10 — Forms + submissions
- Form component + InputField bindings.
- `/api/form-submissions` endpoint.
- Data tab in left sidebar shows form_id list with counts.
- A submission table modal.
### Sprint 11 — AI Edit (right sidebar)
- `/api/ai-edit` endpoint.
- Operations vocabulary implemented in `lib/site-config/ops.ts`.
- Right sidebar chat UI.
- Selection chip + suggested prompts.
- Accept / Discard flow.
- Error handling + clarification flow.
### Sprint 12 — Adjustment chat in Element 1
- Reuse `/api/ai-edit` from the Element 1 preview's adjustment input.
- Iframe re-loads on accept.
### Sprint 13 — Deploy + Element 3
- Deploy button → snapshot version.
- Public route `/{site-slug}` reads deployed version.
- Public render via shared renderer in `public` mode.
- "Live at..." toast with copy button.
### Sprint 14 — Demo fallback fixtures
- `demo_fixtures` table populated.
- Server-side fallback wired into both AI endpoints.
- Dev-mode `[live]` / `[fixture]` indicator.
### Sprint 15 — Polish + demo prep
- Loading narration tuned.
- Error copy reviewed.
- Animation presets verified across components.
- Seed verified end-to-end.
- Demo script run-through, end to end, recorded.
### Sprint 16 — Pitch materials
- Slide deck (problem, solution, demo, business case, roadmap, ask).
- Pricing model worksheet.
- Market sizing one-pager.
---
 
## 15. Coding Standards
 
### 15.1 TypeScript
 
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs: `type SiteId = string & { __brand: "SiteId" }`.
### 15.2 React
 
- Server components by default. `"use client"` only where needed.
- One component per file. File name = export name.
- Use `cn(...)` helper from shadcn for class merging.
- No prop drilling deeper than 2 levels — lift to Zustand.
### 15.3 Naming
 
- Files: `kebab-case.ts(x)`.
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- Database tables: `snake_case`.
- DB columns: `snake_case`.
- TypeScript fields: `camelCase` (translate at the boundary).
### 15.4 Commits
 
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- One concern per commit. If a commit message has "and" in it, split it.
### 15.5 Testing
 
- Unit-test every operation in `lib/site-config/ops.ts`.
- Unit-test the renderer with handcrafted configs.
- One Playwright test that runs the full demo script end to end.
- Tests run in CI on push.
### 15.6 Comments
 
- Comment *why*, not *what*. Code says what.
- TODO comments must include a person/owner: `// TODO(max): handle palette overrides`.
- No commented-out code in committed files.
### 15.7 Quality gates (binding for every sprint)
 
A sprint is not "done" until ALL of the following pass with zero failures and zero warnings:
 
- `pnpm test` (Vitest, all tests including new ones).
- `pnpm build` (Next.js production build, zero TypeScript errors).
- `pnpm biome check` (lint + format, zero warnings).
- The sprint's manual smoke test (numbered click-by-click) on a fresh `pnpm dev`.
If any check fails, treat it as a Deviation per §15.8. Do not commit. Do not declare the sprint complete.
 
### 15.8 Deviation discipline
 
Claude Code MUST NOT silently substitute, downgrade, or skip work. The full Deviation Protocol is embedded in §17 (CLAUDE.md template). Every sprint inherits it. Summary:
 
- A deviation is anything that prevents implementing the sprint exactly as planned.
- On detecting a deviation: stop, emit a Deviation Report, wait for explicit user approval.
- Approved alternatives are logged in `/DECISIONS.md` (append-only).
- "I can do it slightly differently" counts as a deviation.
---
 
## 16. Parallel Sprint Execution Protocol
 
The user wants to run multiple Claude Code sessions in parallel where it's safe to do so. To make that work without merge hell:
 
### 16.1 File scope declarations
 
Every sprint declares three lists:
 
- **Owned paths** — paths this sprint exclusively touches.
- **Shared paths** — paths it reads but does not write.
- **Forbidden paths** — paths it must not touch.
Two sprints can run in parallel only if their **owned paths do not intersect**. The Sprint Architect (the planner) enforces this.
 
### 16.2 Git worktrees (recommended)
 
Each parallel sprint gets its own git worktree on its own branch. Example:
 
```bash
git worktree add ../orions-belt-sprint-4 sprint-4
git worktree add ../orions-belt-sprint-5 sprint-5
```
 
One Claude Code session per worktree. Sessions never see each other's working files.
 
### 16.3 Merge order
 
Merge sprints in the order they were *planned*, not the order they finished. Run the full quality gate suite (§15.7) after every merge. If a merge breaks a downstream sprint, the downstream sprint must rebase before continuing.
 
### 16.4 Dependency graph
 
Every batch of sprints comes with a dependency graph showing what runs sequentially vs. in parallel. The Sprint Architect produces this graph with each plan.
 
### 16.5 Conflict flagging
 
If a sprint touches files another in-flight sprint also touches, the Sprint Architect flags it explicitly: "⚠️ Sprint 7 also writes to `lib/site-config/schema.ts`. Merge Sprint 6 first."
 
---
 
## 17. Out of Scope (Explicitly)
 
These are documented as not being built for the demo:
 
- True pixel-perfect positioning canvas.
- User-defined database schemas / dynamic table creation in the editor.
- Multi-tenant deployment to per-customer Netlify subdomains.
- Per-customer Anthropic API keys.
- Authentication beyond a placeholder.
- Mobile editing of the site (the editor is desktop-only; the preview can be toggled to mobile viewport).
- AI-driven custom CSS injection.
- AI ingesting screenshots and reproducing layouts pixel-for-pixel.
- All 30+ roadmap components.
- Tier 3 operations.
- Internationalization.
- Accessibility audit (do basic a11y, but no formal audit).
- Email-on-form-submission notifications.
If a request lands in this list and someone wants it pulled into scope, it MUST come back here as an explicit amendment.
 
---
 
## 18. CLAUDE.md Template (for sprints and prompts)
 
Copy this into the working directory of each Claude Code sprint. Fill in the brackets. The Deviation Protocol block is binding and must be embedded verbatim — do not edit it.
 
```markdown
# CLAUDE.md — Sprint [N]: [Sprint Name]
 
## Mission
 
[One paragraph. What this sprint produces. Reference §[X] of PROJECT_SPEC.md.]
 
## Spec sections in scope
 
- PROJECT_SPEC.md §[X.Y]
- PROJECT_SPEC.md §[X.Z]
 
## Definition of Done
 
- [ ] [Concrete, testable outcome]
- [ ] [Concrete, testable outcome]
- [ ] [Concrete, testable outcome]
- [ ] All new code has unit tests (Vitest).
- [ ] `pnpm test` passes with zero failures and zero skipped tests.
- [ ] `pnpm build` succeeds with zero TypeScript errors.
- [ ] `pnpm biome check` passes with zero warnings.
- [ ] Manual smoke test (below) passes on a fresh `pnpm dev`.
- [ ] No new files outside the "may create or modify" list.
- [ ] No new dependencies added without an approved Deviation.
- [ ] `DECISIONS.md` updated if any deviation was approved during this sprint.
 
## File scope
 
### You may create or modify
- [Path]
- [Path]
 
### You may read but NOT modify
- `PROJECT_SPEC.md`
- [Path to shared types or schemas]
 
### You MUST NOT modify
- PROJECT_SPEC.md (the spec is authoritative; raise concerns via Deviation).
- `DECISIONS.md` is append-only — never edit existing entries.
- Any file outside the "may create or modify" list above.
 
## Manual smoke test (numbered, click-by-click)
 
1. Run `pnpm dev`.
2. Open `http://localhost:3000/[route]`.
3. [Click exact UI element].
4. Verify [exact observable outcome].
5. ...
 
## Coding standards (binding)
 
[Copy the relevant subset from PROJECT_SPEC.md §15 here. Do not link — copy.]
 
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
 
Sprint: [Sprint number and name]
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
 
### Approval handling
 
- "Approved" → implement the proposed alternative as written.
- "Approved with changes: [...]" → implement with the user's modifications.
- "Rejected — [direction]" → discard the proposal; follow the new direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not assume.
 
After any approved deviation, append an entry to `/DECISIONS.md` with date,
sprint, what was changed, and the user's approval message verbatim.
 
## Useful local commands
 
- `pnpm dev` — local dev server
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright (only the demo flow)
- `pnpm seed` — re-seed Supabase mock data
- `pnpm db:reset` — reset local Supabase
 
## Sprint Completion Report (emit verbatim when finished)
 
```
✅ SPRINT [N] COMPLETE
 
Definition of Done:
- [x] [item 1]
- [x] [item 2]
...
Files created:
- path/one.ts (X lines)
Files modified:
- path/two.ts (+A −B)
Tests added: N (all passing)
Test command output: [paste last 5 lines]
Build output: [paste "Compiled successfully" line]
 
Deviations approved during sprint: [list, or "None"]
 
Manual smoke test result: [PASS / FAIL with details]
 
Recommended next steps: [optional]
```
 
## Notes & hints (non-binding)
 
- [Library quirks, gotchas, links to docs.]
```
 
---
 
## 19. Living Document Notes
 
- This spec WILL evolve. When it does, update the relevant section, bump the change log below, and announce in the project channel.
- If a sprint reveals that a section is wrong, **stop and update this doc first** before proceeding.
- The brainstorm doc is historical context. This document is the spec.
### Change log
 
| Date | Author | Change |
|---|---|---|
| 2026-04-25 | Max | Initial draft. |
| 2026-04-25 | Max | Added §15.7 quality gates, §15.8 deviation discipline, §16 parallel sprint execution protocol, embedded Deviation Protocol verbatim in §18 CLAUDE.md template, renumbered §17–20. |
 
---
 
## 20. Open Questions (must resolve before Sprint 0)
 
These are explicit unknowns the team should answer before code starts. Add answers here as decisions are made.
 
1. **Hosting target for the public sites.** Vercel preview URLs for the demo only? Confirm.
2. **Anthropic API key**: shared dev key? Personal key?
3. **Will Zach own the RM API integration story for the pitch even though we're using mock data?** Decide who narrates that section.
4. **Demo URL.** Real domain (`aurora-cincy.com`) purchased, or a `*.vercel.app`?
5. **Inspiration screenshots for the demo.** Pre-staged, or live-attached on stage?
6. **Mobile preview viewport.** Show in the demo or skip?
7. **Logo files for Aurora Property Group.** Who designs them? Stock + Canva is fine.
8. **Recording the demo.** Who, when, with what tooling (Loom / OBS)?
---
 
*End of spec.*


## 21. User Answers to 20. Open Questions
These are the answers from the project lead to the open questions that must be answered before Sprint 0


I am familiar with netlify but What ever is free but if netlify Works we can just do that but if Vercel will produce a better product we will do that


Personal Key I am the only one with an account and I am the only dev.
We are not worried about presentation strategy in this project, only the development of the app. 
We do not have one yet but Make sure Claude projects Files, prompts and Sprints include letting claude code to know after every prompt if there is something that I need to do in Vercel or Netlify(im letting you choose what we use), Supabase, Or get keys. 
I only have inspiration of the part that lives in RentManager Element 1. We are not worried about the presentation that is covered by zach for the most part we just need to worry about being able to demo a robust and complete program
Skip
The User Will upload them. I have some already so dont worry about producing logos
Again do not worry about the actual logistics of the demo we are only worried about the app and its prestige, polish, and complete functionality