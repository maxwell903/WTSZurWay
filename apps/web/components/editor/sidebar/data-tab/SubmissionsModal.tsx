"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubmissionsRows } from "./useSubmissionsRows";
import type { SubmissionRow } from "./useSubmissionsRows";

const MAX_VISIBLE_KEYS = 12;
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type SubmissionsModalProps = {
  open: boolean;
  siteId: string;
  formId: string | null;
  onClose: () => void;
};

export function SubmissionsModal({ open, siteId, formId, onClose }: SubmissionsModalProps) {
  const { state, refetch } = useSubmissionsRows(siteId, formId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        data-testid="submissions-modal"
        className="max-w-4xl bg-zinc-950 text-zinc-100"
      >
        <DialogHeader>
          <DialogTitle data-testid="submissions-modal-title">
            Submissions: {formId ?? ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Read-only table of submissions for this form.
          </DialogDescription>
        </DialogHeader>
        <ModalBody state={state} onRetry={refetch} />
      </DialogContent>
    </Dialog>
  );
}

type ModalBodyProps = {
  state: ReturnType<typeof useSubmissionsRows>["state"];
  onRetry: () => void;
};

function ModalBody({ state, onRetry }: ModalBodyProps) {
  if (state.status === "loading") {
    return (
      <p data-testid="submissions-modal-loading" className="text-sm text-zinc-400">
        Loading submissions…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div data-testid="submissions-modal-error" className="space-y-2">
        <p className="text-sm text-zinc-300">Couldn't load submissions. Retry.</p>
        <Button data-testid="submissions-modal-retry" onClick={onRetry} size="sm">
          Retry
        </Button>
      </div>
    );
  }
  if (state.submissions.length === 0) {
    return (
      <p data-testid="submissions-modal-empty" className="text-sm text-zinc-400">
        No submissions yet.
      </p>
    );
  }
  return <SubmissionsTable rows={state.submissions} />;
}

type ColumnPlan = {
  visibleKeys: string[];
  overflowKeys: string[];
};

function planColumns(rows: SubmissionRow[]): ColumnPlan {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.submittedData)) {
      seen.add(key);
    }
  }
  const all = Array.from(seen);
  if (all.length <= MAX_VISIBLE_KEYS) {
    return { visibleKeys: all, overflowKeys: [] };
  }
  return {
    visibleKeys: all.slice(0, MAX_VISIBLE_KEYS),
    overflowKeys: all.slice(MAX_VISIBLE_KEYS),
  };
}

function renderCell(value: string | undefined): string {
  if (value === undefined || value === "") return "—";
  return value;
}

function renderOverflow(row: SubmissionRow, keys: string[]): string {
  if (keys.length === 0) return "—";
  const subset: Record<string, string> = {};
  for (const key of keys) {
    if (key in row.submittedData) {
      const v = row.submittedData[key];
      if (v !== undefined) subset[key] = v;
    }
  }
  if (Object.keys(subset).length === 0) return "—";
  return JSON.stringify(subset);
}

function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const { visibleKeys, overflowKeys } = planColumns(rows);
  const hasOverflow = overflowKeys.length > 0;

  return (
    <div className="overflow-auto" data-testid="submissions-modal-table-wrapper">
      <table data-testid="submissions-modal-table" className="w-full text-left text-xs">
        <thead className="border-b border-zinc-800 text-zinc-400">
          <tr>
            <th scope="col" className="px-2 py-1.5 font-medium">
              Submitted at
            </th>
            {visibleKeys.map((key) => (
              <th key={key} scope="col" className="px-2 py-1.5 font-medium">
                {key}
              </th>
            ))}
            {hasOverflow ? (
              <th scope="col" className="px-2 py-1.5 font-medium">
                Other
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-testid={`submissions-modal-row-${row.id}`}
              className="border-b border-zinc-900"
            >
              <td className="px-2 py-1.5 text-zinc-300">{formatTimestamp(row.createdAt)}</td>
              {visibleKeys.map((key) => (
                <td key={key} className="px-2 py-1.5 text-zinc-200">
                  {renderCell(row.submittedData[key])}
                </td>
              ))}
              {hasOverflow ? (
                <td className="px-2 py-1.5 font-mono text-[11px] text-zinc-300">
                  {renderOverflow(row, overflowKeys)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return TIMESTAMP_FORMATTER.format(parsed);
}
