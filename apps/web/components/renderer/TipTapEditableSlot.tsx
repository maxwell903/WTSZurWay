"use client";

// Mounts a TipTap editor for one text field on one component. Only ever
// loaded inside the editor canvas — the visitor render path uses
// RichTextRenderer instead. This file's static imports include
// @tiptap/react, so callers must dynamic-import this module to keep the
// editor runtime out of the visitor bundle.
//
// The editor is registered in `editor-registry.ts` so the floating
// toolbar (which lives as a sibling, not an ancestor, of this component)
// can reach in and dispatch commands. On every doc change we write both
// `richText` (the JSON doc) and `text` (the denormalized plain-text
// fallback) via the editor store's `setComponentProps`.

import {
  makeEditorKey,
  registerEditor,
  unregisterEditor,
} from "@/components/renderer/editor-registry";
import { useEditorStore } from "@/lib/editor-state";
import { type RichTextProfile, profileExtensions } from "@/lib/rich-text/extensions";
import { extractPlainText } from "@/lib/rich-text/extract-plain-text";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { RichTextDoc } from "@/lib/site-config";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
} from "react";

export type TipTapEditableSlotProps = {
  nodeId: string;
  // For flat fields these are simple keys ("text" / "richText"); for array
  // items they're path-style ("links.2.label" / "links.2.richLabel"). The
  // propKey is also used as the editor-registry key (suffixed onto nodeId)
  // so each link gets its own entry and the toolbar resolves to the right
  // editor when the user right-clicks a specific link.
  propKey: string;
  richKey: string;
  doc: RichTextDoc | undefined;
  fallback: string;
  profile: RichTextProfile;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
  passthroughAttrs?: Record<string, unknown>;
  // The full `props` object lives on the parent ComponentNode; we receive a
  // snapshot so onUpdate can write a complete patch back via setComponentProps.
  fullProps: Record<string, unknown>;
  // Phase 4.5 — for array items the caller supplies a deep-patch builder so
  // the editor's onUpdate writes into the correct array index. When omitted
  // (the flat-field common case), the default patch is `{ [richKey]: json,
  // [propKey]: plain }`.
  buildWritePatch?: (json: RichTextDoc, plain: string) => Record<string, unknown>;
};

export function TipTapEditableSlot({
  nodeId,
  propKey,
  richKey,
  doc,
  fallback,
  profile,
  as,
  style,
  className,
  passthroughAttrs,
  fullProps,
  buildWritePatch,
}: TipTapEditableSlotProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  // Snapshot via ref so the onUpdate callback below always has the latest
  // props/setter/patch-builder without re-creating the editor on every
  // keystroke.
  const propsRef = useRef(fullProps);
  propsRef.current = fullProps;
  const setPropsRef = useRef(setComponentProps);
  setPropsRef.current = setComponentProps;
  const buildPatchRef = useRef(buildWritePatch);
  buildPatchRef.current = buildWritePatch;

  const initialDoc = doc ?? synthesizeDoc(fallback, profile);

  const editor = useEditor({
    extensions: profileExtensions(profile),
    content: initialDoc,
    // SSR-safe: the editor mounts on the client tick after initial render.
    immediatelyRender: false,
    // The store is the source of truth for save state (`saveState: "dirty"`),
    // so we don't bother with a debounce here — Zustand batches synchronously
    // and the save-draft loop polls the dirty flag.
    onUpdate({ editor: ed }) {
      const json = ed.getJSON() as RichTextDoc;
      const plain = extractPlainText(json);
      const patch = buildPatchRef.current
        ? buildPatchRef.current(json, plain)
        : { [richKey]: json, [propKey]: plain };
      setPropsRef.current(nodeId, { ...propsRef.current, ...patch });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const key = makeEditorKey(nodeId, propKey);
    registerEditor(key, editor);
    return () => {
      unregisterEditor(key);
    };
  }, [editor, nodeId, propKey]);

  // The wrapping EditModeWrapper attaches dnd-kit's pointer-sensor
  // listeners (with a 10px activation distance). Without intervention, a
  // user-initiated text-selection drag inside the editor would be
  // interpreted as a component drag once it crossed 10px. Stop pointer +
  // mousedown propagation so dnd-kit never sees pointer events that
  // originated inside the active editor. Click events still propagate
  // (selection / right-click handlers above us still fire on click +
  // contextmenu).
  const swallowPointer = (e: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      {...(passthroughAttrs ?? {})}
      style={style}
      className={className}
      onPointerDown={swallowPointer}
      onMouseDown={swallowPointer}
    >
      <EditorContent editor={editor} />
    </Tag>
  );
}
