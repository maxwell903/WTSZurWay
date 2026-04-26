// @vitest-environment node

import type { SetupFormValues } from "@/lib/setup-form/types";
import { APIConnectionError, AuthenticationError, RateLimitError } from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it, vi } from "vitest";
import { generateInitialSite } from "../generate-initial-site";
import { buildInitialGenerationSystemPrompt } from "../prompts/initial-generation";

const MIN_FORM: SetupFormValues = {
  companyName: "Aurora Property Group",
  palette: "ocean",
  templateStart: "ai_generate",
  additionalLogos: [],
  inspirationImages: [],
};

function makeValidConfigJson(): string {
  // Smallest possible config that passes siteConfigSchema. Does not exercise
  // every feature -- separate schema tests do that. Here we only need a
  // value that round-trips through safeParseSiteConfig successfully.
  return JSON.stringify({
    meta: { siteName: "Aurora Property Group", siteSlug: "aurora-property-group" },
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
        rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {} },
      },
    ],
    forms: [],
  });
}

function makeMessageResponse(text: string): Message {
  // Cast through unknown -- the runtime shape only needs `content[].type`
  // and `content[].text`; the orchestrator never reads the other fields.
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
  // Each call to messages.create dequeues one entry. Errors throw; messages
  // resolve. If the queue runs dry the test has misaligned its expectations.
  // The fn parameter is typed as `unknown` so vi.fn's mock.calls carries a
  // [unknown] tuple (not the default []), which lets noUncheckedIndexedAccess
  // index into mock.calls[N][0] without "Tuple type '[]' has no element"
  // errors when tests inspect call arguments.
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

describe("generateInitialSite", () => {
  it("returns ok on the first valid response", async () => {
    const { client, create } = makeMockClient([makeMessageResponse(makeValidConfigJson())]);
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.config.meta.siteName).toBe("Aurora Property Group");
    }
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries once after a malformed JSON first response and returns ok on success", async () => {
    const { client, create } = makeMockClient([
      makeMessageResponse("this is not json"),
      makeMessageResponse(makeValidConfigJson()),
    ]);
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    expect(result.kind).toBe("ok");
    expect(create).toHaveBeenCalledTimes(2);
    // Second call should include the retry user-message.
    const secondCallArgs = create.mock.calls[1]?.[0] as unknown as
      | { messages: { content: unknown }[] }
      | undefined;
    expect(secondCallArgs).toBeDefined();
    const secondCallText = JSON.stringify(secondCallArgs?.messages);
    expect(secondCallText).toContain("Your previous output failed validation");
  });

  it("returns invalid_output after a second consecutive failure", async () => {
    const { client, create } = makeMockClient([
      makeMessageResponse("first not json"),
      makeMessageResponse("second still not json"),
    ]);
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("invalid_output");
    }
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("strips a leading ```json fence and trailing ``` before parsing", async () => {
    const fenced = `\`\`\`json\n${makeValidConfigJson()}\n\`\`\``;
    const { client } = makeMockClient([makeMessageResponse(fenced)]);
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    expect(result.kind).toBe("ok");
  });

  it("maps APIConnectionError to network_error", async () => {
    const { client } = makeMockClient([new APIConnectionError({ message: "ECONNREFUSED" })]);
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
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
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
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
    const result = await generateInitialSite(
      { form: MIN_FORM },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.error.kind).toBe("over_quota");
    }
  });

  it("caps inspiration images at 4 even when 6 are provided", async () => {
    const { client, create } = makeMockClient([makeMessageResponse(makeValidConfigJson())]);
    const sixImages = Array.from({ length: 6 }, (_, i) => ({
      url: `https://example.com/img${i}.png`,
    }));
    await generateInitialSite(
      { form: MIN_FORM, inspirationImages: sixImages },
      client as unknown as Parameters<typeof generateInitialSite>[1],
    );
    const firstCall = create.mock.calls[0]?.[0] as unknown as
      | { messages: { content: { type: string }[] }[] }
      | undefined;
    expect(firstCall).toBeDefined();
    const firstUserContent = firstCall?.messages[0]?.content ?? [];
    const imageBlocks = firstUserContent.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(4);
  });
});

describe("buildInitialGenerationSystemPrompt", () => {
  // Snapshot-style test: verify every clause from §9.2 plus the detail-page
  // amendment is present in the prompt body. Direct string contains() rather
  // than toMatchSnapshot so future copy edits don't silently invalidate the
  // test -- each clause is asserted by intent.
  const prompt = buildInitialGenerationSystemPrompt({ form: MIN_FORM });

  it("(a) explicitly references SiteConfig", () => {
    expect(prompt).toContain("SiteConfig");
  });

  it("(b) embeds the schema prose including Page.kind and Page.detailDataSource", () => {
    expect(prompt).toContain('kind: "static" | "detail"');
    expect(prompt).toContain("detailDataSource");
  });

  it("(c) embeds the registered component catalog", () => {
    // Spot-check a handful of types from the catalog.
    expect(prompt).toContain("### Section");
    expect(prompt).toContain("### Repeater");
    expect(prompt).toContain("### UnitCard");
  });

  it("(d) describes the data sources and their fields", () => {
    expect(prompt).toContain("## properties (data source)");
    expect(prompt).toContain("## units (data source)");
    expect(prompt).toContain("## company (data source");
    expect(prompt).toContain("currentMarketRent");
  });

  it("(e) instructs strict JSON output with no prose and no markdown fences", () => {
    expect(prompt).toMatch(/no prose/);
    expect(prompt).toMatch(/no markdown code fences|no markdown fences/);
  });

  it("(f) instructs the model to use only registered components", () => {
    expect(prompt).toMatch(/MUST NOT invent component types/);
  });

  it("(g) instructs the model to apply the chosen palette consistently", () => {
    expect(prompt).toContain("Apply it consistently");
  });

  it("(h) instructs the model to bind UnitCard / PropertyCard props to RM fields", () => {
    expect(prompt).toContain("UnitCard");
    expect(prompt).toContain("{{ row.unitName }}");
    expect(prompt).toContain("PropertyCard");
  });

  it("(i) caps total components per page at 40", () => {
    expect(prompt).toContain("40");
  });

  it("(j) instructs the model to treat inspiration screenshots as vibe references only", () => {
    expect(prompt).toMatch(/VIBE references only|vibe references only/i);
  });

  it("(k) restates the detail-page coupling rule for both units and properties", () => {
    expect(prompt).toContain("Repeater");
    expect(prompt).toContain('detailDataSource === "units"');
    expect(prompt).toContain('detailDataSource === "properties"');
  });

  it("(l) restates the per-kind slug uniqueness rule", () => {
    expect(prompt).toMatch(/Slug uniqueness is per `kind`/);
  });

  it("is deterministic -- same input yields identical output", () => {
    const a = buildInitialGenerationSystemPrompt({ form: MIN_FORM });
    const b = buildInitialGenerationSystemPrompt({ form: MIN_FORM });
    expect(a).toBe(b);
  });
});
