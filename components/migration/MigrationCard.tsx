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
    color: "text-brutal-gray-dark",
    bg: "bg-brutal-gray-light dark:bg-brutal-gray",
    icon: Clock,
    label: "Pending",
  },
  cloning: {
    color: "text-black",
    bg: "bg-mongodb-green",
    icon: Loader2,
    label: "Cloning",
    animate: true,
  },
  planning: {
    color: "text-black",
    bg: "bg-warning",
    icon: Loader2,
    label: "Planning",
    animate: true,
  },
  plan_ready: {
    color: "text-black",
    bg: "bg-mongodb-green",
    icon: FileCode,
    label: "Plan Ready",
  },
  executing: {
    color: "text-black",
    bg: "bg-warning",
    icon: Loader2,
    label: "Executing",
    animate: true,
  },
  completed: {
    color: "text-black",
    bg: "bg-success",
    icon: CheckCircle,
    label: "Completed",
  },
  failed: {
    color: "text-white",
    bg: "bg-error",
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
      className="project-card group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="relative w-12 h-12 bg-mongodb-green border-3 border-brutal-black dark:border-brutal-white flex items-center justify-center transition-all group-hover:shadow-brutal-sm">
            <Database className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-tight">
              {migration.name}
            </h3>
            <p className="text-xs text-brutal-gray-dark font-bold uppercase tracking-wide">
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
          className="opacity-0 group-hover:opacity-100 w-9 h-9 border-2 border-brutal-black dark:border-brutal-white flex items-center justify-center text-foreground hover:bg-error hover:text-white hover:border-error transition-all"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Repo info */}
      <div className="flex items-center gap-2 text-sm font-bold mb-4 text-brutal-gray-dark">
        <GitBranch className="w-4 h-4" strokeWidth={2.5} />
        <span className="truncate uppercase tracking-wide text-xs">
          {migration.config.repoUrl.replace("https://github.com/", "")}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-2 border-2 border-brutal-black dark:border-brutal-white ${status.bg} shadow-brutal-sm`}>
          <StatusIcon
            className={`w-4 h-4 ${status.color} ${status.animate ? "animate-spin" : ""}`}
            strokeWidth={2.5}
          />
          <span className={`text-xs font-black uppercase tracking-wide ${status.color}`}>
            {status.label}
          </span>
        </div>

        {migration.currentAgent && (
          <span className="text-xs font-bold uppercase text-brutal-gray-dark">
            Agent {migration.currentAgent}
          </span>
        )}
      </div>

      {/* Result */}
      {migration.result?.prUrl && (
        <div className="mt-4 pt-4 border-t-2 border-brutal-black dark:border-brutal-white">
          <a
            href={migration.result.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-mongodb-green-dark hover:text-mongodb-green underline decoration-2 underline-offset-2 uppercase tracking-wide"
          >
            View PR →
          </a>
        </div>
      )}
    </div>
  );
}
