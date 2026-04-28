// Adds a `dir` attribute to block-level nodes (paragraph + heading) for
// LTR / RTL text direction. Renders as the standard HTML `dir` attribute
// rather than CSS so screen readers + bidi-aware rendering pick it up.

import { Extension } from "@tiptap/core";

export type DirectionValue = "ltr" | "rtl" | null;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    direction: {
      setDirection: (value: Exclude<DirectionValue, null>) => ReturnType;
      unsetDirection: () => ReturnType;
    };
  }
}

export const Direction = Extension.create({
  name: "direction",

  addOptions() {
    return { types: ["paragraph", "heading"] as string[] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir") || null,
            renderHTML: (attrs) => {
              if (!attrs.dir) return {};
              return { dir: attrs.dir };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setDirection:
        (value) =>
        ({ commands }) => {
          let applied = false;
          for (const type of this.options.types) {
            applied = commands.updateAttributes(type, { dir: value }) || applied;
          }
          return applied;
        },
      unsetDirection:
        () =>
        ({ commands }) => {
          let applied = false;
          for (const type of this.options.types) {
            applied = commands.resetAttributes(type, "dir") || applied;
          }
          return applied;
        },
    };
  },
});
