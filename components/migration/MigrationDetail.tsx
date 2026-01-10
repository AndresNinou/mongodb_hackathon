"use client";

import { useState, useCallback } from "react";
import {
  X,
  Play,
  Database,
  GitBranch,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { AgentChatPanel } from "./AgentChatPanel";
import { MigrationInfoPanel } from "./MigrationInfoPanel";
import { ChatInput } from "./ChatInput";
import type { MigrationResponse, MigrationStatus } from "@/types";

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
  const [currentStatus, setCurrentStatus] = useState<MigrationStatus>(migration.status);
  const [currentAgent, setCurrentAgent] = useState<1 | 2 | null>(migration.currentAgent);

  // Handle status changes from stream
  const handleStatusChange = useCallback(
    (status: MigrationStatus, agent: 1 | 2 | null) => {
      setCurrentStatus(status);
      setCurrentAgent(agent);
      // Also trigger a refresh to get updated plan/result
      if (status === "plan_ready" || status === "completed" || status === "failed") {
        onRefresh();
      }
    },
    [onRefresh]
  );

  // Send chat message to agent
  const handleSendMessage = async (message: string) => {
    const res = await fetch(`/api/migrations/${migration.migrationId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send message");
    }
  };

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

  // Check if chat should be enabled
  const isChatEnabled =
    currentStatus === "planning" ||
    currentStatus === "plan_ready" ||
    currentStatus === "executing";

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
          {/* Left Panel - Agent Chat (60%) */}
          <div className="w-3/5 flex flex-col border-r border-[var(--glass-border-subtle)]">
            {/* Chat Messages */}
            <AgentChatPanel
              migrationId={migration.migrationId}
              onStatusChange={handleStatusChange}
            />

            {/* Chat Input */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={!isChatEnabled}
              placeholder={
                isChatEnabled
                  ? "Send a message to the agent..."
                  : "Chat available when agent is active"
              }
            />
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
