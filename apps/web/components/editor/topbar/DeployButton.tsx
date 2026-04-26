"use client";

import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { toast } from "sonner";

export function DeployButton() {
  return (
    <Button
      type="button"
      data-testid="deploy-button"
      size="sm"
      className="h-9 gap-2"
      onClick={() => {
        toast("Deploy is coming in a later sprint.");
      }}
    >
      <Rocket className="h-4 w-4" />
      Deploy
    </Button>
  );
}
