// @vitest-environment node
//
// Phase 5 — bundle isolation. Static-source guard that the visitor render
// path never grows a static import of `@tiptap/react` or `@tiptap/pm`.
// Those packages bundle the entire TipTap editor runtime (~120 KB gzipped);
// they belong on the editor canvas (which dynamic-imports them via
// `next/dynamic`), NOT on the public visitor pages.
//
// The check is intentionally a regex on the source rather than a build-time
// graph analysis. Reason: a build-graph test would need `pnpm build` to run
// inside vitest, which is slow and brittle. Source-level checks catch the
// regression at the moment a developer adds the offending import line and
// run in milliseconds.
//
// If a future change LEGITIMATELY needs to import `@tiptap/react` from the
// visitor path, this test should fail loudly and force a deliberate update
// here documenting the new exception.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_WEB = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(REPO_WEB, relativePath), "utf8");
}

const VISITOR_RENDER_PATH = [
  "components/renderer/RichTextRenderer.tsx",
  "components/renderer/Renderer.tsx",
  "components/renderer/ComponentRenderer.tsx",
  "components/renderer/RenderModeContext.tsx",
];

const EDITOR_ONLY_PATHS = [
  "components/renderer/TipTapEditableSlot.tsx",
  "components/renderer/EditableTextSlot.tsx",
  "components/renderer/editor-registry.ts",
];

describe("rich-text bundle isolation", () => {
  it.each(VISITOR_RENDER_PATH)("%s does not statically import @tiptap/react", (file) => {
    const source = read(file);
    // Match `from "@tiptap/react"` or `from '@tiptap/react'`.
    expect(source).not.toMatch(/from\s+["']@tiptap\/react["']/);
  });

  it.each(VISITOR_RENDER_PATH)("%s does not statically import @tiptap/pm", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/from\s+["']@tiptap\/pm(\/[^"']+)?["']/);
  });

  it("RichTextRenderer.tsx imports @tiptap/html (server-renderable, lightweight)", () => {
    const source = read("components/renderer/RichTextRenderer.tsx");
    expect(source).toMatch(/from\s+["']@tiptap\/html["']/);
  });

  it("EditableTextSlot.tsx loads TipTapEditableSlot via next/dynamic, not a static import", () => {
    const source = read("components/renderer/EditableTextSlot.tsx");
    // Must reference next/dynamic.
    expect(source).toContain('from "next/dynamic"');
    // Must NOT have a static `import ... from "./TipTapEditableSlot"`. The
    // dynamic() import is OK because dynamic strings aren't `from "..."`.
    expect(source).not.toMatch(/^import[^;]*from\s+["']\.\/TipTapEditableSlot["']/m);
  });

  it("TipTapEditableSlot.tsx is allowed to import @tiptap/react (it IS the editor branch)", () => {
    // Sanity: the editor file should still pull in the runtime. If this
    // ever fails, the editor canvas itself is broken — not just isolation.
    const source = read(EDITOR_ONLY_PATHS[0] ?? "");
    expect(source).toMatch(/from\s+["']@tiptap\/react["']/);
  });
});
