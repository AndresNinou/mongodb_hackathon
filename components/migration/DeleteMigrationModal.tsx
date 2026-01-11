"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteMigrationModalProps {
  isOpen: boolean;
  migrationName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteMigrationModal({
  isOpen,
  migrationName,
  onClose,
  onConfirm,
}: DeleteMigrationModalProps) {
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
      <div className="modal-container relative w-full max-w-md p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 border-2 border-brutal-black dark:border-brutal-white flex items-center justify-center hover:bg-error hover:text-white hover:border-error transition-all"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-error border-3 border-brutal-black dark:border-brutal-white flex items-center justify-center shadow-brutal-md">
            <AlertTriangle className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Delete
            </h2>
            <p className="text-sm font-bold text-brutal-gray-dark uppercase">
              Cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <p className="text-foreground font-bold mb-6 leading-relaxed">
          Delete{" "}
          <span className="font-black uppercase">
            {migrationName}
          </span>
          ? All migration data and files will be permanently removed.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="brutal-btn-ghost disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-6 py-3 font-bold text-base uppercase tracking-wide bg-error text-white border-[var(--border-medium)] border-brutal-black dark:border-brutal-white shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
