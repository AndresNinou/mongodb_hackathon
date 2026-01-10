"use client";

import { useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        const form = e.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <div className="p-4 pb-6">
      {/* Command bar container */}
      <form onSubmit={handleSubmit} className="command-bar group">
        {/* Prismatic border - animated on focus */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-[1px]" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-0 group-focus-within:opacity-50 transition-opacity duration-300 animate-gradient-shift" style={{ backgroundSize: "200% 200%" }} />

        {/* Inner container */}
        <div className="relative flex items-end gap-3 p-3 rounded-2xl bg-[var(--glass-dense)] border border-[var(--glass-border)] backdrop-blur-xl">
          {/* Sparkle icon */}
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--glass-light)] to-transparent flex-shrink-0 mb-0.5">
            <Sparkles className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={1}
              disabled={isLoading}
              className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] text-base leading-relaxed resize-none outline-none py-2.5 pr-2 scrollbar-liquid min-h-[44px] max-h-[200px]"
            />
            {/* Placeholder gradient animation - shown when empty */}
            {!input && (
              <div className="absolute inset-0 pointer-events-none flex items-center py-2.5 overflow-hidden opacity-0">
                <span className="gradient-text-animated text-base">
                  Describe what you want to build...
                </span>
              </div>
            )}
          </div>

          {/* Send button - glowing orb */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group/btn"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-0 group-hover/btn:opacity-60 group-disabled/btn:opacity-0 blur-lg transition-opacity duration-300" />

            {/* Button background */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] transition-transform duration-200 group-hover/btn:scale-105 group-active/btn:scale-95" />

            {/* Inner shine */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />

            {/* Icon */}
            <div className="relative z-10">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white transform translate-x-[1px]" />
              )}
            </div>

            {/* Pulse ring when active */}
            {input.trim() && !isLoading && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] animate-orb-pulse" />
            )}
          </button>
        </div>
      </form>

      {/* Hint text */}
      <p className="text-xs text-[var(--text-quaternary)] mt-3 text-center">
        Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-frosted)] text-[var(--text-tertiary)] font-mono text-[10px]">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-frosted)] text-[var(--text-tertiary)] font-mono text-[10px]">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
}
