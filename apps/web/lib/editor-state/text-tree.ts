// Tree traversal for rich-text broadcast mode. `getTextBearingDescendants`
// walks a component subtree (depth-first, root included) and returns every
// node whose registered metadata declares text fields. Used by the
// store action `enterBroadcastTextEditing` to populate `scope.ids` when
// the user double-right-clicks a parent component, and by the AI
// `applyTextFormat` op when it applies a transformer to N targets.

import { componentRegistry } from "@/components/site-components/registry";
import type { ComponentNode } from "@/lib/site-config";

export function getTextBearingDescendants(root: ComponentNode): ComponentNode[] {
  const out: ComponentNode[] = [];
  function walk(node: ComponentNode) {
    const entry = componentRegistry[node.type];
    // `noUncheckedIndexedAccess` narrows the lookup; a config that ever
    // contains an unregistered type would already fail at the renderer's
    // `entry` lookup, so this guard is defensive.
    if (entry && (entry.meta.textFields?.length ?? 0) > 0) {
      out.push(node);
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(root);
  return out;
}
