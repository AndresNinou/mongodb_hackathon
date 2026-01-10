"use client";

import { useState, useEffect } from "react";
import { Plus, Database, Zap, GitBranch, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  MigrationCard,
  CreateMigrationModal,
  DeleteMigrationModal,
  MigrationDetail,
} from "@/components/migration";
import type { MigrationResponse } from "@/types";

export default function HomePage() {
  const [migrations, setMigrations] = useState<MigrationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MigrationResponse | null>(null);
  const [selectedMigration, setSelectedMigration] = useState<MigrationResponse | null>(null);

  const fetchMigrations = async () => {
    try {
      const res = await fetch("/api/migrations");
      const data = await res.json();
      if (data.success) {
        setMigrations(data.data);
        // Update selected migration if it's open
        if (selectedMigration) {
          const updated = data.data.find(
            (m: MigrationResponse) => m.migrationId === selectedMigration.migrationId
          );
          if (updated) setSelectedMigration(updated);
        }
      }
    } catch (error) {
      console.error("Failed to fetch migrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMigrations();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchMigrations, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateMigration = async (data: {
    name: string;
    repoUrl: string;
    branch?: string;
    postgresUrl?: string;
    mongoUrl: string;
    githubToken?: string;
  }) => {
    const res = await fetch("/api/migrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        config: {
          repoUrl: data.repoUrl,
          branch: data.branch,
          postgresUrl: data.postgresUrl,
          mongoUrl: data.mongoUrl,
          githubToken: data.githubToken,
        },
      }),
    });
    const result = await res.json();
    if (result.success) {
      await fetchMigrations();

      // Auto-start the planning phase and open detail view
      const migration = result.data;
      if (migration) {
        // Start planning in the background
        fetch(`/api/migrations/${migration.migrationId}/plan`, {
          method: "POST",
        }).catch(console.error);

        // Open the detail modal to show progress
        setSelectedMigration(migration);
      }
    }
  };

  const handleDeleteMigration = async () => {
    if (!deleteTarget) return;

    const res = await fetch(`/api/migrations/${deleteTarget.migrationId}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (result.success) {
      setMigrations((prev) =>
        prev.filter((m) => m.migrationId !== deleteTarget.migrationId)
      );
      if (selectedMigration?.migrationId === deleteTarget.migrationId) {
        setSelectedMigration(null);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          {/* Hero orb */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            {/* Glow layers */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-40 blur-3xl animate-float" />
            <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-60 blur-xl" />
            {/* Main orb */}
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] flex items-center justify-center overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
              <Database className="w-12 h-12 text-white relative z-10" />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text-animated">PG → MongoDB</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            AI-powered database migration from PostgreSQL to MongoDB.
            <br />
            Clone your repo, analyze the code, transform everything.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-sm text-[var(--text-secondary)]">
              <Zap className="w-4 h-4 text-[var(--accent-cyan)]" />
              AI Agents
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-sm text-[var(--text-secondary)]">
              <GitBranch className="w-4 h-4 text-[var(--accent-purple)]" />
              Auto PR Creation
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-sm text-[var(--text-secondary)]">
              <ArrowRight className="w-4 h-4 text-[var(--accent-pink)]" />
              Code + Data
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="relative group flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-medium text-white overflow-hidden transition-all"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-0 group-hover:opacity-50 blur-xl transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

            <div className="relative flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Migration
            </div>
          </button>
        </div>

        {/* Migrations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="project-card h-48 animate-pulse"
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--glass-light)]" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-[var(--glass-light)] rounded" />
                      <div className="h-3 w-16 bg-[var(--glass-light)] rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-[var(--glass-light)] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : migrations.length === 0 ? (
          <div className="liquid-glass text-center py-20 max-w-lg mx-auto">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-[var(--accent-purple)] opacity-20 blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-[var(--glass-medium)] flex items-center justify-center border border-[var(--glass-border-subtle)]">
                <Database className="w-9 h-9 text-[var(--text-quaternary)]" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No migrations yet
            </h3>
            <p className="text-[var(--text-secondary)] mb-8">
              Create your first migration to get started
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="relative group inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white overflow-hidden transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <div className="relative flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Migration
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {migrations.map((migration) => (
              <MigrationCard
                key={migration.migrationId}
                migration={migration}
                onDelete={(id) => {
                  const target = migrations.find((m) => m.migrationId === id);
                  if (target) setDeleteTarget(target);
                }}
                onSelect={(id) => {
                  const target = migrations.find((m) => m.migrationId === id);
                  if (target) setSelectedMigration(target);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--glass-border-subtle)] py-6 bg-[var(--glass-frosted)]">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            Powered by{" "}
            <span className="text-[var(--accent-purple)]">Claude Code</span>
            {" "}&middot;{" "}
            <span className="text-[var(--accent-cyan)]">MongoDB MCP</span>
          </p>
        </div>
      </footer>

      {/* Modals */}
      <CreateMigrationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateMigration}
      />

      <DeleteMigrationModal
        isOpen={!!deleteTarget}
        migrationName={deleteTarget?.name || ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteMigration}
      />

      {selectedMigration && (
        <MigrationDetail
          migration={selectedMigration}
          onClose={() => setSelectedMigration(null)}
          onRefresh={fetchMigrations}
        />
      )}
    </div>
  );
}
