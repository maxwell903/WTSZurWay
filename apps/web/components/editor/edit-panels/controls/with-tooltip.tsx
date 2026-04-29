"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

export type WithTooltipProps = {
  tooltip?: string;
  testId?: string;
  children: ReactNode;
};

export function WithTooltip({ tooltip, testId, children }: WithTooltipProps) {
  if (!tooltip) {
    return <>{children}</>;
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="block w-full"
            data-with-tooltip="true"
            data-testid={testId ? `${testId}-tooltip-trigger` : undefined}
          >
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs border-zinc-700 bg-zinc-900 text-zinc-100"
          data-testid={testId ? `${testId}-tooltip` : undefined}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
