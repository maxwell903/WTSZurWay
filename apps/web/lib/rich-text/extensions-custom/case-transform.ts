// Adds a `textTransform` attribute on the TextStyle mark for inline case
// transforms ("uppercase", "lowercase", "capitalize", or null to unset).

import { Extension } from "@tiptap/core";

export type CaseTransformValue = "uppercase" | "lowercase" | "capitalize" | null;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    caseTransform: {
      setCaseTransform: (value: Exclude<CaseTransformValue, null>) => ReturnType;
      unsetCaseTransform: () => ReturnType;
    };
  }
}

export const CaseTransform = Extension.create({
  name: "caseTransform",

  addOptions() {
    return { types: ["textStyle"] as string[] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textTransform: {
            default: null,
            parseHTML: (element) => element.style.textTransform || null,
            renderHTML: (attrs) => {
              if (!attrs.textTransform) return {};
              return { style: `text-transform: ${attrs.textTransform}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setCaseTransform:
        (value) =>
        ({ chain }) =>
          chain().setMark("textStyle", { textTransform: value }).run(),
      unsetCaseTransform:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { textTransform: null }).removeEmptyTextStyle().run(),
    };
  },
});
