"use client";

import { useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput } from "./ChatInput";
import { renderMessagePart, MessageWrapper } from "@/lib/utils/messageRenderer";
import { MessageCircle, Loader2 } from "lucide-react";
import type { UIMessagePart, UITool } from "ai";

interface AgentChatPanelProps {
  migrationId: string;
  // Note: onStatusChange removed - status is now managed by useChat
}

export function AgentChatPanel({
  migrationId,
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use AI SDK's useChat hook with custom transport
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/migrations/${migrationId}/chat`,
    }),
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSend = (message: string) => {
    if (message.trim()) {
      sendMessage({ text: message });
    }
  };

  // Determine streaming state
  const isStreaming = status === "streaming";
  const isSubmitting = status === "submitted";

  // Get contextual message based on state
  const getStatusMessage = () => {
    if (messages.length > 0) return null;
    if (error) {
      return {
        title: "Connection Error",
        message: error.message || "Failed to connect to the agent.",
      };
    }
    return {
      title: "Ready to Chat",
      message: "Send a message to start a conversation with the AI agent.",
    };
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {/* Status message when no messages */}
        {statusMessage && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-[var(--accent-cyan)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {statusMessage.title}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
              {statusMessage.message}
            </p>
          </div>
        )}

        {/* Render messages */}
        {messages.map((message) => (
          <MessageWrapper
            key={message.id}
            role={message.role as "user" | "assistant"}
          >
            <div className="space-y-2">
              {message.parts.map((part, index) =>
                renderMessagePart(
                  part as UIMessagePart<Record<string, unknown>, Record<string, UITool>>,
                  message.id,
                  index,
                  isStreaming && index === message.parts.length - 1,
                  message.metadata as Record<string, unknown> | undefined
                )
              )}
            </div>
          </MessageWrapper>
        ))}

        {/* Loading indicator when submitting */}
        {isSubmitting && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                <span>Connecting to agent...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="text-sm text-red-400">
              <strong>Error:</strong> {error.message}
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <ChatInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={false}
        placeholder="Send a message to the agent..."
      />
    </div>
  );
}
