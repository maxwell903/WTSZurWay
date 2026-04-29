"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  ImageIcon,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { MediaUpload } from "./MediaUpload";
import { TextInput } from "./TextInput";
import { WithTooltip } from "./with-tooltip";

// Per-slide shape — superset of the v1 SlideshowImage. All extra fields
// optional so back-compat callers reading {src, alt} still work. The
// `kind` discriminator drives image-vs-video field rendering.
export type SlideshowImage = {
  src?: string;
  alt?: string;
  kind?: "image" | "video";
  // image-only is the default — videoSrc/etc only apply when kind === "video"
  videoSrc?: string;
  videoSrcWebm?: string;
  videoPoster?: string;
  // Per-slide content overrides (Sprint 8)
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
};

export type BannerInheritance = {
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export type SlideshowImagesEditorProps = {
  id: string;
  label?: string;
  value: SlideshowImage[];
  onChange: (next: SlideshowImage[]) => void;
  testId?: string;
  // Banner-level field values that slides inherit when their per-slide
  // version is empty. Used to render the "(inherits 'X')" placeholder.
  inheritance?: BannerInheritance;
};

export function SlideshowImagesEditor({
  id,
  label,
  value,
  onChange,
  testId,
  inheritance,
}: SlideshowImagesEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (idx: number, patch: Partial<SlideshowImage>) => {
    const next = value.slice();
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const append = () => {
    onChange([...value, { src: "", alt: "" }]);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(active.id);
    const newIdx = Number(over.id);
    if (Number.isNaN(oldIdx) || Number.isNaN(newIdx)) return;
    onChange(arrayMove(value, oldIdx, newIdx));
  };

  const ids = value.map((_, i) => String(i));

  return (
    <div className="space-y-2" data-testid={testId}>
      {label ? <Label className="text-xs text-zinc-300">{label}</Label> : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((entry, idx) => (
              <SortableSlideRow
                key={String(idx)}
                sortableId={String(idx)}
                idPrefix={`${id}-${idx}`}
                slide={entry}
                index={idx}
                inheritance={inheritance}
                testId={testId ? `${testId}-${idx}` : undefined}
                onChange={(patch) => update(idx, patch)}
                onRemove={() => remove(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={testId ? `${testId}-add` : undefined}
        onClick={append}
        className="w-full border-dashed border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900"
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add slide
      </Button>
    </div>
  );
}

function SortableSlideRow({
  sortableId,
  idPrefix,
  slide,
  index,
  inheritance,
  testId,
  onChange,
  onRemove,
}: {
  sortableId: string;
  idPrefix: string;
  slide: SlideshowImage;
  index: number;
  inheritance?: BannerInheritance;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [expanded, setExpanded] = useState(false);
  const kind: "image" | "video" = slide.kind === "video" ? "video" : "image";
  const collapsedHeading = slide.heading || `Slide ${index + 1}`;
  const thumbSrc = kind === "image" ? slide.src : slide.videoPoster;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={testId}
      className="rounded-md border border-zinc-800 bg-zinc-900"
    >
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          type="button"
          aria-label={`Drag slide ${index + 1}`}
          data-testid={testId ? `${testId}-drag` : undefined}
          className="cursor-grab text-zinc-500 hover:text-zinc-200"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            className="h-7 w-10 shrink-0 rounded object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-7 w-10 shrink-0 place-items-center rounded bg-zinc-800 text-zinc-500">
            {kind === "video" ? (
              <Video className="h-3.5 w-3.5" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
          </div>
        )}
        <span className="flex-1 truncate text-xs text-zinc-200">{collapsedHeading}</span>
        <button
          type="button"
          aria-label={expanded ? `Collapse slide ${index + 1}` : `Expand slide ${index + 1}`}
          data-testid={testId ? `${testId}-toggle` : undefined}
          aria-expanded={expanded}
          onClick={() => setExpanded((x) => !x)}
          className="text-zinc-400 hover:text-zinc-100"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          aria-label={`Remove slide ${index + 1}`}
          data-testid={testId ? `${testId}-remove` : undefined}
          onClick={onRemove}
          className="text-zinc-400 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <div
          data-testid={testId ? `${testId}-expanded` : undefined}
          className="space-y-2 border-t border-zinc-800 p-2"
        >
          <KindToggle
            kind={kind}
            onChange={(nextKind) => onChange({ kind: nextKind })}
            testId={testId ? `${testId}-kind` : undefined}
          />
          {kind === "image" ? (
            <ImageFields idPrefix={idPrefix} slide={slide} testId={testId} onChange={onChange} />
          ) : (
            <VideoFields idPrefix={idPrefix} slide={slide} testId={testId} onChange={onChange} />
          )}
          <ContentFields
            idPrefix={idPrefix}
            slide={slide}
            inheritance={inheritance}
            testId={testId}
            onChange={onChange}
          />
          <AlignmentFields idPrefix={idPrefix} slide={slide} testId={testId} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

function KindToggle({
  kind,
  onChange,
  testId,
}: {
  kind: "image" | "video";
  onChange: (next: "image" | "video") => void;
  testId?: string;
}) {
  return (
    <WithTooltip tooltip="Choose whether this slide is an image or a video." testId={testId}>
      <div
        role="radiogroup"
        aria-label="Slide kind"
        data-testid={testId}
        className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
      >
        {(["image", "video"] as const).map((opt) => {
          const selected = kind === opt;
          return (
            <button
              key={opt}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: parent role="radiogroup" + role="radio" carries the same a11y semantics; native inputs can't be styled into a horizontal segmented control.
              role="radio"
              aria-checked={selected}
              data-testid={testId ? `${testId}-${opt}` : undefined}
              onClick={() => onChange(opt)}
              className={
                selected
                  ? "flex-1 rounded bg-orange-400/90 px-2 py-1 text-xs capitalize text-zinc-950"
                  : "flex-1 rounded px-2 py-1 text-xs capitalize text-zinc-300 hover:text-zinc-100"
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </WithTooltip>
  );
}

function ImageFields({
  idPrefix,
  slide,
  testId,
  onChange,
}: {
  idPrefix: string;
  slide: SlideshowImage;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
}) {
  return (
    <>
      <TextInput
        id={`${idPrefix}-src`}
        label="Image URL"
        value={slide.src ?? ""}
        placeholder="https://..."
        testId={testId ? `${testId}-src-url` : undefined}
        tooltip="Paste a URL or use the upload button below."
        onChange={(next) => onChange({ src: next })}
      />
      <MediaUpload
        accept="image/*"
        value={slide.src}
        onUploaded={(url) => onChange({ src: url })}
        onCleared={() => onChange({ src: "" })}
        testId={testId ? `${testId}-src-upload` : undefined}
        tooltip="Uploads to the site-media bucket and pastes the URL above."
      />
      <TextInput
        id={`${idPrefix}-alt`}
        label="Alt text"
        value={slide.alt ?? ""}
        placeholder="Alt text (optional)"
        testId={testId ? `${testId}-alt` : undefined}
        tooltip="Describe the image for screen readers and SEO. Leave blank for decorative images."
        onChange={(next) => onChange({ alt: next })}
      />
    </>
  );
}

function VideoFields({
  idPrefix,
  slide,
  testId,
  onChange,
}: {
  idPrefix: string;
  slide: SlideshowImage;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
}) {
  return (
    <>
      <TextInput
        id={`${idPrefix}-video-src`}
        label="Video URL (mp4)"
        value={slide.videoSrc ?? ""}
        placeholder="https://..."
        testId={testId ? `${testId}-video-src` : undefined}
        tooltip="Required mp4 source. Use the upload button below to upload one."
        onChange={(next) => onChange({ videoSrc: next })}
      />
      <MediaUpload
        accept="video/*"
        value={slide.videoSrc}
        onUploaded={(url) => onChange({ videoSrc: url })}
        onCleared={() => onChange({ videoSrc: "" })}
        testId={testId ? `${testId}-video-upload` : undefined}
        tooltip="Uploads a video to the site-media bucket."
      />
      <TextInput
        id={`${idPrefix}-video-webm`}
        label="Video URL (webm, optional)"
        value={slide.videoSrcWebm ?? ""}
        placeholder="https://..."
        testId={testId ? `${testId}-video-webm` : undefined}
        tooltip="Optional webm source — preferred over mp4 in browsers that support it."
        onChange={(next) => onChange({ videoSrcWebm: next })}
      />
      <TextInput
        id={`${idPrefix}-video-poster`}
        label="Poster URL"
        value={slide.videoPoster ?? ""}
        placeholder="https://..."
        testId={testId ? `${testId}-video-poster` : undefined}
        tooltip="Static fallback shown while the video loads or under reduce-motion preference."
        onChange={(next) => onChange({ videoPoster: next })}
      />
    </>
  );
}

function ContentFields({
  idPrefix,
  slide,
  inheritance,
  testId,
  onChange,
}: {
  idPrefix: string;
  slide: SlideshowImage;
  inheritance?: BannerInheritance;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
}) {
  const placeholderFor = (val: string | undefined) =>
    val && val.length > 0 ? `(inherits "${val}")` : "(inherits banner)";
  return (
    <div className="space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/30 p-1.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Per-slide content</p>
      <TextInput
        id={`${idPrefix}-heading`}
        label="Heading"
        value={slide.heading ?? ""}
        placeholder={placeholderFor(inheritance?.heading)}
        testId={testId ? `${testId}-heading` : undefined}
        tooltip="Overrides the banner heading on this slide. Leave blank to inherit."
        onChange={(next) => onChange({ heading: next })}
      />
      <TextInput
        id={`${idPrefix}-subheading`}
        label="Sub-heading"
        value={slide.subheading ?? ""}
        placeholder={placeholderFor(inheritance?.subheading)}
        testId={testId ? `${testId}-subheading` : undefined}
        tooltip="Overrides the banner sub-heading on this slide."
        onChange={(next) => onChange({ subheading: next })}
      />
      <TextInput
        id={`${idPrefix}-cta-label`}
        label="Primary CTA label"
        value={slide.ctaLabel ?? ""}
        placeholder={placeholderFor(inheritance?.ctaLabel)}
        testId={testId ? `${testId}-cta-label` : undefined}
        tooltip="Overrides the primary CTA button text on this slide."
        onChange={(next) => onChange({ ctaLabel: next })}
      />
      <TextInput
        id={`${idPrefix}-cta-href`}
        label="Primary CTA href"
        value={slide.ctaHref ?? ""}
        placeholder={placeholderFor(inheritance?.ctaHref)}
        testId={testId ? `${testId}-cta-href` : undefined}
        tooltip="Overrides where the primary CTA links to on this slide."
        onChange={(next) => onChange({ ctaHref: next })}
      />
      <TextInput
        id={`${idPrefix}-secondary-cta-label`}
        label="Secondary CTA label"
        value={slide.secondaryCtaLabel ?? ""}
        placeholder={placeholderFor(inheritance?.secondaryCtaLabel)}
        testId={testId ? `${testId}-secondary-cta-label` : undefined}
        tooltip="Adds an outlined secondary CTA next to the primary. Leave blank to hide."
        onChange={(next) => onChange({ secondaryCtaLabel: next })}
      />
      <TextInput
        id={`${idPrefix}-secondary-cta-href`}
        label="Secondary CTA href"
        value={slide.secondaryCtaHref ?? ""}
        placeholder={placeholderFor(inheritance?.secondaryCtaHref)}
        testId={testId ? `${testId}-secondary-cta-href` : undefined}
        tooltip="Where the secondary CTA links to."
        onChange={(next) => onChange({ secondaryCtaHref: next })}
      />
    </div>
  );
}

function AlignmentFields({
  idPrefix: _idPrefix,
  slide,
  testId,
  onChange,
}: {
  idPrefix: string;
  slide: SlideshowImage;
  testId?: string;
  onChange: (patch: Partial<SlideshowImage>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <SegmentedTriple
        label="Horizontal"
        value={slide.align}
        options={["left", "center", "right"] as const}
        testId={testId ? `${testId}-align` : undefined}
        tooltip="Horizontal text alignment for this slide."
        onChange={(next) => onChange({ align: next })}
      />
      <SegmentedTriple
        label="Vertical"
        value={slide.verticalAlign}
        options={["top", "center", "bottom"] as const}
        testId={testId ? `${testId}-valign` : undefined}
        tooltip="Vertical text position for this slide."
        onChange={(next) => onChange({ verticalAlign: next })}
      />
    </div>
  );
}

function SegmentedTriple<T extends string>({
  label,
  value,
  options,
  testId,
  tooltip,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly [T, T, T];
  testId?: string;
  tooltip?: string;
  onChange: (next: T) => void;
}) {
  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-1">
        <Label className="text-[10px] text-zinc-400">{label}</Label>
        <div
          role="radiogroup"
          aria-label={label}
          data-testid={testId}
          className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
        >
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                // biome-ignore lint/a11y/useSemanticElements: parent role="radiogroup" + role="radio" carries the same a11y semantics; native inputs can't be styled into a horizontal segmented control.
                role="radio"
                aria-checked={selected}
                data-testid={testId ? `${testId}-${opt}` : undefined}
                onClick={() => onChange(opt)}
                className={
                  selected
                    ? "flex-1 rounded bg-orange-400/90 px-1 py-0.5 text-[10px] capitalize text-zinc-950"
                    : "flex-1 rounded px-1 py-0.5 text-[10px] capitalize text-zinc-300 hover:text-zinc-100"
                }
              >
                {opt[0]}
              </button>
            );
          })}
        </div>
      </div>
    </WithTooltip>
  );
}

// Re-export `Input` so existing call-sites that imported it from this module
// (none currently, but keeps the surface stable).
export { Input };
