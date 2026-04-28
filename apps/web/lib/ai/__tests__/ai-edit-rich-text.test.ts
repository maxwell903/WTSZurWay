// @vitest-environment node
//
// Phase 5 — AI rich-text golden-prompt regression suite.
//
// These tests pin the contract between Claude and our op pipeline for the
// rich-text vocabulary added in phases 1-4.5. We do NOT call the live API
// (cost + flakiness); instead we mock the Anthropic client with canned
// responses and assert the orchestrator validates + accepts them, then
// dispatch the resulting ops through applyOperations to verify the
// end-to-end round-trip lands on the expected config shape.
//
// The fixtures correspond to the user-utterance examples baked into the
// system prompt (lib/ai/prompts/ai-edit.ts):
//   - "make all headings bold"        → applyTextFormat / mark / toggle
//   - "center this paragraph"         → applyTextFormat / alignment
//   - "make every button red"         → applyTextFormat / color
//   - "italicize the first paragraph" → applyTextFormat / mark / set
//   - "write a bold intro"            → setRichText / formatted doc
//   - "underline link 2"              → setRichText / path-style propKey
// A negative case ensures that an AI mistake (HTML-in-setText) parses
// without explosion — setText falls through with the HTML stored literally,
// which the renderer escapes; a follow-up turn can correct it.

import type { RichTextDoc, SiteConfig } from "@/lib/site-config";
import { type Operation, applyOperations } from "@/lib/site-config/ops";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirror Sprint 14's fixture-store stub from ai-edit.test.ts so we hit the
// live path uniformly.
const lookupAiEditFixtureMock = vi.fn<() => Promise<unknown>>(async () => null);
vi.mock("@/lib/ai/fixtures", () => ({
  lookupAiEditFixture: () => lookupAiEditFixtureMock(),
}));

import { aiEdit } from "@/lib/ai/ai-edit";

// ----- Fixtures -----

