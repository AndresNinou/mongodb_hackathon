"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteProjectModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteProjectModal({
  isOpen,
  projectName,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
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
            <div className="absolute inset-0 rounded-xl bg-red-500 opacity-30 blur-lg" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <AlertTriangle className="w-5 h-5 text-white relative z-10" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Delete Project
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {projectName}
          </span>
          ? All project files will be permanently removed.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="relative group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

            <div className="relative flex items-center gap-2">
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Project"
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
