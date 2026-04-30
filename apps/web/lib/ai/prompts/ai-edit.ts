/**
 * Builds the deterministic system prompt for the AI Edit surface
 * (PROJECT_SPEC.md §9.3). Same input -> same output: future Sprint-14
 * prompt caching can hit consistently across retries.
 *
 * The prompt embeds:
 *   (a) SiteConfig schema prose (reused from initial-generation snippets).
 *   (b) Registered component catalog (reused).
 *   (c) Data sources reference (reused).
 *   (d) Operations vocabulary (Tier 1 + Tier 2 + the three §8.12 additions),
 *       each with one example payload.
 *   (e) The current SiteConfig as JSON.
 *   (f) The current selection (id + type + shallow props for each selected
 *       component).
 *   (g) The strict output-format clause from §9.3.
 *   (h) The "no invented components / props / fields" clause.
 *
 * The signature mirrors `buildInitialGenerationSystemPrompt`: a top-level
 * function composed of named local string constants, one per section, so
 * grep across the file finds clauses fast.
 */

import { buildComponentCatalog } from "@/lib/ai/prompts/snippets/component-catalog";
import { DATA_SOURCES_PROSE } from "@/lib/ai/prompts/snippets/data-sources";
import { SCHEMA_PROSE } from "@/lib/ai/prompts/snippets/schema-prose";
import { type StockImageRow, buildStockImagesProse } from "@/lib/ai/prompts/snippets/stock-images";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";

export type AiEditSelection = {
  componentIds: string[];
  pageSlug: string;
  pageKind: "static" | "detail";
};

export type AiEditPromptInput = {
  config: SiteConfig;
  selection: AiEditSelection | null;
  stockImages?: StockImageRow[];
  // Hotfix 2026-04-30: pages the user pinned in the chat panel as
  // additional reference. Only these and the currently edited page are
  // sent in full -- every other page collapses to a one-line
  // skeleton so the model still knows it exists.
  referencedPageSlugs?: string[];
  // Hotfix 2026-04-30 (follow-up): the slug of the page the user has
  // open in the editor, sent independently of `selection` because the
  // user can be editing "the whole page" with nothing selected. If
  // present this slug is always kept in full in the focused config.
  currentPageSlug?: string;
};

