"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center animate-fade-in">
          {/* Floating orb icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            {/* Glow layers */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-30 blur-2xl animate-float" />
            <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-50 blur-lg" />
            {/* Main orb */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <svg
                viewBox="0 0 24 24"
                className="w-10 h-10 text-white relative z-10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-semibold mb-3 text-[var(--text-primary)]">
            Start Building
          </h3>
          <p className="text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            Describe what you want to build and I&apos;ll help you create it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-liquid p-6 space-y-6">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}
      {isLoading && <LoadingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-start gap-4 animate-fade-in">
      <AssistantAvatar />
      <div className="bubble-assistant px-5 py-4">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full animate-liquid-dots" />
          <span
            className="w-2 h-2 rounded-full animate-liquid-dots"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="w-2 h-2 rounded-full animate-liquid-dots"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] opacity-50 blur-md" />
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-white relative z-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] opacity-50 blur-md" />
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-white relative z-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272z" />
        </svg>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
}: {
  message: UIMessage;
  isLast: boolean;
}) {
  const isUser = message.role === "user";

  // Extract text content from message parts
  const textContent =
    message.parts
      ?.filter(
        (part): part is { type: "text"; text: string } => part.type === "text"
      )
      .map((part) => part.text)
      .join("\n") || "";

  return (
    <div
      className={cn(
        "flex items-start gap-4",
        isUser && "flex-row-reverse",
        isLast ? "animate-slide-up" : "animate-fade-in"
      )}
    >
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      <div className={cn(isUser ? "bubble-user" : "bubble-assistant", "px-5 py-4")}>
        {isUser ? (
          <p className="message-content whitespace-pre-wrap leading-relaxed">
            {textContent}
          </p>
        ) : (
          <div className="message-content prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
