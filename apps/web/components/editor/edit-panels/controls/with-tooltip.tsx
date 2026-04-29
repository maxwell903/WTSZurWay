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
          <span
            className="block w-full"
            data-with-tooltip="true"
            data-testid={testId ? `${testId}-tooltip-trigger` : undefined}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs"
          data-testid={testId ? `${testId}-tooltip` : undefined}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
