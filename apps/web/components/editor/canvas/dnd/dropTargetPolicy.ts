"use client";

// Sprint 7 routes drop-target validation through the component registry's
// `meta.childrenPolicy`. The registry is the SINGLE source of truth — the
// per-component SPEC.md files mirror it but are not read at runtime.
//
// Drop into a `Repeater` template child is INTENTIONALLY out of scope for
// Sprint 7. A Heading dropped into an empty Repeater fills the template
// slot — that is the correct Sprint-7 behavior. Sprint 9 will resolve
// `{{ row.* }}` tokens at render time when row context is available.
// See Sprint 7 CLAUDE.md "Known risks & failure modes".

import { type ChildrenPolicy, componentRegistry } from "@/components/site-components/registry";
import type { ComponentNode, ComponentType } from "@/lib/site-config";

export function getChildrenPolicy(type: ComponentType): ChildrenPolicy {
  return componentRegistry[type].meta.childrenPolicy;
}

// Sprint 7's children-policy decision is a property of the parent only;
// the candidate type is part of the signature so a future Sprint-9+
// extension (Repeater template constraints, Form-only InputField etc.)
// has somewhere to grow without changing the call sites.
export function canAcceptChild(parent: ComponentNode, _candidateType: ComponentType): boolean {
  const policy = getChildrenPolicy(parent.type);
  if (policy === "none") return false;
  if (policy === "many") return true;
  // policy === "one"
  return (parent.children?.length ?? 0) === 0;
}

export function findInsertionIndex(parent: ComponentNode, overId: string): number {
  // When the drag is hovering one of the parent's children, drop AT that
  // child's index (pushing it and its successors down). When the drag is
  // hovering the parent's empty body, an unknown id, or the parent
  // itself, drop at the END (append).
  const children = parent.children ?? [];
  const idx = children.findIndex((c) => c.id === overId);
  if (idx === -1) return children.length;
  return idx;
}
