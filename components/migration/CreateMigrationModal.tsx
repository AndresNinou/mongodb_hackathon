"use client";

import { useState } from "react";
import { X, GitBranch, Database, Loader2, Sparkles } from "lucide-react";

interface CreateMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    repoUrl: string;
    branch?: string;
    postgresUrl?: string;
    mongoUrl: string;
    githubToken?: string;
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
  const [postgresUrl, setPostgresUrl] = useState("");
  const [mongoUrl, setMongoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoUrl.trim() || !mongoUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || "main",
        postgresUrl: postgresUrl.trim() || undefined,
        mongoUrl: mongoUrl.trim(),
        githubToken: githubToken.trim() || undefined,
      });
      // Reset form
      setName("");
      setRepoUrl("");
      setBranch("main");
      setPostgresUrl("");
      setMongoUrl("");
      setGithubToken("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-50 blur-lg" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <Database className="w-5 h-5 text-white relative z-10" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              New Migration
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              PostgreSQL → MongoDB
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Migration Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App Migration"
              className="input-liquid"
              autoFocus
              required
            />
          </div>

          {/* GitHub Repo URL */}
          <div>
            <label
              htmlFor="repoUrl"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              <GitBranch className="w-4 h-4 inline mr-1" />
              GitHub Repository URL
            </label>
            <input
              type="url"
              id="repoUrl"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="input-liquid"
              required
            />
          </div>

          {/* Branch */}
          <div>
            <label
              htmlFor="branch"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Branch{" "}
              <span className="text-[var(--text-quaternary)]">(optional)</span>
            </label>
            <input
              type="text"
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="input-liquid"
            />
          </div>

          {/* PostgreSQL URL */}
          <div>
            <label
              htmlFor="postgresUrl"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              PostgreSQL Connection{" "}
              <span className="text-[var(--text-quaternary)]">
                (optional, for data migration)
              </span>
            </label>
            <input
              type="text"
              id="postgresUrl"
              value={postgresUrl}
              onChange={(e) => setPostgresUrl(e.target.value)}
              placeholder="postgresql://user:pass@host:5432/db"
              className="input-liquid font-mono text-sm"
            />
          </div>

          {/* MongoDB URL */}
          <div>
            <label
              htmlFor="mongoUrl"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              MongoDB Connection
            </label>
            <input
              type="text"
              id="mongoUrl"
              value={mongoUrl}
              onChange={(e) => setMongoUrl(e.target.value)}
              placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db"
              className="input-liquid font-mono text-sm"
              required
            />
          </div>

          {/* GitHub Token */}
          <div>
            <label
              htmlFor="githubToken"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              GitHub Token{" "}
              <span className="text-[var(--text-quaternary)]">
                (for private repos)
              </span>
            </label>
            <input
              type="password"
              id="githubToken"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="input-liquid font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !repoUrl.trim() || !mongoUrl.trim() || isSubmitting}
              className="relative group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

              <div className="relative flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Migration
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