const OPERATIONS_VOCABULARY = String.raw`
The Operation discriminated union has 25 variants. Every Operation has a
required \`type\` field (the discriminator) and an optional \`id\` string
the model may emit so error reports can reference a specific op.

## Tier 1 -- structural edits

- \`addComponent({ parentId, index, component })\` -- insert a fresh subtree.
  Example:
  \`\`\`json
  { "type": "addComponent", "parentId": "cmp_root_home", "index": 0,
    "component": { "id": "cmp_new_para", "type": "Paragraph",
                   "props": { "text": "Hello" }, "style": {} } }
  \`\`\`
- \`removeComponent({ targetId })\` -- delete a node.
  Example: \`{ "type": "removeComponent", "targetId": "cmp_hero" }\`
- \`moveComponent({ targetId, newParentId, newIndex })\` -- relocate a node.
  Example: \`{ "type": "moveComponent", "targetId": "cmp_hero",
              "newParentId": "cmp_root_about", "newIndex": 0 }\`
- \`setProp({ targetId, propPath, value })\` -- write \`node.props.<path>\`.
  \`propPath\` is dot notation (\`"heading"\`, \`"items.0.label"\`).
  Example: \`{ "type": "setProp", "targetId": "cmp_hero",
              "propPath": "heading", "value": "Welcome" }\`
- \`setStyle({ targetId, stylePath, value })\` -- write \`node.style.<path>\`.
  Example: \`{ "type": "setStyle", "targetId": "cmp_hero",
              "stylePath": "padding.top", "value": 24 }\`
- \`setAnimation({ targetId, on, preset, duration?, delay? })\` --
  \`on\` is "enter" or "hover"; \`preset\` is one of the registered
  ANIMATION_PRESETS values listed in the SiteConfig schema.
  Example: \`{ "type": "setAnimation", "targetId": "cmp_hero",
              "on": "enter", "preset": "fadeInUp", "duration": 400 }\`
- \`setVisibility({ targetId, visibility })\` -- "always" / "desktop" /
  "mobile".
  Example: \`{ "type": "setVisibility", "targetId": "cmp_hero",
              "visibility": "mobile" }\`
- \`setText({ targetId, text })\` -- convenience for Heading / Paragraph
  (writes \`props.text\`) or Button (writes \`props.label\`). Other types
  reject the op. setText is PLAIN TEXT ONLY -- it clears any existing
  rich-text formatting (\`props.richText\` / \`props.richLabel\`) on the
  target. To author formatted text, use \`setRichText\` instead. Do NOT
  embed HTML tags ("<b>...</b>") inside the \`text\` argument; they are
  rendered literally.
  Example: \`{ "type": "setText", "targetId": "cmp_about_heading",
              "text": "About Us" }\`
- \`setRichText({ targetId, propKey, doc })\` -- replace formatted text
  content. Use this when the user wants formatting (bold, italic,
  alignment, lists). \`propKey\` is "richText" for Heading and Paragraph,
  "richLabel" for Button. \`doc\` is a TipTap JSON doc:
  \`{ type: "doc", content: [<block nodes>] }\` where block nodes are
  \`paragraph\` / \`heading\` / \`bulletList\` / \`orderedList\` / \`listItem\`,
  inline children are \`{ type: "text", text: "...", marks?: [...] }\` or
  \`{ type: "hardBreak" }\`, and supported marks are \`bold\`, \`italic\`,
  \`underline\`, \`strike\`, plus \`textAlign\` as a node attribute on
  paragraphs / headings via \`attrs.textAlign: "left" | "center" |
  "right" | "justify"\`. The plain-text fallback (\`props.text\` /
  \`props.label\`) is updated automatically.
  Example: \`{ "type": "setRichText", "targetId": "cmp_bio",
              "propKey": "richText",
              "doc": { "type": "doc", "content": [
                { "type": "paragraph", "content": [
                  { "type": "text", "text": "Hello " },
                  { "type": "text", "text": "world",
                    "marks": [{ "type": "bold" }] } ] } ] } }\`
- \`applyTextFormat({ targetIds, format })\` -- apply a single formatting
  change to one or many text-bearing components in one op. Same code path
  the human toolbar's broadcast mode uses. Use this when the user asks to
  "make all the headings bold", "center this paragraph", "italicize every
  button on the home page", etc. Do NOT use for authoring brand-new
  content -- use \`setRichText\` for that.
  \`format\` is a discriminated union on \`kind\`:
    - \`{ kind: "mark", markType: "bold"|"italic"|"underline"|"strike"|"subscript"|"superscript", mode: "set"|"unset"|"toggle" }\`
    - \`{ kind: "color", markType: "color"|"highlight", value: <hex> }\`
    - \`{ kind: "fontFamily", value: <css family list> }\`
    - \`{ kind: "fontSize", value: <css length> }\`
    - \`{ kind: "alignment", value: "left"|"center"|"right"|"justify" }\`
    - \`{ kind: "list", listType: "bulletList"|"orderedList", mode: "wrap"|"unwrap" }\`
    - \`{ kind: "lineHeight", value: <css value or null> }\`
    - \`{ kind: "letterSpacing", value: <css value or null> }\`
    - \`{ kind: "case", value: "uppercase"|"lowercase"|"capitalize"|null }\`
    - \`{ kind: "direction", value: "ltr"|"rtl" }\`
  Examples:
    \`{ "type": "applyTextFormat",
        "targetIds": ["cmp_h1","cmp_h2","cmp_h3"],
        "format": { "kind": "mark", "markType": "bold", "mode": "toggle" } }\`
    \`{ "type": "applyTextFormat",
        "targetIds": ["cmp_para"],
        "format": { "kind": "alignment", "value": "center" } }\`
- \`bindRMField({ targetId, propPath, fieldExpression })\` -- writes
  \`"{{ <fieldExpression> }}"\` into \`props[propPath]\`. Use this when the
  user wants a per-row value piped through a token.
  Example: \`{ "type": "bindRMField", "targetId": "cmp_unit_card",
              "propPath": "heading", "fieldExpression": "row.unitName" }\`
- \`addPage({ name, slug, atIndex?, fromTemplate? })\` -- new STATIC page;
  AI Edit must NOT create detail pages.
  Example: \`{ "type": "addPage", "name": "Contact", "slug": "contact" }\`
- \`removePage({ slug, kind? })\` -- \`kind\` defaults to "static". The home
  page (slug "home", kind "static") cannot be removed.
  Example: \`{ "type": "removePage", "slug": "about" }\`
- \`renamePage({ slug, kind?, newName, newSlug? })\` -- rename and
  optionally reslug. The home page slug is fixed.
  Example: \`{ "type": "renamePage", "slug": "about",
              "newName": "About Us", "newSlug": "about-us" }\`
- \`setSiteSetting({ path, value })\` -- top-level setting. Path MUST start
  with \`meta\`, \`brand\`, or \`global\`.
  Example: \`{ "type": "setSiteSetting", "path": "meta.siteName",
              "value": "Aurora Property Group" }\`
- \`setPalette({ palette })\` -- shorthand for
  \`setSiteSetting({ path: "brand.palette", ... })\`.
  Example: \`{ "type": "setPalette", "palette": "sunset" }\`

## Tier 1 additions (PROJECT_SPEC.md §8.12 detail-page operations)

- \`setLinkMode({ componentId, value: "static" | "detail" })\` -- applies
  to Button only; flips the link mode.
  Example: \`{ "type": "setLinkMode", "componentId": "cmp_card_btn",
              "value": "detail" }\`
- \`setDetailPageSlug({ componentId, value })\` -- applies to a Button
  whose linkMode is "detail"; sets which detail page the button links to.
  Example: \`{ "type": "setDetailPageSlug", "componentId": "cmp_card_btn",
              "value": "units" }\`
- \`setQueryParamDefault({ componentId, value })\` -- applies to InputField;
  sets \`props.defaultValueFromQueryParam\`. Pass \`null\` to clear the
  binding.
  Example: \`{ "type": "setQueryParamDefault", "componentId": "cmp_input",
              "value": "propertyId" }\`

## Tier 2 -- subtree edits

- \`duplicateComponent({ targetId })\` -- clones the subtree, freshens
  every id, inserts the clone immediately after the source.
  Example: \`{ "type": "duplicateComponent", "targetId": "cmp_unit_card" }\`
- \`wrapComponent({ targetId, wrapper: { type, props?, style? } })\` --
  wraps the target in a new node, preserving the target as the wrapper's
  only child. Wrapper's id is freshly generated.
  Example: \`{ "type": "wrapComponent", "targetId": "cmp_hero",
              "wrapper": { "type": "Section" } }\`
- \`unwrapComponent({ targetId })\` -- replaces the target with its
  children at the same position. Throws if the target has no children.
  Example: \`{ "type": "unwrapComponent", "targetId": "cmp_form" }\`
- \`reorderChildren({ parentId, newOrder })\` -- \`newOrder\` MUST be a
  permutation of the parent's existing children ids.
  Example: \`{ "type": "reorderChildren", "parentId": "cmp_form",
              "newOrder": ["cmp_submit", "cmp_input"] }\`
- \`setRepeaterDataSource({ targetId, dataSource })\` -- Repeater only;
  switches the source between properties / units / units_with_property /
  company.
  Example: \`{ "type": "setRepeaterDataSource", "targetId": "cmp_repeater",
              "dataSource": "properties" }\`
- \`setRepeaterFilters({ targetId, query })\` -- Repeater only; \`query\`
  is the FilterRuleGroup shape from data-binding (\`{ combinator: "and"
  | "or", rules: [...] }\`).
  Example: \`{ "type": "setRepeaterFilters", "targetId": "cmp_repeater",
              "query": { "combinator": "and",
                          "rules": [{ "field": "bedrooms",
                                      "operator": ">=", "value": 2 }] } }\`
- \`setRepeaterSort({ targetId, sort: { field, direction } })\` --
  Repeater only.
  Example: \`{ "type": "setRepeaterSort", "targetId": "cmp_repeater",
              "sort": { "field": "rent", "direction": "asc" } }\`
- \`connectInputToRepeater({ inputId, repeaterId, field, operator })\` --
  appends an entry to the Repeater's \`dataBinding.connectedInputs\`.
  Example: \`{ "type": "connectInputToRepeater", "inputId": "cmp_input",
              "repeaterId": "cmp_repeater",
              "field": "city", "operator": "=" }\`
`;

