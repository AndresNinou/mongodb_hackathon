"use client";

import {
  Database,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode,
  Table,
  ArrowRight,
} from "lucide-react";
import type { MigrationResponse, MigrationStatus } from "@/types";

interface MigrationInfoPanelProps {
  migration: MigrationResponse;
  currentStatus?: MigrationStatus;
  currentAgent?: 1 | 2 | null;
}

// Status configurations
const STATUS_CONFIG: Record<
  MigrationStatus,
  { label: string; color: string; icon: typeof Loader2 }
> = {
  pending: { label: "Pending", color: "text-yellow-400", icon: Clock },
  cloning: { label: "Cloning", color: "text-blue-400", icon: Loader2 },
  planning: { label: "Planning", color: "text-[var(--accent-cyan)]", icon: Loader2 },
  plan_ready: { label: "Plan Ready", color: "text-green-400", icon: CheckCircle2 },
  executing: { label: "Executing", color: "text-[var(--accent-purple)]", icon: Loader2 },
  completed: { label: "Completed", color: "text-green-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400", icon: XCircle },
};

export function MigrationInfoPanel({
  migration,
  currentStatus,
  currentAgent,
}: MigrationInfoPanelProps) {
  const status = currentStatus || migration.status;
  const agent = currentAgent !== undefined ? currentAgent : migration.currentAgent;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Parse plan if available
  const plan = migration.plan;
  const planTables = plan?.tables as { name: string; collection: string }[] | undefined;
  const planSummary = plan?.summary as string | undefined;
  const rawOutput = plan?.raw_output as string | undefined;

  // Get recent logs (last 5)
  const recentLogs = migration.logs.slice(-5).reverse();

  // Calculate progress
  const getProgress = () => {
    switch (status) {
      case "pending":
        return 0;
      case "cloning":
        return 15;
      case "planning":
        return 35;
      case "plan_ready":
        return 50;
      case "executing":
        return 75;
      case "completed":
        return 100;
      case "failed":
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Status Card */}
      <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
        <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          Status
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${status === "failed" ? "bg-red-500/20" : "bg-[var(--glass-medium)]"}
            `}
          >
            <StatusIcon
              className={`w-5 h-5 ${statusConfig.color} ${
                ["cloning", "planning", "executing"].includes(status)
                  ? "animate-spin"
                  : ""
              }`}
            />
          </div>
          <div>
            <div className={`font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </div>
            {agent && (
              <div className="text-xs text-[var(--text-tertiary)]">
                Agent {agent} active
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-[var(--glass-dark)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      {/* Repository Info */}
      <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
        <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          Repository
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-[var(--text-quaternary)]" />
            <span className="text-[var(--text-secondary)] truncate">
              {migration.config.repoUrl.replace("https://github.com/", "")}
            </span>
          </div>
          {migration.config.postgresUrl && (
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-[var(--text-secondary)]">PostgreSQL</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-quaternary)]" />
              <Database className="w-4 h-4 text-green-400" />
              <span className="text-[var(--text-secondary)]">MongoDB</span>
            </div>
          )}
        </div>
      </div>

      {/* Plan Preview */}
      {plan && (
        <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Migration Plan
          </h3>

          {planSummary && (
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {planSummary}
            </p>
          )}

          {planTables && planTables.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-tertiary)]">
                Tables to migrate:
              </div>
              {planTables.slice(0, 5).map((table, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-[var(--glass-dark)] rounded-lg px-3 py-2"
                >
                  <Table className="w-4 h-4 text-blue-400" />
                  <span className="text-[var(--text-secondary)]">
                    {table.name}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-quaternary)]" />
                  <FileCode className="w-4 h-4 text-green-400" />
                  <span className="text-[var(--text-secondary)]">
                    {table.collection}
                  </span>
                </div>
              ))}
              {planTables.length > 5 && (
                <div className="text-xs text-[var(--text-tertiary)] text-center">
                  +{planTables.length - 5} more tables
                </div>
              )}
            </div>
          )}

          {rawOutput && !planTables && (
            <pre className="text-xs text-[var(--text-tertiary)] bg-[var(--glass-dark)] rounded-lg p-3 overflow-x-auto max-h-40">
              {rawOutput.slice(0, 500)}
              {rawOutput.length > 500 && "..."}
            </pre>
          )}
        </div>
      )}

      {/* Result */}
      {migration.result && (
        <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
          <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Result
          </h3>

          <div className="space-y-2 text-sm">
            {migration.result.prUrl && (
              <a
                href={migration.result.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--accent-cyan)] hover:underline"
              >
                <GitBranch className="w-4 h-4" />
                View Pull Request #{migration.result.prNumber}
              </a>
            )}
            {migration.result.filesChanged && (
              <div className="text-[var(--text-secondary)]">
                {migration.result.filesChanged} files changed
              </div>
            )}
            {migration.result.collectionsCreated && (
              <div className="text-[var(--text-secondary)]">
                {migration.result.collectionsCreated} collections created
              </div>
            )}
            {migration.result.rowsMigrated && (
              <div className="text-[var(--text-secondary)]">
                {migration.result.rowsMigrated.toLocaleString()} rows migrated
              </div>
            )}
            {migration.result.summary && (
              <div className="text-[var(--text-tertiary)] text-xs">
                {migration.result.summary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)] p-4">
        <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          Recent Logs
        </h3>

        {recentLogs.length === 0 ? (
          <div className="text-sm text-[var(--text-quaternary)] text-center py-4">
            No logs yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <div
                key={i}
                className="text-xs bg-[var(--glass-dark)] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[var(--text-quaternary)]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.agent && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--glass-medium)] text-[var(--text-tertiary)]">
                      Agent {log.agent}
                    </span>
                  )}
                  <span
                    className={`
                      px-1.5 py-0.5 rounded
                      ${log.level === "error"
                        ? "bg-red-500/20 text-red-400"
                        : log.level === "warn"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-[var(--glass-medium)] text-[var(--text-tertiary)]"
                      }
                    `}
                  >
                    {log.level}
                  </span>
                </div>
                <div className="text-[var(--text-secondary)] truncate">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
