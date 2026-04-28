// Adds a `lineHeight` attribute to block-level nodes (paragraph + heading).
// Block-level so it applies to the whole line of text rather than only the
// caret's run.

import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (value: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create({
  name: "lineHeight",

  addOptions() {
    return { types: ["paragraph", "heading"] as string[] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attrs) => {
              if (!attrs.lineHeight) return {};
              return { style: `line-height: ${attrs.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ commands }) => {
          let applied = false;
          for (const type of this.options.types) {
            applied = commands.updateAttributes(type, { lineHeight: value }) || applied;
          }
          return applied;
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          let applied = false;
          for (const type of this.options.types) {
            applied = commands.resetAttributes(type, "lineHeight") || applied;
          }
          return applied;
        },
    };
  },
});
