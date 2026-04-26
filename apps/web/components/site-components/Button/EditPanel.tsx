"use client";

import { DetailPageSelect } from "@/components/editor/edit-panels/controls/DetailPageSelect";
import { SegmentedControl } from "@/components/editor/edit-panels/controls/SegmentedControl";
import { SelectInput } from "@/components/editor/edit-panels/controls/SelectInput";
import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";

type LinkMode = "static" | "detail";

const VARIANT_OPTIONS = ["primary", "secondary", "outline", "ghost", "link"].map((v) => ({
  label: v,
  value: v,
}));
const SIZE_OPTIONS = ["sm", "md", "lg"].map((v) => ({ label: v, value: v }));
const BUTTON_TYPE_OPTIONS = ["button", "submit", "reset"].map((v) => ({ label: v, value: v }));
const LINK_MODE_OPTIONS = [
  { label: "Static URL", value: "static" as const },
  { label: "Detail page", value: "detail" as const },
];

function readString(props: Record<string, unknown>, key: string, fallback = ""): string {
  return typeof props[key] === "string" ? (props[key] as string) : fallback;
}

function readBool(props: Record<string, unknown>, key: string): boolean {
  return props[key] === true;
}

function readLinkMode(props: Record<string, unknown>): LinkMode {
  return props.linkMode === "detail" ? "detail" : "static";
}

export type ButtonEditPanelProps = { node: ComponentNode };

export function ButtonEditPanel({ node }: ButtonEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const props = node.props;

  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...props, ...patch });
  };

  const linkMode = readLinkMode(props);
  const isDetail = linkMode === "detail";

  return (
    <div data-component-edit-panel="Button" className="space-y-3">
      <TextInput
        id="button-label"
        label="Label"
        value={readString(props, "label", "Button")}
        testId="button-label"
        onChange={(next) => writePartial({ label: next })}
      />
      <TextInput
        id="button-href"
        label="Href"
        value={readString(props, "href")}
        disabled={isDetail}
        helper={isDetail ? "Computed at render time as `/{detailPageSlug}/{row.id}`" : undefined}
        testId="button-href"
        onChange={(next) => writePartial({ href: next === "" ? undefined : next })}
      />
      <SelectInput
        id="button-variant"
        label="Variant"
        value={readString(props, "variant", "primary")}
        options={VARIANT_OPTIONS}
        testId="button-variant"
        onChange={(next) => writePartial({ variant: next })}
      />
      <SelectInput
        id="button-size"
        label="Size"
        value={readString(props, "size", "md")}
        options={SIZE_OPTIONS}
        testId="button-size"
        onChange={(next) => writePartial({ size: next })}
      />
      <SwitchInput
        id="button-full-width"
        label="Full width"
        value={readBool(props, "fullWidth")}
        testId="button-full-width"
        onChange={(next) => writePartial({ fullWidth: next })}
      />
      <SelectInput
        id="button-type"
        label="Button type"
        value={readString(props, "buttonType", "button")}
        options={BUTTON_TYPE_OPTIONS}
        testId="button-type"
        onChange={(next) => writePartial({ buttonType: next })}
      />

      <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
        <SegmentedControl<LinkMode>
          id="button-link-mode"
          label="Link mode"
          value={linkMode}
          options={LINK_MODE_OPTIONS}
          testId="button-link-mode"
          onChange={(next) => {
            if (next === "static") {
              writePartial({ linkMode: "static", detailPageSlug: undefined });
              return;
            }
            writePartial({ linkMode: "detail" });
          }}
        />
        {isDetail ? (
          <DetailPageSelect
            id="button-detail-page-slug"
            label="Detail page"
            value={readString(props, "detailPageSlug") || undefined}
            testId="button-detail-page-slug"
            onChange={(next) => writePartial({ detailPageSlug: next })}
          />
        ) : null}
      </div>
    </div>
  );
}
