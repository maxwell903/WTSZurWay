"use client";

/**
 * Top-level composition for the right-sidebar AI chat. Composes the
 * transcript, narration, selection chip, suggested-prompt chips, and
 * composer; owns the prompt-prefill plumbing between the chips and the
 * composer.
 *
 * §8.7 ordering: messages list (top, scrollable) -> selection chip ->
 * composer -> suggested-prompt chips below the composer.
 */

import { cn } from "@/lib/utils";
import { useState } from "react";
import { AiEditNarration } from "./AiEditNarration";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { SelectionChip } from "./SelectionChip";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { useAiEditChat } from "./useAiEditChat";

export type RightSidebarAiChatProps = {
  className?: string;
};

export function RightSidebarAiChat({ className }: RightSidebarAiChatProps) {
  const { messages, loading, send, accept, discard, retry } = useAiEditChat();
  const [prefill, setPrefill] = useState("");

  return (
    <div
      data-testid="right-sidebar-ai-chat"
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <MessageList messages={messages} onAccept={accept} onDiscard={discard} onRetry={retry} />
        {loading && <AiEditNarration className="mt-3 px-3" />}
      </div>
      <div className="space-y-2 border-t border-zinc-800 px-3 py-3">
        <SelectionChip />
        <Composer
          disabled={loading}
          onSend={(prompt, attachments) => {
            void send(prompt, attachments);
          }}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill("")}
        />
        <SuggestedPrompts onPick={(prompt) => setPrefill(prompt)} />
      </div>
    </div>
  );
}

export function pendingSuggestionCount(
  messages: { role: string; kind?: string; status?: string }[],
): number {
  return messages.filter((m) => m.role === "assistant" && m.kind === "ok" && m.status === "pending")
    .length;
}
