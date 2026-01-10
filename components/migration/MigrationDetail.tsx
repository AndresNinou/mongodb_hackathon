"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Database,
  GitBranch,
  FileCode,
  Loader2,
  CheckCircle,
  XCircle,
  Terminal,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import type { MigrationResponse } from "@/types";

interface MigrationDetailProps {
  migration: MigrationResponse;
  onClose: () => void;
  onRefresh: () => void;
}

export function MigrationDetail({
  migration,
  onClose,
  onRefresh,
}: MigrationDetailProps) {
  const [isStartingPlan, setIsStartingPlan] = useState(false);
  const [isStartingExecution, setIsStartingExecution] = useState(false);
  const [logs, setLogs] = useState(migration.logs);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // SSE for real-time updates
  useEffect(() => {
    if (
      migration.status === "cloning" ||
      migration.status === "planning" ||
      migration.status === "executing"
    ) {
      const eventSource = new EventSource(
        `/api/migrations/${migration.migrationId}/stream`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "logs" && data.logs) {
            setLogs((prev) => [...prev, ...data.logs]);
          }
          if (data.type === "done" || data.type === "status") {
            onRefresh();
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => eventSource.close();
    }
  }, [migration.migrationId, migration.status, onRefresh]);

  const startPlanning = async () => {
    setIsStartingPlan(true);
    try {
      const res = await fetch(`/api/migrations/${migration.migrationId}/plan`, {
        method: "POST",
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setIsStartingPlan(false);
    }
  };

  const startExecution = async () => {
    setIsStartingExecution(true);
    try {
      const res = await fetch(`/api/migrations/${migration.migrationId}/execute`, {
        method: "POST",
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setIsStartingExecution(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="modal-container relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-50 blur-lg" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                <Database className="w-5 h-5 text-white relative z-10" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {migration.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                <GitBranch className="w-3.5 h-3.5" />
                <span className="truncate max-w-xs">
                  {migration.config.repoUrl.replace("https://github.com/", "")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <StatusBadge status={migration.status} />

            <div className="flex items-center gap-3">
              {migration.status === "pending" && (
                <button
                  onClick={startPlanning}
                  disabled={isStartingPlan}
                  className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                  <div className="relative flex items-center gap-2">
                    {isStartingPlan ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Start Planning
                  </div>
                </button>
              )}

              {migration.status === "plan_ready" && (
                <button
                  onClick={startExecution}
                  disabled={isStartingExecution}
                  className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                  <div className="relative flex items-center gap-2">
                    {isStartingExecution ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    Execute Migration
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            <Step
              label="Clone"
              active={migration.status === "cloning"}
              done={["planning", "plan_ready", "executing", "completed"].includes(migration.status)}
            />
            <StepConnector done={["planning", "plan_ready", "executing", "completed"].includes(migration.status)} />
            <Step
              label="Plan"
              active={migration.status === "planning"}
              done={["plan_ready", "executing", "completed"].includes(migration.status)}
            />
            <StepConnector done={["executing", "completed"].includes(migration.status)} />
            <Step
              label="Execute"
              active={migration.status === "executing"}
              done={migration.status === "completed"}
            />
            <StepConnector done={migration.status === "completed"} />
            <Step
              label="Done"
              active={false}
              done={migration.status === "completed"}
            />
          </div>

          {/* Plan Preview */}
          {migration.plan && (
            <div className="liquid-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileCode className="w-4 h-4 text-[var(--accent-cyan)]" />
                <h3 className="font-medium text-[var(--text-primary)]">
                  Migration Plan
                </h3>
              </div>
              <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--glass-dense)] rounded-lg p-3 overflow-x-auto max-h-60">
                {JSON.stringify(migration.plan, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {migration.result && (
            <div className="liquid-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-[var(--accent-green)]" />
                <h3 className="font-medium text-[var(--text-primary)]">
                  Result
                </h3>
              </div>
              {migration.result.prUrl && (
                <a
                  href={migration.result.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--accent-cyan)] hover:underline mb-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Pull Request
                </a>
              )}
              {migration.result.summary && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {migration.result.summary}
                </p>
              )}
              <div className="flex gap-4 mt-2 text-sm text-[var(--text-tertiary)]">
                {migration.result.filesChanged && (
                  <span>{migration.result.filesChanged} files changed</span>
                )}
                {migration.result.collectionsCreated && (
                  <span>{migration.result.collectionsCreated} collections</span>
                )}
                {migration.result.rowsMigrated && (
                  <span>{migration.result.rowsMigrated} rows migrated</span>
                )}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="liquid-glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-[var(--text-tertiary)]" />
              <h3 className="font-medium text-[var(--text-primary)]">Logs</h3>
              <span className="text-xs text-[var(--text-quaternary)]">
                ({logs.length} entries)
              </span>
            </div>
            <div className="bg-[var(--glass-dense)] rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <p className="text-[var(--text-quaternary)]">No logs yet</p>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "warn"
                        ? "text-amber-400"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="text-[var(--text-quaternary)] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {log.agent && (
                      <span className="text-[var(--accent-purple)] shrink-0">
                        [Agent {log.agent}]
                      </span>
                    )}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MigrationResponse["status"] }) {
  const config = {
    pending: { color: "text-[var(--text-tertiary)]", bg: "bg-[var(--glass-frosted)]", label: "Pending" },
    cloning: { color: "text-[var(--accent-cyan)]", bg: "bg-[var(--accent-cyan)]/10", label: "Cloning..." },
    planning: { color: "text-[var(--accent-purple)]", bg: "bg-[var(--accent-purple)]/10", label: "Planning..." },
    plan_ready: { color: "text-[var(--accent-cyan)]", bg: "bg-[var(--accent-cyan)]/10", label: "Plan Ready" },
    executing: { color: "text-[var(--accent-pink)]", bg: "bg-[var(--accent-pink)]/10", label: "Executing..." },
    completed: { color: "text-[var(--accent-green)]", bg: "bg-[var(--accent-green)]/10", label: "Completed" },
    failed: { color: "text-red-400", bg: "bg-red-500/10", label: "Failed" },
  };

  const c = config[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg}`}>
      {(status === "cloning" || status === "planning" || status === "executing") && (
        <Loader2 className={`w-4 h-4 ${c.color} animate-spin`} />
      )}
      {status === "completed" && <CheckCircle className={`w-4 h-4 ${c.color}`} />}
      {status === "failed" && <XCircle className={`w-4 h-4 ${c.color}`} />}
      <span className={`text-sm font-medium ${c.color}`}>{c.label}</span>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
          done
            ? "bg-[var(--accent-green)] text-white"
            : active
            ? "bg-[var(--accent-purple)] text-white animate-pulse"
            : "bg-[var(--glass-frosted)] text-[var(--text-tertiary)]"
        }`}
      >
        {done ? <CheckCircle className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      </div>
      <span className={`text-xs ${done || active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <div
      className={`w-12 h-0.5 ${
        done ? "bg-[var(--accent-green)]" : "bg-[var(--glass-light)]"
      }`}
    />
  );
}
