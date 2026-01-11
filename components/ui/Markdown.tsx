"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";

// Initialize markdown-it with sensible defaults for chat
const md = new MarkdownIt({
  html: false, // Disable HTML for security in chat
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
});

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  const html = useMemo(() => {
    if (!content) return "";
    return md.render(content);
  }, [content]);

  return (
    <div
      className={`prose prose-sm prose-invert max-w-none
        prose-p:my-2 prose-p:leading-relaxed
        prose-headings:text-[var(--text-primary)] prose-headings:font-semibold
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
        prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
        prose-code:text-[var(--accent-cyan)] prose-code:bg-[var(--glass-dark)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[var(--glass-dark)] prose-pre:border prose-pre:border-[var(--glass-border-subtle)] prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto
        prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline
        prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
        prose-blockquote:border-l-[var(--accent-purple)] prose-blockquote:bg-[var(--glass-dark)] prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r
        prose-table:text-sm prose-th:bg-[var(--glass-dark)] prose-td:border-[var(--glass-border-subtle)]
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