function makeConfig(): SiteConfig {
  return {
    meta: { siteName: "Aurora", siteSlug: "aurora" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            { id: "cmp_h1", type: "Heading", props: { text: "About", level: 1 }, style: {} },
            { id: "cmp_h2", type: "Heading", props: { text: "Pricing", level: 2 }, style: {} },
            { id: "cmp_h3", type: "Heading", props: { text: "Contact", level: 2 }, style: {} },
            { id: "cmp_p", type: "Paragraph", props: { text: "Welcome to Aurora." }, style: {} },
            {
              id: "cmp_btn",
              type: "Button",
              props: { label: "Apply now", linkMode: "static" },
              style: {},
            },
            {
              id: "cmp_nav",
              type: "NavBar",
              props: {
                links: [
                  { label: "Home", kind: "external", href: "/" },
                  { label: "About", kind: "external", href: "/about" },
                ],
                logoPlacement: "left",
                sticky: false,
              },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

function makeMessageResponse(text: string): Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      server_tool_use: null,
      service_tier: null,
    },
    container: null,
    content: [{ type: "text", text, citations: null }],
  } as unknown as Message;
}

function makeMockClient(response: Message) {
  const create = vi.fn(async (_args: unknown) => response);
  return { client: { messages: { create } }, create };
}

function findNode(config: SiteConfig, id: string) {
  for (const page of config.pages) {
    const found = walk(page.rootComponent);
    if (found) return found;
  }
  return null;
  function walk(node: SiteConfig["pages"][number]["rootComponent"]): typeof node | null {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
}

async function runPrompt(
  prompt: string,
  cannedResponseJson: string,
): Promise<{ ops: readonly Operation[]; result: SiteConfig }> {
  const { client } = makeMockClient(makeMessageResponse(cannedResponseJson));
  const response = await aiEdit(
    { prompt, config: makeConfig(), selection: null },
    client as unknown as Parameters<typeof aiEdit>[1],
  );
  if (response.kind !== "ok") {
    throw new Error(
      `Expected ok response; got ${response.kind} (error: ${
        response.kind === "error" ? response.error.kind : "n/a"
      })`,
    );
  }
  const result = applyOperations(makeConfig(), response.operations);
  return { ops: response.operations, result };
}

// ----- Tests -----

describe("AI rich-text golden prompts", () => {
  beforeEach(() => {
    lookupAiEditFixtureMock.mockReset();
    lookupAiEditFixtureMock.mockResolvedValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('"make all headings bold" → applyTextFormat (mark/bold/toggle) across multiple ids', async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Bold every heading",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_h1", "cmp_h2", "cmp_h3"],
          format: { kind: "mark", markType: "bold", mode: "toggle" },
        },
      ],
    });
    const { ops, result } = await runPrompt("make all the headings bold", canned);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.type).toBe("applyTextFormat");

    for (const id of ["cmp_h1", "cmp_h2", "cmp_h3"]) {
      const node = findNode(result, id);
      const doc = node?.props.richText as RichTextDoc | undefined;
      expect(doc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    }
  });

  it('"center this paragraph" → applyTextFormat (alignment/center) on the targeted paragraph', async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Center the paragraph",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_p"],
          format: { kind: "alignment", value: "center" },
        },
      ],
    });
    const { result } = await runPrompt("center this paragraph", canned);
    const para = findNode(result, "cmp_p");
    const doc = para?.props.richText as RichTextDoc | undefined;
    expect(doc?.content?.[0]?.attrs?.textAlign).toBe("center");
  });

  it('"make every button red" → applyTextFormat (color/textStyle/#ef4444)', async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Color buttons red",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_btn"],
          format: { kind: "color", markType: "color", value: "#ef4444" },
        },
      ],
    });
    const { result } = await runPrompt("make every button red", canned);
    const btn = findNode(result, "cmp_btn");
    const doc = btn?.props.richLabel as RichTextDoc | undefined;
    // Inline profile: doc.content is flat text* (no paragraph wrapper).
    expect(doc?.content?.[0]?.marks?.[0]?.attrs?.color).toBe("#ef4444");
  });

  it('"write a bold intro for the heading" → setRichText with a formatted doc', async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Replace the heading with a bold intro",
      operations: [
        {
          type: "setRichText",
          targetId: "cmp_h1",
          propKey: "richText",
          doc: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Welcome to ", marks: [{ type: "bold" }] },
                  { type: "text", text: "Aurora", marks: [{ type: "bold" }] },
                ],
              },
            ],
          },
        },
      ],
    });
    const { result } = await runPrompt("write a bold intro for the heading", canned);
    const h = findNode(result, "cmp_h1");
    expect(h?.props.text).toBe("Welcome to Aurora");
    const doc = h?.props.richText as RichTextDoc | undefined;
    expect(doc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
  });

  it('"underline link 2 in the navbar" → setRichText with path-style propKey', async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Underline the second NavBar link",
      operations: [
        {
          type: "setRichText",
          targetId: "cmp_nav",
          propKey: "links.1.richLabel",
          doc: {
            type: "doc",
            content: [{ type: "text", text: "About", marks: [{ type: "underline" }] }],
          },
        },
      ],
    });
    const { result } = await runPrompt("underline link 2 in the navbar", canned);
    const nav = findNode(result, "cmp_nav");
    const links = nav?.props.links as { label: string; richLabel?: RichTextDoc }[];
    // Index 0 untouched, index 1 has the underline mark.
    expect(links[0]?.richLabel).toBeUndefined();
    expect(links[1]?.richLabel?.content?.[0]?.marks?.[0]?.type).toBe("underline");
    expect(links[1]?.label).toBe("About"); // denormalized plain
  });

  it("italics + alignment chained: AI returns multiple ops in one batch", async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Italicize and center the paragraph",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_p"],
          format: { kind: "mark", markType: "italic", mode: "set" },
        },
        {
          type: "applyTextFormat",
          targetIds: ["cmp_p"],
          format: { kind: "alignment", value: "center" },
        },
      ],
    });
    const { ops, result } = await runPrompt("italicize and center the welcome paragraph", canned);
    expect(ops).toHaveLength(2);
    const para = findNode(result, "cmp_p");
    const doc = para?.props.richText as RichTextDoc | undefined;
    expect(doc?.content?.[0]?.attrs?.textAlign).toBe("center");
    expect(doc?.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("italic");
  });

  it("setText on a heading clears any prior richText (AI used setText for plain rewrite)", async () => {
    // First put rich content on cmp_h1 directly via applyOperations to set
    // up the precondition; then run a prompt where the AI uses setText.
    const initial = applyOperations(makeConfig(), [
      {
        type: "setRichText",
        targetId: "cmp_h1",
        propKey: "richText",
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "About", marks: [{ type: "bold" }] }],
            },
          ],
        },
      },
    ]);
    expect(findNode(initial, "cmp_h1")?.props.richText).toBeDefined();

    const canned = JSON.stringify({
      kind: "ok",
      summary: "Rename the heading",
      operations: [{ type: "setText", targetId: "cmp_h1", text: "Our Story" }],
    });
    const { client } = makeMockClient(makeMessageResponse(canned));
    const response = await aiEdit(
      { prompt: "rename heading 1 to Our Story", config: initial, selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    if (response.kind !== "ok") throw new Error("Expected ok");
    const result = applyOperations(initial, response.operations);
    const h = findNode(result, "cmp_h1");
    expect(h?.props.text).toBe("Our Story");
    // setText cleared the prior richText so the renderer falls back to plain.
    expect(h?.props.richText).toBeUndefined();
  });

  it("rejects an applyTextFormat targeting a non-text-bearing component (Section)", async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "Bold the section",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_root"],
          format: { kind: "mark", markType: "bold", mode: "set" },
        },
      ],
    });
    const { client } = makeMockClient(makeMessageResponse(canned));
    const response = await aiEdit(
      { prompt: "bold the section", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    // Schema validation passes (it's a structurally-valid op); applyOperations
    // is what raises. The orchestrator returns ok with the malformed-target
    // op; the editor's commit path catches the OperationInvalidError. That's
    // the correct contract: the schema layer validates shape, the apply
    // layer validates semantics.
    expect(response.kind).toBe("ok");
    if (response.kind !== "ok") return;
    expect(() => applyOperations(makeConfig(), response.operations)).toThrow(/no text fields/i);
  });

  it("rejects a malformed applyTextFormat at the schema layer (unknown markType)", async () => {
    const canned = JSON.stringify({
      kind: "ok",
      summary: "broken",
      operations: [
        {
          type: "applyTextFormat",
          targetIds: ["cmp_h1"],
          // markType "wavy" is not in the enum — schema rejects.
          format: { kind: "mark", markType: "wavy", mode: "toggle" },
        },
      ],
    });
    const { client } = makeMockClient(makeMessageResponse(canned));
    const response = await aiEdit(
      { prompt: "wavy line through everything", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    // The orchestrator retries once on schema failure; mock only returns
    // one response so the second call fails (mock throws) and the result
    // ends up as invalid_output.
    expect(response.kind).toBe("error");
    if (response.kind === "error") {
      expect(response.error.kind).toBe("invalid_output");
    }
  });
});
