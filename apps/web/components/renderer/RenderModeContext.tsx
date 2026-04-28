"use client";

// Lets leaf components know whether they're being rendered inside the
// editor canvas, the editor's preview mode, or the public visitor site.
//
// The Renderer wraps the tree in this provider; the default value
// "public" applies when a leaf component is rendered outside any
// Renderer (e.g., test harnesses, Storybook, or a future MDX use case).
//
// EditableTextSlot uses this to decide whether to even consider mounting
// a TipTap editor — visitor renders never read from the editor store and
// never load the @tiptap/react chunk.

import { createContext, useContext } from "react";

export type RenderMode = "edit" | "preview" | "public";

const RenderModeContext = createContext<RenderMode>("public");

export const RenderModeProvider = RenderModeContext.Provider;

export function useRenderMode(): RenderMode {
  return useContext(RenderModeContext);
}
