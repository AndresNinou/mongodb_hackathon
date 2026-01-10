"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Folder, ExternalLink, Trash2, ArrowRight } from "lucide-react";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const statusConfig = {
    idle: {
      class: "bg-[var(--text-quaternary)]",
      glow: "",
      label: "Idle",
    },
    running: {
      class: "bg-[var(--accent-green)]",
      glow: "shadow-[0_0_12px_var(--glow-green)]",
      label: "Running",
    },
    stopped: {
      class: "bg-[var(--text-quaternary)]",
      glow: "",
      label: "Stopped",
    },
    error: {
      class: "bg-red-500",
      glow: "shadow-[0_0_12px_rgba(255,71,87,0.5)]",
      label: "Error",
    },
  };

  const status = statusConfig[project.status];

  return (
    <div className="project-card group animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon with glow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] opacity-40 blur-lg group-hover:opacity-60 transition-opacity" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-pink)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <Folder className="w-5 h-5 text-white relative z-10" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[var(--text-primary)] leading-tight">
              {project.name}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)]">
              {formatDistanceToNow(new Date(project.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${status.class} ${status.glow}`}
            title={status.label}
          />
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border-subtle)]">
        {/* Preview link */}
        <div className="flex items-center gap-3">
          {project.previewUrl && (
            <a
              href={project.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-purple)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview</span>
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(project.projectId);
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-quaternary)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <Link
            href={`/${project.projectId}/chat`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--glass-light)] hover:bg-[var(--glass-medium)] border border-[var(--glass-border-subtle)] hover:border-[var(--glass-border-light)] transition-all group/btn"
          >
            <span>Open</span>
            <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
