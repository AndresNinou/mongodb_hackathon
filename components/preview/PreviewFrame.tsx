"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, AlertCircle, Globe } from "lucide-react";

interface PreviewFrameProps {
  url: string | null;
  status: "starting" | "running" | "stopped" | "error";
}

export function PreviewFrame({ url, status }: PreviewFrameProps) {
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (status === "starting") {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--obsidian)]">
        <div className="text-center animate-fade-in">
          {/* Loading orb */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] opacity-40 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <Loader2 className="w-7 h-7 text-white animate-spin relative z-10" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Starting preview server...
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--obsidian)]">
        <div className="text-center animate-fade-in">
          {/* Error orb */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-red-500 opacity-30 blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              <AlertCircle className="w-7 h-7 text-white relative z-10" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Failed to start preview
          </p>
        </div>
      </div>
    );
  }

  if (!url || status === "stopped") {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--obsidian)]">
        <div className="text-center animate-fade-in">
          {/* Inactive orb */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="relative w-16 h-16 rounded-2xl bg-[var(--glass-medium)] flex items-center justify-center overflow-hidden border border-[var(--glass-border-subtle)]">
              <Globe className="w-7 h-7 text-[var(--text-quaternary)]" />
            </div>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">
            Preview not running
          </p>
          <p className="text-xs text-[var(--text-quaternary)] mt-1">
            Click Start Preview to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--obsidian)]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-frosted)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Running indicator */}
          <div className="glow-orb running" />

          {/* URL pill */}
          <div className="flex-1 min-w-0 px-3 py-1 rounded-full bg-[var(--glass-light)] border border-[var(--glass-border-subtle)]">
            <span className="text-xs text-[var(--text-secondary)] truncate block font-mono">
              {url}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleRefresh}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--glass-frosted)] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* iframe container with subtle border */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-white rounded-b-lg overflow-hidden">
          <iframe
            key={iframeKey}
            src={url}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
}
