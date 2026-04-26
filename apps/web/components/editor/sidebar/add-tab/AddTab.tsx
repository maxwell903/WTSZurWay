"use client";

import type { ComponentType } from "@/lib/site-config";
import { useState } from "react";
import { ComponentCard } from "./ComponentCard";
import { COMPONENT_GROUP_ORDER, getCatalogByGroup } from "./component-catalog";

export function AddTab() {
  const [selected, setSelected] = useState<ComponentType | null>(null);
  const grouped = getCatalogByGroup();

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      {COMPONENT_GROUP_ORDER.map((group) => {
        const entries = grouped[group];
        if (entries.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {group}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {entries.map((entry) => (
                <ComponentCard
                  key={entry.type}
                  entry={entry}
                  selected={entry.type === selected}
                  onSelect={(type) => setSelected(type)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
