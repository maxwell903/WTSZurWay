"use client";

/**
 * Renders the chat transcript as a vertical stack of MessageBubble children.
 * The empty-state copy mirrors §8.7's empty-input placeholder.
 */

import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./types";

export type MessageListProps = {
  messages: Message[];
  onAccept: (messageId: string) => void;
  onDiscard: (messageId: string) => void;
  onRetry: () => void;
  className?: string;
};

export function MessageList({
  messages,
  onAccept,
  onDiscard,
  onRetry,
  className,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div
        data-testid="message-list-empty"
        className={cn("flex h-full items-center justify-center px-6 text-center", className)}
      >
        <p className="text-xs text-zinc-500">Ask anything about this site…</p>
      </div>
    );
  }
  return (
    <div data-testid="message-list" className={cn("flex flex-col gap-3", className)}>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          onAccept={onAccept}
          onDiscard={onDiscard}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
