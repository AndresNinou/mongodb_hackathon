import fs from "fs/promises";
import path from "path";

export interface FileEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
  name: string;
}

const IGNORED_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "coverage",
  ".pnpm-store",
];

export async function listDirectory(
  basePath: string,
  relativePath: string = "."
): Promise<FileEntry[]> {
  const fullPath = path.join(basePath, relativePath);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const result: FileEntry[] = [];

    for (const entry of entries) {
      // Skip ignored patterns
      if (IGNORED_PATTERNS.includes(entry.name)) continue;
      // Skip hidden files except common config files
      if (entry.name.startsWith(".") && !isImportantDotFile(entry.name)) continue;

      const entryRelativePath = relativePath === "."
        ? entry.name
        : path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        result.push({
          path: entryRelativePath,
          type: "dir",
          name: entry.name,
        });
      } else {
        try {
          const stat = await fs.stat(path.join(fullPath, entry.name));
          result.push({
            path: entryRelativePath,
            type: "file",
            size: stat.size,
            name: entry.name,
          });
        } catch {
          result.push({
            path: entryRelativePath,
            type: "file",
            name: entry.name,
          });
        }
      }
    }

    // Sort: directories first, then alphabetically
    return result.sort((a, b) => {
      if (a.type === "dir" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "dir") return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`[FileBrowser] Failed to list directory: ${fullPath}`, error);
    return [];
  }
}

export async function readFile(basePath: string, filePath: string): Promise<string> {
  const fullPath = path.join(basePath, filePath);
  return fs.readFile(fullPath, "utf-8");
}

export async function writeFile(
  basePath: string,
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(basePath, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
}

export async function fileExists(basePath: string, filePath: string): Promise<boolean> {
  const fullPath = path.join(basePath, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

function isImportantDotFile(name: string): boolean {
  const important = [
    ".env",
    ".env.local",
    ".env.example",
    ".gitignore",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    ".prettierrc",
    ".prettierrc.js",
    ".prettierrc.json",
  ];
  return important.includes(name) || name.startsWith(".env");
}