export function buildAiEditSystemPrompt(input: AiEditPromptInput): string {
  const componentCatalog = buildComponentCatalog();
  const selectionBlock = serializeSelection(input);
  // Hotfix 2026-04-30: emit a slimmed config (only the currently edited
  // page + any pinned reference pages keep their full subtree; the rest
  // collapse to a one-line skeleton) and use compact JSON.stringify
  // (no 2-space indent). Combined these typically cut the SiteConfig
  // section's input tokens by 50-70% on a multi-page site, which
  // matters because the model must fit under the demo plan's 30k
  // input cap and 8k output cap.
  const focusedConfig = buildFocusedConfig(input);
  const configJson = JSON.stringify(focusedConfig);
  const stockImagesProse = buildStockImagesProse(input.stockImages ?? []);

  return `You are producing a diff of operations against an existing SiteConfig
for a property management website. The user is in the editor and wants
to talk to their site -- they will describe a change in plain English
("Make the headline say Welcome to Aurora", "Add a contact form below
the units list") and you will return either a JSON object describing the
operations that effect that change, or a single clarifying question.

# Output contract (binding -- PROJECT_SPEC.md §9.3)

Return exactly one JSON object. The first character of your response MUST
be \`{\` and the last character MUST be \`}\`. Do not include prose before
or after, do not include markdown code fences, do not include explanatory
text.

The JSON object MUST match exactly one of these two shapes:

\`\`\`ts
type AiEditOk = {
  kind: "ok";
  summary: string;          // one-sentence plain-English summary, shown to the user
  operations: Operation[];  // the diff to apply -- see "Operations" below
};

type AiEditClarify = {
  kind: "clarify";
  question: string;         // a single clarifying question, shown verbatim
};
\`\`\`

If the user's request is ambiguous, return the \`clarify\` shape with one
focused question. Do NOT guess.

If the orchestrator's first parse attempt fails, it will retry once with
the validation errors attached. A second failure surfaces as an
\`invalid_output\` error to the user.

# SiteConfig schema (read-only context)

${SCHEMA_PROSE}

# Registered components (use ONLY these)

You MUST NOT invent component types. Every \`addComponent\` /
\`wrapComponent\` you emit must use a \`type\` listed below, and every
\`setProp\` / \`setStyle\` / \`setText\` / \`bindRMField\` must target a
prop the component already exposes. The renderer rejects unknown props
and falls back to defaults.

${componentCatalog}

# Data sources

Repeater \`dataBinding.source\` and the field expressions used by
\`bindRMField\` MUST come from this catalog:

${DATA_SOURCES_PROSE}

${stockImagesProse ? `${stockImagesProse}\n` : ""}
# Operations
${OPERATIONS_VOCABULARY}

# Validity rules

Your operations are dry-run on the server before being returned to the
user. If \`applyOperations\` rejects the batch, the response is rewritten
to a structured \`operation_invalid\` error and the user sees "One of the
AI's suggested changes wouldn't work on this page." Specifically:

- \`addComponent\`: parent must accept the child type per the children
  policy in the catalog above. The new component's id must not already
  exist anywhere in the config.
- \`removeComponent\`: cannot target a page root.
- \`moveComponent\`: target's id is preserved; cannot move into its own
  descendants.
- \`setText\`: only Heading / Paragraph / Button. Plain text only;
  \`text\` is stored verbatim and any existing rich-text formatting on the
  target is cleared.
- \`setRichText\`: only Heading / Paragraph / Button. \`propKey\` must be
  "richText" for Heading / Paragraph and "richLabel" for Button. The doc
  must be a valid TipTap JSON tree (validation rejects unknown nodes /
  marks).
- \`applyTextFormat\`: each id in \`targetIds\` must reference a component
  whose registered metadata declares text fields (today: Heading,
  Paragraph, Button). Inline-profile targets (Button) skip block-only
  formats like \`list\`; that's a no-op, not an error.
- \`addPage\`: always static; the home page cannot be removed; slugs are
  unique per kind.
- \`setLinkMode\` / \`setDetailPageSlug\`: Button only.
- \`setDetailPageSlug\` requires \`linkMode === "detail"\`.
- \`setQueryParamDefault\`: InputField only.
- Repeater ops (\`setRepeaterDataSource\` / \`setRepeaterFilters\` /
  \`setRepeaterSort\` / \`connectInputToRepeater\`): Repeater only.
- \`connectInputToRepeater\`: \`inputId\` must reference an InputField,
  \`repeaterId\` must reference a Repeater.

# Determinism reminders

- Do not stream. Return the complete JSON object in one response.
- Do not include any commentary, markdown fences, or trailing text.
- Do not invent components, props, or fields not described in the
  catalog and data-source sections above.
- Reference existing component ids exactly as written -- do not rename
  or shorten them.

# Output token discipline (binding -- the response budget is tight)

- Use \`setText\` for plain text content. Only use \`setRichText\` when
  the user explicitly asks for inline formatting like bold, italic,
  underline, or mixed styling within a single line. Font family,
  color, size, alignment, line-height, and per-component styling are
  NOT "formatting" in this sense -- those go through
  \`applyTextFormat\` and \`setStyle\` and work fine alongside
  \`setText\`. Default to \`setText\`; reach for \`setRichText\` only on
  explicit request.
- Bake props, styles, and children into the literal you pass to
  \`addComponent\` (\`component.props\`, \`component.style\`,
  \`component.children\`). Do NOT follow an \`addComponent\` with
  separate \`setProp\` / \`setStyle\` ops on the same target -- combine
  them into the initial creation. Same rule for \`wrapComponent\`'s
  wrapper literal.
- Emit operations as compact JSON: no pretty-printing, no unnecessary
  whitespace, and omit the optional top-level \`id\` field on each
  operation unless you have a specific reason to label one for error
  reporting.

# Current SiteConfig (the document you are editing)

\`\`\`json
${configJson}
\`\`\`

# Current selection
${selectionBlock}
`;
}

