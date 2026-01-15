"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import MarkdownIt from "markdown-it";
import mermaid from "mermaid";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Brain,
} from "lucide-react";

interface PlanViewerProps {
  plan: Record<string, unknown> | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#06b6d4",
    primaryTextColor: "#fff",
    primaryBorderColor: "#0e7490",
    lineColor: "#94a3b8",
    secondaryColor: "#8b5cf6",
    tertiaryColor: "#1e293b",
    background: "#0f172a",
    mainBkg: "#1e293b",
    nodeBkg: "#1e293b",
    clusterBkg: "#1e293b",
    titleColor: "#f1f5f9",
    edgeLabelBackground: "#1e293b",
  },
  flowchart: {
    curve: "basis",
    padding: 20,
  },
});

export function PlanViewer({
  plan,
  isExpanded = false,
  onToggleExpand,
}: PlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract content from plan
  const getPlanContent = useCallback((): string => {
    if (!plan) return "";

    // If plan has raw_output, use that
    if (typeof plan.raw_output === "string") {
      return plan.raw_output;
    }

    // If plan has a summary, include it
    let content = "";
    if (typeof plan.summary === "string") {
      content += `## Summary\n\n${plan.summary}\n\n`;
    }

    // If plan has tables, render them
    if (Array.isArray(plan.tables) && plan.tables.length > 0) {
      content += `## Tables to Migrate\n\n`;
      content += `| SQL Table | MongoDB Collection |\n`;
      content += `|-----------|-------------------|\n`;
      for (const table of plan.tables as { name: string; collection: string }[]) {
        content += `| ${table.name} | ${table.collection} |\n`;
      }
      content += "\n";
    }

    // If plan has migrations array
    if (Array.isArray(plan.migrations)) {
      content += `## Migration Steps\n\n`;
      for (const [i, step] of (plan.migrations as { description?: string }[]).entries()) {
        content += `${i + 1}. ${step.description || JSON.stringify(step)}\n`;
      }
      content += "\n";
    }

    // If plan has schema changes
    if (plan.schema_changes) {
      content += `## Schema Changes\n\n\`\`\`json\n${JSON.stringify(plan.schema_changes, null, 2)}\n\`\`\`\n\n`;
    }

    // If nothing specific, stringify the whole plan
    if (!content) {
      content = `\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\``;
    }

    return content;
  }, [plan]);

  // Render markdown and mermaid diagrams
  useEffect(() => {
    const content = getPlanContent();
    if (!content) {
      setRenderedContent("");
      return;
    }

    // Render markdown
    const html = md.render(content);
    setRenderedContent(html);
  }, [getPlanContent]);

  // Process mermaid diagrams after content is rendered
  useEffect(() => {
    if (!containerRef.current || !renderedContent) return;

    const processMermaid = async () => {
      const mermaidBlocks = containerRef.current?.querySelectorAll("code.language-mermaid");
      if (!mermaidBlocks?.length) return;

      for (const block of mermaidBlocks) {
        const code = block.textContent || "";
        const parent = block.parentElement;
        if (!parent) continue;

        try {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, code);

          // Create a wrapper div for the SVG
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-diagram";
          wrapper.innerHTML = svg;

          // Replace the pre/code block with the rendered diagram
          parent.parentElement?.replaceChild(wrapper, parent);
        } catch (err) {
          console.error("Mermaid render error:", err);
        }
      }
    };

    processMermaid();
  }, [renderedContent]);

  // Copy to clipboard
  const handleCopy = async () => {
    const content = getPlanContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!plan) {
    return (
      <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-[var(--accent-cyan)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          No Plan Yet
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Click &quot;Start Planning&quot; to generate a migration plan.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]
        transition-all duration-300 overflow-hidden
        ${isFullscreen ? "fixed inset-4 z-50" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-dark)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Migration Plan
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Generated by Planner Agent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Expand/collapse toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className={`
          overflow-auto p-6 prose prose-invert prose-sm max-w-none
          ${isFullscreen ? "h-[calc(100%-60px)]" : isExpanded ? "max-h-[600px]" : "max-h-[300px]"}

          /* Custom prose styles */
          prose-headings:text-[var(--text-primary)]
          prose-headings:font-semibold
          prose-h1:text-xl prose-h1:border-b prose-h1:border-[var(--glass-border-subtle)] prose-h1:pb-2
          prose-h2:text-lg prose-h2:text-[var(--accent-cyan)]
          prose-h3:text-base
          prose-p:text-[var(--text-secondary)]
          prose-strong:text-[var(--text-primary)]
          prose-code:text-[var(--accent-purple)] prose-code:bg-[var(--glass-dark)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-[var(--glass-dark)] prose-pre:border prose-pre:border-[var(--glass-border-subtle)]
          prose-a:text-[var(--accent-cyan)] prose-a:no-underline hover:prose-a:underline
          prose-ul:text-[var(--text-secondary)]
          prose-ol:text-[var(--text-secondary)]
          prose-li:marker:text-[var(--accent-cyan)]
          prose-table:border-collapse
          prose-th:bg-[var(--glass-dark)] prose-th:text-[var(--text-primary)] prose-th:p-2 prose-th:border prose-th:border-[var(--glass-border-subtle)]
          prose-td:p-2 prose-td:border prose-td:border-[var(--glass-border-subtle)] prose-td:text-[var(--text-secondary)]
          prose-blockquote:border-l-[var(--accent-cyan)] prose-blockquote:bg-[var(--glass-dark)] prose-blockquote:py-1 prose-blockquote:px-4
        `}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 -z-10"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
