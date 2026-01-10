"use client";

import { Database, GitBranch, Trash2, CheckCircle, XCircle, Loader2, Clock, FileCode } from "lucide-react";
import type { MigrationResponse } from "@/types";

interface MigrationCardProps {
  migration: MigrationResponse;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const statusConfig: Record<
  string,
  {
    color: string;
    bg: string;
    icon: typeof Clock;
    label: string;
    animate?: boolean;
  }
> = {
  pending: {
    color: "text-[var(--text-tertiary)]",
    bg: "bg-[var(--glass-frosted)]",
    icon: Clock,
    label: "Pending",
  },
  cloning: {
    color: "text-[var(--accent-cyan)]",
    bg: "bg-[var(--accent-cyan)]/10",
    icon: Loader2,
    label: "Cloning...",
    animate: true,
  },
  planning: {
    color: "text-[var(--accent-purple)]",
    bg: "bg-[var(--accent-purple)]/10",
    icon: Loader2,
    label: "Planning...",
    animate: true,
  },
  plan_ready: {
    color: "text-[var(--accent-cyan)]",
    bg: "bg-[var(--accent-cyan)]/10",
    icon: FileCode,
    label: "Plan Ready",
  },
  executing: {
    color: "text-[var(--accent-pink)]",
    bg: "bg-[var(--accent-pink)]/10",
    icon: Loader2,
    label: "Executing...",
    animate: true,
  },
  completed: {
    color: "text-[var(--accent-green)]",
    bg: "bg-[var(--accent-green)]/10",
    icon: CheckCircle,
    label: "Completed",
  },
  failed: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: XCircle,
    label: "Failed",
  },
};

export function MigrationCard({ migration, onDelete, onSelect }: MigrationCardProps) {
  const status = statusConfig[migration.status];
  const StatusIcon = status.icon;

  return (
    <div
      onClick={() => onSelect(migration.migrationId)}
      className="project-card group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-30 blur-lg group-hover:opacity-50 transition-opacity" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <Database className="w-5 h-5 text-white relative z-10" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
              {migration.name}
            </h3>
            <p className="text-xs text-[var(--text-quaternary)]">
              {new Date(migration.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(migration.migrationId);
          }}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Repo info */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
        <GitBranch className="w-4 h-4 text-[var(--text-tertiary)]" />
        <span className="truncate">{migration.config.repoUrl.replace("https://github.com/", "")}</span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bg}`}>
          <StatusIcon
            className={`w-4 h-4 ${status.color} ${status.animate ? "animate-spin" : ""}`}
          />
          <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
        </div>

        {migration.currentAgent && (
          <span className="text-xs text-[var(--text-quaternary)]">
            Agent {migration.currentAgent}
          </span>
        )}
      </div>

      {/* Result */}
      {migration.result?.prUrl && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border-subtle)]">
          <a
            href={migration.result.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-[var(--accent-cyan)] hover:underline"
          >
            View Pull Request →
          </a>
        </div>
      )}
    </div>
  );
}