/**
 * Hotfix 2026-04-30 (rev 2): Builds the "focused" SiteConfig the
 * system prompt embeds. Pages the user is editing or has pinned as
 * reference keep their full ComponentNode subtree; every other page
 * collapses to `{ slug, kind, name, rootComponent: { id, type,
 * children: [] } }` -- the root component's real id and type survive
 * so the model can emit `addComponent({ parentId: <real id>, ... })`
 * targeting any page even without seeing its full tree. Children /
 * props / styles are dropped to save tokens. Site-level fields
 * (`meta`, `brand`, `global`, `details`, `relationships`, etc.) pass
 * through unchanged so site-wide ops still work.
 *
 * "Edited page" precedence: `selection.pageSlug` if set (a component
 * is selected), else `currentPageSlug` (whole-page edit), else
 * nothing. Pinned slugs from `referencedPageSlugs` always layer on top.
 */
function buildFocusedConfig(input: AiEditPromptInput): unknown {
  const focusSet = new Set<string>();
  const editedSlug = input.selection?.pageSlug ?? input.currentPageSlug;
  if (editedSlug) focusSet.add(editedSlug);
  for (const slug of input.referencedPageSlugs ?? []) {
    focusSet.add(slug);
  }

  // Cast to a record so we can shallow-clone the config without committing
  // to a particular SiteConfig revision in this file. The runtime shape is
  // already validated upstream by safeParseSiteConfig.
  const c = input.config as unknown as Record<string, unknown>;
  const focused: Record<string, unknown> = { ...c };

  type LooseRoot = { id?: unknown; type?: unknown } & Record<string, unknown>;
  type LoosePage = {
    slug: string;
    kind?: string;
    name?: string;
    rootComponent?: unknown;
  } & Record<string, unknown>;

  if (Array.isArray(c.pages)) {
    focused.pages = (c.pages as LoosePage[]).map((page) => {
      if (focusSet.has(page.slug)) return page;
      const root =
        page.rootComponent && typeof page.rootComponent === "object"
          ? (page.rootComponent as LooseRoot)
          : null;
      return {
        slug: page.slug,
        kind: page.kind ?? "static",
        name: page.name ?? page.slug,
        // Keep id + type so the model can target this page's root in
        // `addComponent` / `setProp` / etc. without inventing an id.
        // Empty children array signals "tree elided -- pin this page
        // to see it" without breaking schemas that expect children.
        rootComponent: root
          ? {
              id: root.id,
              type: root.type,
              children: [],
            }
          : null,
      };
    });
  }

  return focused;
}

