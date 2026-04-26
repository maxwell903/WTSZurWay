"use client";

// dnd-kit identifies every draggable, droppable, and sortable target by an
// opaque string|number id. Sprint 7 partitions that id space into three
// disjoint flavors so the `onDrag*` handlers can dispatch on intent
// without string-sniffing:
//
//   palette:${ComponentType}   — a card in the Add tab; drop creates a new node
//   node:${ComponentId}        — a rendered canvas component; drop reorders/moves
//   dropzone:${ComponentId}    — an empty container's drop target; drop appends
//
// All three constructors and parsers are pure and exported by name (no
// default exports). The parsers accept `unknown` because dnd-kit's
// `UniqueIdentifier` is `string | number`.

import type { ComponentId } from "@/lib/editor-state";
import { COMPONENT_TYPES, type ComponentType } from "@/lib/site-config";

const PALETTE_PREFIX = "palette:";
const NODE_PREFIX = "node:";
const DROPZONE_PREFIX = "dropzone:";

export type PaletteDragId = `palette:${ComponentType}`;
export type NodeDragId = `node:${ComponentId}`;
export type DropZoneId = `dropzone:${ComponentId}`;

export function paletteId(type: ComponentType): PaletteDragId {
  return `${PALETTE_PREFIX}${type}` as PaletteDragId;
}

export function nodeId(id: ComponentId): NodeDragId {
  return `${NODE_PREFIX}${id}` as NodeDragId;
}

export function dropZoneId(id: ComponentId): DropZoneId {
  return `${DROPZONE_PREFIX}${id}` as DropZoneId;
}

const COMPONENT_TYPE_SET: ReadonlySet<string> = new Set(COMPONENT_TYPES);

function isComponentType(value: string): value is ComponentType {
  return COMPONENT_TYPE_SET.has(value);
}

export function isPaletteId(value: unknown): value is PaletteDragId {
  if (typeof value !== "string") return false;
  if (!value.startsWith(PALETTE_PREFIX)) return false;
  return isComponentType(value.slice(PALETTE_PREFIX.length));
}

export function isNodeId(value: unknown): value is NodeDragId {
  if (typeof value !== "string") return false;
  if (!value.startsWith(NODE_PREFIX)) return false;
  return value.length > NODE_PREFIX.length;
}

export function isDropZoneId(value: unknown): value is DropZoneId {
  if (typeof value !== "string") return false;
  if (!value.startsWith(DROPZONE_PREFIX)) return false;
  return value.length > DROPZONE_PREFIX.length;
}

export function parsePaletteId(value: unknown): ComponentType | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(PALETTE_PREFIX)) return null;
  const tail = value.slice(PALETTE_PREFIX.length);
  return isComponentType(tail) ? tail : null;
}

export function parseNodeId(value: unknown): ComponentId | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(NODE_PREFIX)) return null;
  const tail = value.slice(NODE_PREFIX.length);
  return tail.length > 0 ? tail : null;
}

export function parseDropZoneId(value: unknown): ComponentId | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(DROPZONE_PREFIX)) return null;
  const tail = value.slice(DROPZONE_PREFIX.length);
  return tail.length > 0 ? tail : null;
}
