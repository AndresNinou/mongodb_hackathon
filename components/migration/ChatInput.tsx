"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = "Send a message to the agent...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled || isStreaming) return;

    onSend(trimmed);
    setMessage("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  const isDisabled = disabled && !isStreaming;

  return (
    <div className="border-t border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
      <div
        className={`
          flex items-end gap-3 rounded-2xl border transition-all
          ${isDisabled
            ? "border-[var(--glass-border-subtle)] bg-[var(--glass-dark)] opacity-60"
            : "border-[var(--glass-border-light)] bg-[var(--glass-medium)] focus-within:border-[var(--accent-cyan)]/50"
          }
          px-4 py-3
        `}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled || isStreaming}
          rows={1}
          className={`
            flex-1 bg-transparent border-none outline-none resize-none
            text-sm text-[var(--text-primary)] placeholder-[var(--text-quaternary)]
            min-h-[24px] max-h-[150px]
            ${isDisabled || isStreaming ? "cursor-not-allowed" : ""}
          `}
        />

        {/* Stop button when streaming */}
        {isStreaming && onStop ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
              bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
            title="Stop generating"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={isDisabled || !message.trim() || isStreaming}
            className={`
              flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
              transition-all
              ${message.trim() && !isDisabled && !isStreaming
                ? "bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] text-white hover:opacity-90"
                : "bg-[var(--glass-dark)] text-[var(--text-quaternary)]"
              }
              ${isDisabled || isStreaming ? "cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {disabled && !isStreaming && (
        <div className="text-xs text-[var(--text-quaternary)] text-center mt-2">
          Chat available when agent is active
        </div>
      )}
    </div>
  );
}
