"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="modal-backdrop absolute inset-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-container relative w-full max-w-md p-6">
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
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] opacity-50 blur-lg" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <Sparkles className="w-5 h-5 text-white relative z-10" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              New Project
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Create something amazing
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              className="input-liquid"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Description{" "}
              <span className="text-[var(--text-quaternary)]">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project..."
              rows={3}
              className="input-liquid resize-none"
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
              disabled={!name.trim() || isSubmitting}
              className="relative group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-pink)] opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

              <div className="relative flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
