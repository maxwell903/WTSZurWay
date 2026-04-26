// @vitest-environment node

import { aiEdit } from "@/lib/ai/ai-edit";
import type { SiteConfig } from "@/lib/site-config";
import { APIConnectionError, AuthenticationError, RateLimitError } from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it, vi } from "vitest";

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
            {
              id: "cmp_hero",
              type: "HeroBanner",
              props: { heading: "Welcome", subheading: "" },
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

function makeMockClient(responses: Array<Message | Error>) {
  let i = 0;
  const create = vi.fn(async (_args: unknown) => {
    const next = responses[i++];
    if (next === undefined) {
      throw new Error(`Mock messages.create called more times than expected (call ${i})`);
    }
    if (next instanceof Error) throw next;
    return next;
  });
  return {
    client: { messages: { create } },
    create,
  };
}

const OK_RESPONSE = JSON.stringify({
  kind: "ok",
  summary: "Update the hero headline to Hello",
  operations: [{ type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Hello" }],
});

const CLARIFY_RESPONSE = JSON.stringify({
  kind: "clarify",
  question: "Which heading do you mean -- the hero or the about section?",
});

describe("aiEdit", () => {
  it("returns ok with the parsed operations on the first valid response", async () => {
    const { client, create } = makeMockClient([makeMessageResponse(OK_RESPONSE)]);
    const result = await aiEdit(
      { prompt: "change the hero headline", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.summary).toBe("Update the hero headline to Hello");
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("setProp");
    }
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("returns clarify when the model asks for a clarifying question", async () => {
    const { client } = makeMockClient([makeMessageResponse(CLARIFY_RESPONSE)]);
    const result = await aiEdit(
      { prompt: "fix it", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("clarify");
    if (result.kind === "clarify") {
      expect(result.question).toMatch(/which heading/i);
    }
  });

  it("retries once on a malformed first response and returns ok on success", async () => {
    const { client, create } = makeMockClient([
      makeMessageResponse("this is not json"),
      makeMessageResponse(OK_RESPONSE),
    ]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("ok");
    expect(create).toHaveBeenCalledTimes(2);
    const secondCall = create.mock.calls[1]?.[0] as unknown as
      | { messages: { content: unknown }[] }
      | undefined;
    expect(JSON.stringify(secondCall?.messages)).toContain(
      "Your previous output failed validation",
    );
  });

  it("returns invalid_output after a second consecutive failure", async () => {
    const { client, create } = makeMockClient([
      makeMessageResponse("first not json"),
      makeMessageResponse("second still not json"),
    ]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("invalid_output");
    }
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("strips a leading ```json fence and trailing ``` before parsing", async () => {
    const fenced = `\`\`\`json\n${OK_RESPONSE}\n\`\`\``;
    const { client } = makeMockClient([makeMessageResponse(fenced)]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("ok");
  });

  it("maps APIConnectionError to network_error", async () => {
    const { client } = makeMockClient([new APIConnectionError({ message: "ECONNREFUSED" })]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("network_error");
    }
  });

  it("maps AuthenticationError (401) to auth_error", async () => {
    const { client } = makeMockClient([
      new AuthenticationError(401, undefined, "Invalid API key", new Headers()),
    ]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("auth_error");
    }
  });

  it("maps RateLimitError (429) to over_quota", async () => {
    const { client } = makeMockClient([
      new RateLimitError(429, undefined, "Rate limit exceeded", new Headers()),
    ]);
    const result = await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("over_quota");
    }
  });

  it("caps attachments at 4 even when 6 are provided", async () => {
    const { client, create } = makeMockClient([makeMessageResponse(OK_RESPONSE)]);
    const sixAttachments = Array.from({ length: 6 }, (_, i) => ({
      url: `https://example.com/img${i}.png`,
    }));
    await aiEdit(
      { prompt: "change", config: makeConfig(), selection: null, attachments: sixAttachments },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    const firstCall = create.mock.calls[0]?.[0] as unknown as
      | { messages: { content: { type: string }[] }[] }
      | undefined;
    expect(firstCall).toBeDefined();
    const userContent = firstCall?.messages[0]?.content ?? [];
    const imageBlocks = userContent.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(4);
  });

  it("forwards prior history turns into the message list", async () => {
    const { client, create } = makeMockClient([makeMessageResponse(OK_RESPONSE)]);
    await aiEdit(
      {
        prompt: "make it sticky",
        config: makeConfig(),
        selection: null,
        history: [
          { role: "user", content: "fix it" },
          { role: "assistant", content: "Which heading do you mean?" },
        ],
      },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    const firstCall = create.mock.calls[0]?.[0] as unknown as
      | { messages: { role: string; content: { type: string; text?: string }[] }[] }
      | undefined;
    expect(firstCall?.messages).toHaveLength(3);
    expect(firstCall?.messages[0]?.role).toBe("user");
    expect(firstCall?.messages[1]?.role).toBe("assistant");
    expect(firstCall?.messages[2]?.role).toBe("user");
  });

  it("rejects an ok response whose operations contain a malformed op", async () => {
    const malformed = JSON.stringify({
      kind: "ok",
      summary: "x",
      operations: [{ type: "setProps", targetId: "cmp_hero", propPath: "h", value: 1 }],
    });
    const { client } = makeMockClient([
      makeMessageResponse(malformed),
      makeMessageResponse(malformed),
    ]);
    const result = await aiEdit(
      { prompt: "x", config: makeConfig(), selection: null },
      client as unknown as Parameters<typeof aiEdit>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("invalid_output");
    }
  });
});
