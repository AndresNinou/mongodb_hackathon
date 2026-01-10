"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronRight } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  projectName?: string;
}

export function Header({ showBack, projectName }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 px-4 py-3">
      <div className="mx-auto max-w-screen-2xl">
        <nav className="floating-nav px-4 py-2 flex items-center justify-between">
          {/* Left section - Logo & Navigation */}
          <div className="flex items-center gap-3">
            {showBack && (
              <Link
                href="/"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back</span>
              </Link>
            )}

            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Animated Logo Orb */}
              <div className="relative w-9 h-9">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] opacity-60 blur-lg group-hover:opacity-80 transition-opacity duration-300" />
                {/* Main orb */}
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] via-[var(--accent-cyan)] to-[var(--accent-pink)] flex items-center justify-center shadow-lg overflow-hidden">
                  {/* Inner shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                  {/* Logo mark */}
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-white relative z-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272z" />
                  </svg>
                </div>
              </div>

              {/* Brand name */}
              <span className="font-semibold text-lg tracking-tight gradient-text-animated">
                PG2Mongo
              </span>
            </Link>

            {/* Breadcrumb */}
            {projectName && (
              <div className="flex items-center gap-2 ml-2">
                <ChevronRight className="w-4 h-4 text-[var(--text-quaternary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                  {projectName}
                </span>
              </div>
            )}
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-frosted)] transition-all duration-200 group"
              aria-label="Toggle theme"
            >
              {/* Sun icon */}
              <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 absolute" />
              {/* Moon icon */}
              <Moon className="h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 absolute" />
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[var(--glow-purple)] to-transparent blur-sm -z-10" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
