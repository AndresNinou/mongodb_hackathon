"use client";

import { useState } from "react";
import {
  ChevronRight,
  Check,
  X,
  Loader2,
  FileText,
  Terminal,
  Search,
  FileEdit,
  FilePlus,
  FolderOpen,
  Globe,
  Database,
  GitBranch,
  Folder,
} from "lucide-react";

interface ToolCardProps {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  output?: string;
  error?: string;
  compact?: boolean;
}

// Parse ACP tool args to get the real tool name and args
function parseACPToolArgs(name: string, args: Record<string, unknown>): { displayName: string; displayArgs: Record<string, unknown>; preview: string } {
  if (name === "acp.acp_provider_agent_dynamic_tool" && args.toolName) {
    const toolName = args.toolName as string;
    const innerArgs = (args.args || {}) as Record<string, unknown>;

    let preview = "";
    if (innerArgs.file_path) {
      const filePath = innerArgs.file_path as string;
      const parts = filePath.split("/");
      preview = parts.slice(-2).join("/");
    } else if (innerArgs.command) {
      preview = (innerArgs.command as string).slice(0, 50);
    } else if (innerArgs.pattern) {
      preview = innerArgs.pattern as string;
    } else if (innerArgs.description) {
      preview = innerArgs.description as string;
    }

    return { displayName: toolName, displayArgs: innerArgs, preview };
  }

  const entries = Object.entries(args);
  let preview = "";
  if (entries.length > 0) {
    const [, value] = entries[0];
    preview = typeof value === "string" ? value.slice(0, 50) : "";
  }

  return { displayName: name, displayArgs: args, preview };
}

// Get tool icon - minimal set
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("read")) return FileText;
  if (name.includes("write")) return FilePlus;
  if (name.includes("edit")) return FileEdit;
  if (name.includes("grep") || name.includes("search")) return Search;
  if (name.includes("glob") || name.includes("find")) return FolderOpen;
  if (name.startsWith("ls") || name.startsWith("`ls")) return Folder;
  if (name.includes("bash") || name.startsWith("`")) return Terminal;
  if (name.includes("git")) return GitBranch;
  if (name.includes("mongo") || name.includes("sql")) return Database;
  if (name.includes("web") || name.includes("fetch")) return Globe;
  return Terminal;
}

export function ToolCard({
  name,
  args,
  status,
  output,
  error,
  compact = false,
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { displayName, displayArgs, preview } = parseACPToolArgs(name, args);
  const ToolIcon = getToolIcon(displayName);

  // Compact inline version for running tools
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] font-mono">
        <ToolIcon className="w-3 h-3" />
        <span className="truncate max-w-[200px]">{displayName}</span>
        {status === "running" && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-cyan)]" />}
        {status === "completed" && <Check className="w-3 h-3 text-green-500" />}
        {status === "failed" && <X className="w-3 h-3 text-red-500" />}
      </div>
    );
  }

  return (
    <div className={`
      rounded-lg border text-sm
      ${status === "running"
        ? "border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5"
        : status === "failed"
        ? "border-red-500/30 bg-red-500/5"
        : "border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]"
      }
    `}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--glass-light)] transition-colors"
      >
        {/* Icon */}
        <ToolIcon className={`w-4 h-4 flex-shrink-0 ${
          status === "running" ? "text-[var(--accent-cyan)]" :
          status === "completed" ? "text-green-500" :
          status === "failed" ? "text-red-500" :
          "text-[var(--text-tertiary)]"
        }`} />

        {/* Name & preview */}
        <div className="flex-1 text-left min-w-0">
          <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
          {preview && (
            <span className="ml-2 text-[var(--text-quaternary)] font-mono text-xs truncate">
              {preview}
            </span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-cyan)]" />}
          {status === "completed" && <Check className="w-3.5 h-3.5 text-green-500" />}
          {status === "failed" && <X className="w-3.5 h-3.5 text-red-500" />}
          <ChevronRight className={`w-3.5 h-3.5 text-[var(--text-quaternary)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--glass-border-subtle)]">
          <pre className="text-xs text-[var(--text-secondary)] bg-[var(--glass-dark)] rounded p-2 overflow-x-auto max-h-24 font-mono">
            {JSON.stringify(displayArgs, null, 2)}
          </pre>
          {(output || error) && (
            <pre className={`mt-2 text-xs rounded p-2 overflow-x-auto max-h-32 font-mono ${
              error ? "bg-red-500/10 text-red-400" : "bg-[var(--glass-dark)] text-[var(--text-secondary)]"
            }`}>
              {error || output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Summary component for showing tool activity
interface ToolSummaryProps {
  tools: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    output?: string;
  }>;
}

export function ToolSummary({ tools }: ToolSummaryProps) {
  const [showAll, setShowAll] = useState(false);

  if (tools.length === 0) return null;

  const runningTools = tools.filter(t => t.status === "running");
  const completedCount = tools.filter(t => t.status === "completed").length;
  const failedCount = tools.filter(t => t.status === "failed").length;

  // Show current running tool or last completed
  const currentTool = runningTools[0] || tools[tools.length - 1];
  const { displayName, preview } = parseACPToolArgs(currentTool.name, currentTool.args);
  const ToolIcon = getToolIcon(displayName);

  return (
    <div className="mt-2">
      {/* Current activity indicator */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${runningTools.length > 0
          ? "bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20"
          : "bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]"
        }
      `}>
        <ToolIcon className={`w-4 h-4 ${runningTools.length > 0 ? "text-[var(--accent-cyan)]" : "text-green-500"}`} />

        <div className="flex-1 min-w-0">
          <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
          {preview && <span className="ml-2 text-[var(--text-quaternary)] text-xs font-mono truncate">{preview}</span>}
        </div>

        {runningTools.length > 0 ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" />
        ) : (
          <Check className="w-4 h-4 text-green-500" />
        )}

        {/* Counter badge */}
        {tools.length > 1 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--glass-medium)] text-[var(--text-tertiary)] hover:bg-[var(--glass-light)] transition-colors"
          >
            <span className="text-green-500">{completedCount}</span>
            {failedCount > 0 && <span className="text-red-500">/{failedCount}</span>}
            <ChevronRight className={`w-3 h-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {/* Expanded tool list */}
      {showAll && (
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-[var(--glass-border-subtle)]">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              id={tool.id}
              name={tool.name}
              args={tool.args}
              status={tool.status}
              output={tool.output}
              compact={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
