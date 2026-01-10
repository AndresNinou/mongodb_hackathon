"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Send a message to the agent...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    setMessage("");

    try {
      await onSend(trimmed);
    } catch (error) {
      console.error("[ChatInput] Send error:", error);
      // Restore message on error
      setMessage(trimmed);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
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

  const isDisabled = disabled || isSending;

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
          disabled={isDisabled}
          rows={1}
          className={`
            flex-1 bg-transparent border-none outline-none resize-none
            text-sm text-[var(--text-primary)] placeholder-[var(--text-quaternary)]
            min-h-[24px] max-h-[150px]
            ${isDisabled ? "cursor-not-allowed" : ""}
          `}
        />

        <button
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className={`
            flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
            transition-all
            ${message.trim() && !isDisabled
              ? "bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] text-white hover:opacity-90"
              : "bg-[var(--glass-dark)] text-[var(--text-quaternary)]"
            }
            ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {disabled && (
        <div className="text-xs text-[var(--text-quaternary)] text-center mt-2">
          Chat available when agent is active
        </div>
      )}
    </div>
  );
}
