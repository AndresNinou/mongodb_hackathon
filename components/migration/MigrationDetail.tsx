"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Database,
  GitBranch,
  Loader2,
  ArrowRight,
  MessageSquare,
  FileText,
} from "lucide-react";
import { AgentChatPanel } from "./AgentChatPanel";
import { MigrationInfoPanel } from "./MigrationInfoPanel";
import { PlanViewer } from "./PlanViewer";
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
  const [activeTab, setActiveTab] = useState<"chat" | "plan">("chat");
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const hasAutoSwitchedToPlanRef = useRef(migration.status === "plan_ready" || migration.status === "completed");

  // Use migration prop directly for status (it gets updated from parent)
  const currentStatus = migration.status;
  const currentAgent = migration.currentAgent;

  // Subscribe to SSE stream to detect status changes and refresh
  useEffect(() => {
    const eventSource = new EventSource(`/api/migrations/${migration.migrationId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // When status changes to plan_ready or completed, refresh data
        if (message.type === "status" && (message.status === "plan_ready" || message.status === "completed")) {
          onRefresh();
          // Only auto-switch to plan tab ONCE
          if (message.status === "plan_ready" && !hasAutoSwitchedToPlanRef.current) {
            hasAutoSwitchedToPlanRef.current = true;
            setActiveTab("plan");
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => eventSource.close();
  }, [migration.migrationId, onRefresh]);

  // Check if we have a plan
  const hasPlan = Boolean(migration.plan);

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

      {/* Modal - Full height split view */}
      <div className="modal-container relative w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border-subtle)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-50 blur-lg" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                <Database className="w-5 h-5 text-white relative z-10" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {migration.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <GitBranch className="w-3 h-3" />
                <span className="truncate max-w-xs">
                  {migration.config.repoUrl.replace("https://github.com/", "")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            {currentStatus === "pending" && (
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

            {currentStatus === "plan_ready" && (
              <button
                onClick={startExecution}
                disabled={isStartingExecution}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
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

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Tabs (60%) */}
          <div className="w-3/5 flex flex-col border-r border-[var(--glass-border-subtle)]">
            {/* Tab Header */}
            <div className="flex border-b border-[var(--glass-border-subtle)] bg-[var(--glass-dark)]">
              <button
                onClick={() => setActiveTab("chat")}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative
                  ${activeTab === "chat"
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                <MessageSquare className="w-4 h-4" />
                Agent Chat
                {activeTab === "chat" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("plan")}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative
                  ${activeTab === "plan"
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                <FileText className="w-4 h-4" />
                Migration Plan
                {hasPlan && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                {activeTab === "plan" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" ? (
                <AgentChatPanel migrationId={migration.migrationId} />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  <PlanViewer
                    plan={migration.plan ?? null}
                    isExpanded={isPlanExpanded}
                    onToggleExpand={() => setIsPlanExpanded(!isPlanExpanded)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Migration Info (40%) */}
          <div className="w-2/5 bg-[var(--glass-dark)]">
            <MigrationInfoPanel
              migration={migration}
              currentStatus={currentStatus}
              currentAgent={currentAgent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