function serializeSelection(input: AiEditPromptInput): string {
  // Selection is "whole page" when no component is selected. The shallow
  // serialization (id + type + props only) avoids re-emitting subtrees that
  // are already in the SiteConfig JSON earlier in the prompt.
  if (!input.selection || input.selection.componentIds.length === 0) {
    return `\nThe user has nothing selected -- treat the request as targeting the whole site or page (slug: "${input.selection?.pageSlug ?? "<unknown>"}", kind: "${input.selection?.pageKind ?? "static"}"). Use \`setSiteSetting\` for site-wide changes, otherwise infer the most likely target from the prompt and the SiteConfig above.\n`;
  }

  const { componentIds, pageSlug, pageKind } = input.selection;
  const lines: string[] = [
    "",
    `The user is editing on page "${pageSlug}" (kind: "${pageKind}"). Selected components:`,
  ];
  for (const id of componentIds) {
    const node = findNode(input.config, id);
    if (!node) {
      lines.push(`- ${id}: not found`);
      continue;
    }
    const shallow = JSON.stringify({ id: node.id, type: node.type, props: node.props });
    lines.push(`- ${shallow}`);
  }
  lines.push("");
  lines.push(
    "Bias toward targeting these components specifically when the user's request can be satisfied within their scope.",
  );
  lines.push("");
  return lines.join("\n");
}

function findNode(config: SiteConfig, id: string): ComponentNode | null {
  function walk(node: ComponentNode): ComponentNode | null {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
  for (const page of config.pages) {
    const found = walk(page.rootComponent);
    if (found) return found;
  }
  return null;
}
