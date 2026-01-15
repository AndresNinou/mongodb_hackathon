"use client";

import { useState, useEffect } from "react";
import {
  X,
  GitBranch,
  Database,
  Loader2,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Cloud,
} from "lucide-react";

interface ConfigDefaults {
  githubToken: { hasDefault: boolean; masked: string };
  mongoUrl: { hasDefault: boolean; masked: string; database: string };
  supabase: { hasDefault: boolean; url: string; projectId: string; anonKey: string };
}

interface CreateMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export function CreateMigrationModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateMigrationModalProps) {
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseProjectId, setSupabaseProjectId] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [mongoUrl, setMongoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [defaults, setDefaults] = useState<ConfigDefaults | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // Toggle states for using defaults
  const [useDefaultMongo, setUseDefaultMongo] = useState(true);
  const [useDefaultGithub, setUseDefaultGithub] = useState(true);
  const [useDefaultSupabase, setUseDefaultSupabase] = useState(true);

  // Fetch defaults on mount
  useEffect(() => {
    if (isOpen) {
      fetchDefaults();
    }
  }, [isOpen]);

  const fetchDefaults = async () => {
    setLoadingDefaults(true);
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setDefaults(data.defaults);

        // Pre-fill Supabase fields with defaults
        if (data.defaults.supabase.hasDefault) {
          setSupabaseUrl(data.defaults.supabase.url);
          setSupabaseProjectId(data.defaults.supabase.projectId);
          setSupabaseAnonKey(data.defaults.supabase.anonKey);
        }
      }
    } catch (error) {
      console.error("Failed to load defaults:", error);
    } finally {
      setLoadingDefaults(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoUrl.trim()) return;

    // Validate that either we use defaults or have values
    const hasMongoConfig = useDefaultMongo ? defaults?.mongoUrl.hasDefault : mongoUrl.trim();
    if (!hasMongoConfig) {
      alert("MongoDB connection is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || "main",
        supabaseUrl: useDefaultSupabase ? undefined : supabaseUrl.trim() || undefined,
        supabaseProjectId: useDefaultSupabase ? undefined : supabaseProjectId.trim() || undefined,
        supabaseAnonKey: useDefaultSupabase ? undefined : supabaseAnonKey.trim() || undefined,
        mongoUrl: useDefaultMongo ? undefined : mongoUrl.trim() || undefined,
        githubToken: useDefaultGithub ? undefined : githubToken.trim() || undefined,
        useDefaultMongo,
        useDefaultGithub,
        useDefaultSupabase,
      });
      // Reset form
      setName("");
      setRepoUrl("");
      setBranch("main");
      setSupabaseUrl(defaults?.supabase.url || "");
      setSupabaseProjectId(defaults?.supabase.projectId || "");
      setSupabaseAnonKey(defaults?.supabase.anonKey || "");
      setMongoUrl("");
      setGithubToken("");
      setUseDefaultMongo(true);
      setUseDefaultGithub(true);
      setUseDefaultSupabase(true);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const DefaultBadge = ({ enabled, label }: { enabled: boolean; label: string }) => (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${enabled
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
        }
      `}
    >
      {enabled && <Check className="w-3 h-3" />}
      {label}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="modal-container relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              New Migration
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Supabase → MongoDB
            </p>
          </div>
        </div>

        {loadingDefaults ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-cyan)]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Migration Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App Migration"
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                autoFocus
                required
              />
            </div>

            {/* GitHub Repo URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
                <GitBranch className="w-4 h-4" />
                GitHub Repository
              </label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                required
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Branch <span className="text-[var(--text-quaternary)]">(optional)</span>
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              />
            </div>

            {/* Default Configurations Info */}
            <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-dark)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[var(--accent-cyan)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Default Configurations
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
                >
                  {showAdvanced ? "Hide" : "Edit"}
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <div className="space-y-2">
                {/* MongoDB Default */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">MongoDB</span>
                  <div className="flex items-center gap-2">
                    {defaults?.mongoUrl.hasDefault ? (
                      <>
                        <code className="text-xs text-[var(--text-quaternary)] bg-[var(--glass-medium)] px-2 py-0.5 rounded">
                          {defaults.mongoUrl.masked.slice(0, 40)}...
                        </code>
                        <DefaultBadge enabled={useDefaultMongo} label="Default" />
                      </>
                    ) : (
                      <span className="text-[var(--text-quaternary)]">Not configured</span>
                    )}
                  </div>
                </div>

                {/* Supabase Default */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">Supabase</span>
                  <div className="flex items-center gap-2">
                    {defaults?.supabase.hasDefault ? (
                      <>
                        <code className="text-xs text-[var(--text-quaternary)] bg-[var(--glass-medium)] px-2 py-0.5 rounded">
                          {defaults.supabase.projectId}
                        </code>
                        <DefaultBadge enabled={useDefaultSupabase} label="Default" />
                      </>
                    ) : (
                      <span className="text-[var(--text-quaternary)]">Not configured</span>
                    )}
                  </div>
                </div>

                {/* GitHub Default */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">GitHub Token</span>
                  <div className="flex items-center gap-2">
                    {defaults?.githubToken.hasDefault ? (
                      <>
                        <code className="text-xs text-[var(--text-quaternary)] bg-[var(--glass-medium)] px-2 py-0.5 rounded">
                          {defaults.githubToken.masked}
                        </code>
                        <DefaultBadge enabled={useDefaultGithub} label="Default" />
                      </>
                    ) : (
                      <span className="text-[var(--text-quaternary)]">Not configured</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Settings (Collapsible) */}
            {showAdvanced && (
              <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                {/* MongoDB Override */}
                <div className="rounded-xl border border-[var(--glass-border-subtle)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                      <Database className="w-4 h-4 text-green-400" />
                      MongoDB Connection
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDefaultMongo}
                        onChange={(e) => setUseDefaultMongo(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]"
                      />
                      <span className="text-xs text-[var(--text-tertiary)]">Use default</span>
                    </label>
                  </div>
                  {!useDefaultMongo && (
                    <input
                      type="text"
                      value={mongoUrl}
                      onChange={(e) => setMongoUrl(e.target.value)}
                      placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-mono text-sm"
                    />
                  )}
                </div>

                {/* Supabase Override */}
                <div className="rounded-xl border border-[var(--glass-border-subtle)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      Supabase Configuration
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDefaultSupabase}
                        onChange={(e) => setUseDefaultSupabase(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]"
                      />
                      <span className="text-xs text-[var(--text-tertiary)]">Use default</span>
                    </label>
                  </div>
                  {!useDefaultSupabase && (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xxxxx.supabase.co"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-mono text-sm"
                      />
                      <input
                        type="text"
                        value={supabaseProjectId}
                        onChange={(e) => setSupabaseProjectId(e.target.value)}
                        placeholder="Project ID"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-mono text-sm"
                      />
                      <input
                        type="password"
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="Anon Key"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-mono text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* GitHub Token Override */}
                <div className="rounded-xl border border-[var(--glass-border-subtle)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      GitHub Token
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDefaultGithub}
                        onChange={(e) => setUseDefaultGithub(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]"
                      />
                      <span className="text-xs text-[var(--text-tertiary)]">Use default</span>
                    </label>
                  </div>
                  {!useDefaultGithub && (
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-mono text-sm"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !repoUrl.trim() || isSubmitting}
                className="relative group flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Migration
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
