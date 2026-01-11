"use client";

import { useState } from "react";
import { X, GitBranch, Database, Loader2, Plus } from "lucide-react";

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
      <div className="modal-container relative w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto scrollbar-brutal">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 border-2 border-brutal-black dark:border-brutal-white flex items-center justify-center hover:bg-error hover:text-white hover:border-error transition-all"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-mongodb-green border-3 border-brutal-black dark:border-brutal-white flex items-center justify-center shadow-brutal-md">
            <Database className="w-7 h-7 text-black" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">
              New Migration
            </h2>
            <p className="text-sm font-bold text-brutal-gray-dark uppercase">
              PostgreSQL → MongoDB
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              Migration Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App Migration"
              className="brutal-input"
              autoFocus
              required
            />
          </div>

          {/* GitHub Repo URL */}
          <div>
            <label
              htmlFor="repoUrl"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              <GitBranch className="w-4 h-4" strokeWidth={2.5} />
              GitHub Repository
            </label>
            <input
              type="url"
              id="repoUrl"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="brutal-input"
              required
            />
          </div>

          {/* Branch */}
          <div>
            <label
              htmlFor="branch"
              className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              Branch{" "}
              <span className="text-brutal-gray-dark text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="brutal-input"
            />
          </div>

          {/* PostgreSQL URL */}
          <div>
            <label
              htmlFor="postgresUrl"
              className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              PostgreSQL{" "}
              <span className="text-brutal-gray-dark text-xs">
                (optional, for data)
              </span>
            </label>
            <input
              type="text"
              id="postgresUrl"
              value={postgresUrl}
              onChange={(e) => setPostgresUrl(e.target.value)}
              placeholder="postgresql://user:pass@host:5432/db"
              className="brutal-input font-mono text-sm"
            />
          </div>

          {/* MongoDB URL */}
          <div>
            <label
              htmlFor="mongoUrl"
              className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              MongoDB Connection
            </label>
            <input
              type="text"
              id="mongoUrl"
              value={mongoUrl}
              onChange={(e) => setMongoUrl(e.target.value)}
              placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db"
              className="brutal-input font-mono text-sm"
              required
            />
          </div>

          {/* GitHub Token */}
          <div>
            <label
              htmlFor="githubToken"
              className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2"
            >
              GitHub Token{" "}
              <span className="text-brutal-gray-dark text-xs">
                (for private repos)
              </span>
            </label>
            <input
              type="password"
              id="githubToken"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="brutal-input font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="brutal-btn-ghost disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !repoUrl.trim() || !mongoUrl.trim() || isSubmitting}
              className="brutal-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  Create
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
