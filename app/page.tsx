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
    supabaseUrl?: string;
    supabaseProjectId?: string;
    supabaseAnonKey?: string;
    mongoUrl?: string;
    githubToken?: string;
    useDefaultMongo?: boolean;
    useDefaultGithub?: boolean;
    useDefaultSupabase?: boolean;
  }) => {
    const res = await fetch("/api/migrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        config: {
          repoUrl: data.repoUrl,
          branch: data.branch,
          // MongoDB - use provided value or signal to use default
          mongoUrl: data.mongoUrl,
          useDefaultMongo: data.useDefaultMongo,
          // Supabase configuration
          supabase: !data.useDefaultSupabase && data.supabaseUrl ? {
            url: data.supabaseUrl,
            projectId: data.supabaseProjectId,
            anonKey: data.supabaseAnonKey,
          } : undefined,
          useDefaultSupabase: data.useDefaultSupabase,
          // GitHub token
          githubToken: data.githubToken,
          useDefaultGithub: data.useDefaultGithub,
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

      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          {/* Hero icon */}
          <div className="relative w-24 h-24 mx-auto mb-8 bg-mongodb-green border-4 border-brutal-black dark:border-brutal-white flex items-center justify-center shadow-brutal-lg">
            <Database className="w-12 h-12 text-black" strokeWidth={3} />
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight uppercase">
            Mongrate
          </h1>
          <p className="text-xl font-bold text-brutal-gray-dark max-w-2xl mx-auto leading-relaxed mb-4">
            AI-POWERED DATABASE MIGRATION
          </p>
          <p className="text-lg text-brutal-gray-dark max-w-xl mx-auto leading-relaxed">
            PostgreSQL → MongoDB
            <br />
            Clone • Analyze • Transform
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <div className="flex items-center gap-2 px-5 py-3 border-3 border-brutal-black dark:border-brutal-white bg-card font-bold text-sm uppercase shadow-brutal-sm">
              <Zap className="w-5 h-5" strokeWidth={2.5} />
              AI Agents
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-3 border-brutal-black dark:border-brutal-white bg-card font-bold text-sm uppercase shadow-brutal-sm">
              <GitBranch className="w-5 h-5" strokeWidth={2.5} />
              Auto PR
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-3 border-brutal-black dark:border-brutal-white bg-card font-bold text-sm uppercase shadow-brutal-sm">
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              Code + Data
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="flex justify-center mb-16">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="brutal-btn-primary flex items-center gap-3 text-lg"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
            New Migration
          </button>
        </div>

        {/* Migrations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="brutal-card h-48 animate-pulse-slow"
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brutal-gray-light border-2 border-brutal-black dark:border-brutal-white" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-brutal-gray-light border-2 border-brutal-black dark:border-brutal-white" />
                      <div className="h-3 w-16 bg-brutal-gray-light border-2 border-brutal-black dark:border-brutal-white" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-brutal-gray-light border-2 border-brutal-black dark:border-brutal-white" />
                </div>
              </div>
            ))}
          </div>
        ) : migrations.length === 0 ? (
          <div className="brutal-card text-center py-16 max-w-lg mx-auto">
            <div className="relative w-20 h-20 mx-auto mb-6 bg-brutal-gray-light border-3 border-brutal-black dark:border-brutal-white flex items-center justify-center">
              <Database className="w-10 h-10 text-brutal-gray-dark" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black uppercase mb-3">
              No Migrations Yet
            </h3>
            <p className="text-brutal-gray-dark font-bold mb-8">
              Create your first migration to get started
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="brutal-btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              Create Migration
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
      <footer className="border-t-4 border-brutal-black dark:border-brutal-white py-8 bg-card mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-brutal-gray-dark">
            Powered by{" "}
            <span className="text-foreground">Claude</span>
            {" "}•{" "}
            <span className="text-mongodb-green-dark">MongoDB</span>
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
