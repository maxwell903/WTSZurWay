"use client";

// Reusable read-only-mirror control for the left edit panel of a
// text-bearing component. When `richDoc` is non-trivial (i.e., differs
// from the lazy `synthesizeDoc(text)`), renders a read-only preview and
// an "Edit as plain text (clears formatting)" button. Otherwise renders
// a normal textarea that round-trips the plain string through
// synthesizeDoc so the rich field stays in sync.
//
// Used by Heading / Paragraph / Button (Phase 1 + 2). Keeps the textarea
// path safe — typing here NEVER silently clobbers existing formatting;
// the user has to explicitly opt into the destructive plain-text path.

import { Label } from "@/components/ui/label";
import { extractPlainText } from "@/lib/rich-text/extract-plain-text";
import { type SynthesizeProfile, synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import { type RichTextDoc, richTextDocSchema } from "@/lib/site-config";

export type RichTextMirrorProps = {
  // The component-edit-panel's data-testid prefix and label text.
  fieldId: string;
  fieldLabel: string;
  // The plain-text and rich-text values from the node's props.
  plainKey: string; // e.g. "text" | "label"
  richKey: string; // e.g. "richText" | "richLabel"
  plain: string;
  rawRich: unknown;
  rows?: number;
  placeholder?: string;
  // Profile selects the rich-text synthesis shape — block (paragraph
  // wrapper) for Heading / Paragraph; inline (flat text*) for Button.
  profile?: SynthesizeProfile;
  // Hooks for writing patches back to the store.
  writePartial: (patch: Record<string, unknown>) => void;
};

function readRichDoc(raw: unknown): RichTextDoc | undefined {
  if (raw === undefined) return undefined;
  const parsed = richTextDocSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function richDocIsNonTrivial(doc: RichTextDoc, plain: string, profile: SynthesizeProfile): boolean {
  return JSON.stringify(doc) !== JSON.stringify(synthesizeDoc(plain, profile));
}

export function RichTextMirror({
  fieldId,
  fieldLabel,
  plainKey,
  richKey,
  plain,
  rawRich,
  rows = 3,
  placeholder,
  profile = "block",
  writePartial,
}: RichTextMirrorProps) {
  const richDoc = readRichDoc(rawRich);
  const isFormatted = richDoc !== undefined && richDocIsNonTrivial(richDoc, plain, profile);

  const handlePlainChange = (next: string) => {
    writePartial({ [plainKey]: next, [richKey]: synthesizeDoc(next, profile) });
  };

  const handleClearFormatting = () => {
    if (!confirm("Clear all rich-text formatting on this field? This cannot be undone.")) {
      return;
    }
    const flattened = richDoc ? extractPlainText(richDoc) : plain;
    writePartial({ [plainKey]: flattened, [richKey]: synthesizeDoc(flattened, profile) });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="text-xs text-zinc-300">
          {fieldLabel}
        </Label>
        {isFormatted ? (
          <span
            data-testid={`${fieldId}-formatted-badge`}
            title="Right-click the component on the canvas to edit with the rich-text toolbar."
            className="rounded bg-orange-400/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-orange-300"
          >
            Formatted
          </span>
        ) : null}
      </div>
      {isFormatted ? (
        <>
          <div
            data-testid={`${fieldId}-readonly`}
            className="w-full whitespace-pre-wrap rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-1 text-sm text-zinc-400"
          >
            {richDoc ? extractPlainText(richDoc) : plain}
          </div>
          <button
            type="button"
            data-testid={`${fieldId}-clear-formatting`}
            onClick={handleClearFormatting}
            className="text-[11px] text-orange-300 underline-offset-2 hover:underline"
          >
            Edit as plain text (clears formatting)
          </button>
        </>
      ) : (
        <textarea
          id={fieldId}
          data-testid={fieldId}
          value={plain}
          placeholder={placeholder}
          onChange={(e) => handlePlainChange(e.target.value)}
          rows={rows}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
        />
      )}
    </div>
  );
}
