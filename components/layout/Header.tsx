"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronRight, Database } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  projectName?: string;
}

export function Header({ showBack, projectName }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="brutal-header px-4 py-4">
      <div className="mx-auto max-w-screen-2xl">
        <nav className="flex items-center justify-between">
          {/* Left section - Logo & Navigation */}
          <div className="flex items-center gap-4">
            {showBack && (
              <Link
                href="/"
                className="flex items-center gap-1 px-3 py-2 font-bold text-sm uppercase border-2 border-brutal-black dark:border-brutal-white hover:bg-mongodb-green hover:text-black transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back</span>
              </Link>
            )}

            <Link href="/" className="flex items-center gap-3 group">
              {/* Logo Icon */}
              <div className="relative w-10 h-10 bg-mongodb-green border-3 border-brutal-black dark:border-brutal-white flex items-center justify-center transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-brutal-sm">
                <Database className="w-6 h-6 text-black" strokeWidth={3} />
              </div>

              {/* Brand name */}
              <span className="font-black text-2xl tracking-tight uppercase">
                Mongrate
              </span>
            </Link>

            {/* Breadcrumb */}
            {projectName && (
              <div className="flex items-center gap-2 ml-2">
                <ChevronRight className="w-5 h-5 text-brutal-gray-dark" />
                <span className="text-sm font-bold uppercase truncate max-w-[200px]">
                  {projectName}
                </span>
              </div>
            )}
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-10 h-10 border-2 border-brutal-black dark:border-brutal-white flex items-center justify-center hover:bg-mongodb-green hover:text-black transition-all"
              aria-label="Toggle theme"
            >
              {/* Sun icon */}
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" strokeWidth={2.5} />
              {/* Moon icon */}
              <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" strokeWidth={2.5} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
