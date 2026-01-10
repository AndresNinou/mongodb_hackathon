"use client";

import { useState } from "react";
import { Play, Square, Loader2, Terminal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewControlsProps {
  projectId: string;
  status: "starting" | "running" | "stopped" | "error";
  onStatusChange: (status: "starting" | "running" | "stopped" | "error", url?: string) => void;
}

export function PreviewControls({
  projectId,
  status,
  onStatusChange,
}: PreviewControlsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/preview/logs`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const startPreview = async () => {
    setIsActionLoading(true);
    onStatusChange("starting");

    try {
      const res = await fetch(`/api/projects/${projectId}/preview/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        onStatusChange(data.data.status, data.data.url);
        setLogs(data.data.logs || []);
      } else {
        onStatusChange("error");
      }
    } catch (error) {
      console.error("Failed to start preview:", error);
      onStatusChange("error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const stopPreview = async () => {
    setIsActionLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/preview/stop`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        onStatusChange("stopped");
        setLogs(data.data.logs || []);
      }
    } catch (error) {
      console.error("Failed to stop preview:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const isRunning = status === "running" || status === "starting";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={stopPreview}
            disabled={isActionLoading || status === "starting"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Stop
          </button>
        ) : (
          <button
            onClick={startPreview}
            disabled={isActionLoading}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

            <div className="relative flex items-center gap-2">
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Preview
            </div>
          </button>
        )}

        {/* Logs toggle */}
        <button
          onClick={() => {
            setShowLogs(!showLogs);
            if (!showLogs) fetchLogs();
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            showLogs
              ? "bg-[var(--glass-medium)] text-[var(--text-primary)] border border-[var(--glass-border-light)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)]"
          )}
        >
          <Terminal className="w-4 h-4" />
          <span className="hidden sm:inline">Logs</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              showLogs && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Logs panel */}
      {showLogs && (
        <div className="animate-slide-down rounded-xl bg-[var(--glass-dense)] border border-[var(--glass-border-subtle)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--glass-border-subtle)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Server Logs
            </span>
            {logs.length > 0 && (
              <span className="text-xs text-[var(--text-quaternary)]">
                {logs.length} lines
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-liquid p-3">
            {logs.length === 0 ? (
              <p className="text-xs text-[var(--text-quaternary)] text-center py-4">
                No logs available
              </p>
            ) : (
              <pre className="text-xs font-mono space-y-0.5">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "py-0.5 leading-relaxed",
                      log.toLowerCase().includes("error") && "text-red-400",
                      log.toLowerCase().includes("warn") && "text-amber-400",
                      log.toLowerCase().includes("success") && "text-[var(--accent-green)]",
                      !log.toLowerCase().includes("error") &&
                        !log.toLowerCase().includes("warn") &&
                        !log.toLowerCase().includes("success") &&
                        "text-[var(--text-secondary)]"
                    )}
                  >
                    {log}
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
