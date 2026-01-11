"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  FileText,
  Terminal,
  Search,
  FileEdit,
  FilePlus,
  Cpu,
  Globe,
} from "lucide-react";

interface ToolCardProps {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  output?: string;
  error?: string;
}

// Get tool icon component based on name
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("read")) return FileText;
  if (name.includes("bash")) return Terminal;
  if (name.includes("grep") || name.includes("search") || name.includes("glob"))
    return Search;
  if (name.includes("edit")) return FileEdit;
  if (name.includes("write")) return FilePlus;
  if (name.includes("task")) return Cpu;
  if (name.includes("web")) return Globe;
  return Terminal;
}

export function ToolCard({
  name,
  args,
  status,
  output,
  error,
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const ToolIcon = getToolIcon(name);

  // Format args for display
  const formatArgs = (args: Record<string, unknown>): string => {
    const entries = Object.entries(args);
    if (entries.length === 0) return "";

    // Show first arg as preview
    const [key, value] = entries[0];
    const valueStr = typeof value === "string" ? value : JSON.stringify(value);
    const preview = valueStr.length > 60 ? valueStr.slice(0, 60) + "..." : valueStr;
    return `${key}: ${preview}`;
  };

  // Get status icon
  const StatusIcon = () => {
    if (status === "running") {
      return <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" />;
    }
    if (status === "completed") {
      return <Check className="w-4 h-4 text-green-400" />;
    }
    return <X className="w-4 h-4 text-red-400" />;
  };

  return (
    <div
      className={`
        my-2 rounded-xl border border-[var(--glass-border-subtle)]
        bg-[var(--glass-frosted)] backdrop-blur-md
        overflow-hidden transition-all duration-200
        ${status === "running" ? "tool-card-running" : ""}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--glass-light)] transition-colors"
      >
        {/* Tool icon */}
        <div className="w-8 h-8 rounded-lg bg-[var(--glass-medium)] flex items-center justify-center">
          <ToolIcon className="w-4 h-4 text-[var(--accent-cyan)]" />
        </div>

        {/* Tool name and preview */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {name}
            </span>
            <StatusIcon />
          </div>
          <div className="text-xs text-[var(--text-tertiary)] truncate">
            {formatArgs(args)}
          </div>
        </div>

        {/* Expand/collapse */}
        <div className="text-[var(--text-quaternary)]">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-[var(--glass-border-subtle)]">
          {/* Arguments */}
          <div className="mt-3">
            <div className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
              Arguments
            </div>
            <pre className="text-xs text-[var(--text-secondary)] bg-[var(--glass-dark)] rounded-lg p-3 overflow-x-auto max-h-40">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Output/Error */}
          {(output || error) && (
            <div className="mt-3">
              <div className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
                {error ? "Error" : "Output"}
              </div>
              <pre
                className={`
                  text-xs rounded-lg p-3 overflow-x-auto max-h-40
                  ${error
                    ? "bg-red-500/10 text-red-300"
                    : "bg-[var(--glass-dark)] text-[var(--text-secondary)]"
                  }
                `}
              >
                {error || output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
