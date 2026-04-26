import type { DataBinding } from "@/lib/site-config";

export function dataBindingQueryKey(
  binding: DataBinding,
  connectedInputValues: Record<string, string>,
): unknown[] {
  // Sort keys for determinism so that re-renders with the same logical state
  // produce a key with identical structure (TanStack Query equality is by
  // deep value, but a deterministic shape is easier to debug).
  const sortedInputs: [string, string][] = Object.keys(connectedInputValues)
    .sort()
    .map((k) => [k, connectedInputValues[k] ?? ""]);
  return [
    "site-data",
    binding.source,
    JSON.stringify(binding.filters ?? null),
    JSON.stringify(binding.sort ?? null),
    binding.limit ?? null,
    sortedInputs,
  ];
}
