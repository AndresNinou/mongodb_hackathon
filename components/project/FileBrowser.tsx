"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  File,
  ChevronRight,
  RefreshCw,
  Loader2,
  FileCode,
  FileJson,
  FileType,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
  name: string;
}

interface FileBrowserProps {
  projectId: string;
  onFileSelect?: (path: string) => void;
  selectedFile?: string;
}

// File icon based on extension
function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
      return <FileCode className="w-4 h-4 text-[var(--accent-cyan)]" />;
    case "json":
      return <FileJson className="w-4 h-4 text-amber-400" />;
    case "css":
    case "scss":
      return <FileType className="w-4 h-4 text-[var(--accent-pink)]" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
      return <Image className="w-4 h-4 text-[var(--accent-green)]" />;
    default:
      return <File className="w-4 h-4 text-[var(--text-tertiary)]" />;
  }
}

export function FileBrowser({
  projectId,
  onFileSelect,
  selectedFile,
}: FileBrowserProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["."]));
  const [dirContents, setDirContents] = useState<Map<string, FileEntry[]>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());

  const fetchDirectory = async (dirPath: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files?path=${encodeURIComponent(dirPath)}`
      );
      const data = await res.json();
      if (data.success) {
        return data.data as FileEntry[];
      }
    } catch (error) {
      console.error("Failed to fetch directory:", error);
    }
    return [];
  };

  const loadRootDirectory = async () => {
    setIsLoading(true);
    const rootEntries = await fetchDirectory(".");
    setEntries(rootEntries);
    setDirContents(new Map([[".", rootEntries]]));
    setIsLoading(false);
  };

  useEffect(() => {
    loadRootDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggleDir = async (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);

    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);

      if (!dirContents.has(dirPath)) {
        setLoadingDirs((prev) => new Set(prev).add(dirPath));
        const contents = await fetchDirectory(dirPath);
        setDirContents((prev) => new Map(prev).set(dirPath, contents));
        setLoadingDirs((prev) => {
          const next = new Set(prev);
          next.delete(dirPath);
          return next;
        });
      }
    }

    setExpandedDirs(newExpanded);
  };

  const renderEntry = (entry: FileEntry, depth: number = 0) => {
    const isExpanded = expandedDirs.has(entry.path);
    const isLoadingDir = loadingDirs.has(entry.path);
    const isSelected = selectedFile === entry.path;
    const children = dirContents.get(entry.path) || [];

    return (
      <div key={entry.path}>
        <button
          onClick={() =>
            entry.type === "dir"
              ? toggleDir(entry.path)
              : onFileSelect?.(entry.path)
          }
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-200",
            "hover:bg-[var(--glass-frosted)]",
            isSelected && "bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {entry.type === "dir" ? (
            <>
              {isLoadingDir ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
              ) : (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
              <Folder
                className={cn(
                  "w-4 h-4 transition-colors",
                  isExpanded
                    ? "text-[var(--accent-purple)]"
                    : "text-[var(--accent-purple)]/70"
                )}
              />
            </>
          ) : (
            <>
              <span className="w-4" />
              {getFileIcon(entry.name)}
            </>
          )}
          <span
            className={cn(
              "truncate transition-colors",
              isSelected
                ? "text-[var(--accent-purple)]"
                : "text-[var(--text-secondary)]"
            )}
          >
            {entry.name}
          </span>
        </button>

        {entry.type === "dir" && isExpanded && children.length > 0 && (
          <div className="animate-fade-in">
            {children.map((child) => renderEntry(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[var(--accent-purple)] opacity-30 blur-lg animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-purple)] relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border-subtle)]">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Files
        </span>
        <button
          onClick={loadRootDirectory}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-liquid p-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--glass-frosted)] flex items-center justify-center mb-3">
              <Folder className="w-6 h-6 text-[var(--text-quaternary)]" />
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">No files yet</p>
          </div>
        ) : (
          entries.map((entry) => renderEntry(entry))
        )}
      </div>
    </div>
  );
}
