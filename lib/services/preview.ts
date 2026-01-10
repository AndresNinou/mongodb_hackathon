/**
 * PreviewManager - Handles per-project development servers (live preview)
 * Simplified version for PG2Mongo
 */

import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import { findAvailablePort } from "@/lib/utils/ports";
import { updateProject } from "@/lib/db/projects";
import { scaffoldNextApp } from "./scaffold";
import { PREVIEW_CONFIG, PROJECTS_DIR } from "@/lib/config/constants";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

type PreviewStatus = "starting" | "running" | "stopped" | "error";

interface PreviewProcess {
  process: ChildProcess | null;
  port: number;
  url: string;
  status: PreviewStatus;
  logs: string[];
  startedAt: Date;
}

export interface PreviewInfo {
  port: number | null;
  url: string | null;
  status: PreviewStatus;
  logs: string[];
  pid?: number;
}

const LOG_LIMIT = 200;

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function runNpmInstall(
  projectPath: string,
  env: NodeJS.ProcessEnv,
  logger: (chunk: Buffer | string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger("[PreviewManager] Installing dependencies with npm...");

    const child = spawn(npmCommand, ["install"], {
      cwd: projectPath,
      env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", logger);
    child.stderr?.on("data", logger);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
  });
}

async function waitForPreviewReady(
  url: string,
  log: (chunk: Buffer | string) => void,
  timeoutMs = 30000,
  intervalMs = 1000
): Promise<boolean> {
  const start = Date.now();
  let attempts = 0;

  while (Date.now() - start < timeoutMs) {
    attempts += 1;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status === 404) {
        log(
          Buffer.from(
            `[PreviewManager] Preview server responding after ${attempts} attempt(s).`
          )
        );
        return true;
      }
    } catch {
      if (attempts === 1) {
        log(Buffer.from(`[PreviewManager] Waiting for preview server at ${url}...`));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  log(
    Buffer.from(
      `[PreviewManager] Preview server did not respond within ${timeoutMs}ms.`
    )
  );
  return false;
}

class PreviewManager {
  private processes = new Map<string, PreviewProcess>();
  private installing = new Map<string, Promise<void>>();

  private getLogger(processInfo: PreviewProcess) {
    return (chunk: Buffer | string) => {
      const lines = chunk
        .toString()
        .split(/\r?\n/)
        .filter((line) => line.trim().length);
      lines.forEach((line) => {
        processInfo.logs.push(line);
        if (processInfo.logs.length > LOG_LIMIT) {
          processInfo.logs.shift();
        }
      });
    };
  }

  public async start(projectId: string): Promise<PreviewInfo> {
    // Check for existing process
    const existing = this.processes.get(projectId);
    if (existing && existing.status !== "error") {
      return this.toInfo(existing);
    }

    const projectPath = path.join(process.cwd(), PROJECTS_DIR, projectId);

    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    // Find available port
    const port = await findAvailablePort(
      PREVIEW_CONFIG.PORT_START,
      PREVIEW_CONFIG.PORT_END
    );
    const url = `http://localhost:${port}`;

    const previewProcess: PreviewProcess = {
      process: null,
      port,
      url,
      status: "starting",
      logs: [],
      startedAt: new Date(),
    };

    const log = this.getLogger(previewProcess);

    // Check if package.json exists, scaffold if not
    if (!(await fileExists(path.join(projectPath, "package.json")))) {
      log(Buffer.from(`[PreviewManager] Scaffolding new Next.js project...`));
      await scaffoldNextApp(projectPath, projectId);
    }

    // Check if node_modules exists, install if not
    if (!(await directoryExists(path.join(projectPath, "node_modules")))) {
      // Use lock to prevent concurrent installs
      let installPromise = this.installing.get(projectId);
      if (!installPromise) {
        installPromise = runNpmInstall(projectPath, process.env as NodeJS.ProcessEnv, log);
        this.installing.set(projectId, installPromise);
        try {
          await installPromise;
        } finally {
          this.installing.delete(projectId);
        }
      } else {
        log(Buffer.from("[PreviewManager] Waiting for install in progress..."));
        await installPromise;
      }
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
    };

    // Start dev server
    const child = spawn(npmCommand, ["run", "dev", "--", "--port", String(port)], {
      cwd: projectPath,
      env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    previewProcess.process = child;
    this.processes.set(projectId, previewProcess);

    child.stdout?.on("data", (chunk) => {
      log(chunk);
      if (previewProcess.status === "starting") {
        previewProcess.status = "running";
      }
    });

    child.stderr?.on("data", (chunk) => {
      log(chunk);
    });

    child.on("exit", (code, signal) => {
      previewProcess.status = code === 0 ? "stopped" : "error";
      this.processes.delete(projectId);
      updateProject(projectId, {
        previewUrl: undefined,
        previewPort: undefined,
        status: "idle",
      }).catch(console.error);
      log(
        Buffer.from(
          `Preview process exited (code: ${code ?? "null"}, signal: ${signal ?? "null"})`
        )
      );
    });

    child.on("error", (error) => {
      previewProcess.status = "error";
      log(Buffer.from(`Preview process failed: ${error.message}`));
    });

    // Wait for server to be ready
    await waitForPreviewReady(url, log);

    // Update project with preview info
    await updateProject(projectId, {
      previewUrl: url,
      previewPort: port,
      status: "running",
    });

    return this.toInfo(previewProcess);
  }

  public async stop(projectId: string): Promise<PreviewInfo> {
    const processInfo = this.processes.get(projectId);
    if (!processInfo) {
      return {
        port: null,
        url: null,
        status: "stopped",
        logs: [],
      };
    }

    try {
      processInfo.process?.kill("SIGTERM");
    } catch (error) {
      console.error("[PreviewManager] Failed to stop preview:", error);
    }

    this.processes.delete(projectId);

    await updateProject(projectId, {
      previewUrl: undefined,
      previewPort: undefined,
      status: "idle",
    });

    return {
      port: null,
      url: null,
      status: "stopped",
      logs: processInfo.logs,
    };
  }

  public getStatus(projectId: string): PreviewInfo {
    const processInfo = this.processes.get(projectId);
    if (!processInfo) {
      return {
        port: null,
        url: null,
        status: "stopped",
        logs: [],
      };
    }
    return this.toInfo(processInfo);
  }

  public getLogs(projectId: string): string[] {
    const processInfo = this.processes.get(projectId);
    return processInfo ? [...processInfo.logs] : [];
  }

  private toInfo(processInfo: PreviewProcess): PreviewInfo {
    return {
      port: processInfo.port,
      url: processInfo.url,
      status: processInfo.status,
      logs: [...processInfo.logs],
      pid: processInfo.process?.pid,
    };
  }
}

// Global singleton (survives HMR in development)
const globalPreviewManager = globalThis as unknown as {
  __pg2mongo_preview_manager__?: PreviewManager;
};

export const previewManager: PreviewManager =
  globalPreviewManager.__pg2mongo_preview_manager__ ??
  (globalPreviewManager.__pg2mongo_preview_manager__ = new PreviewManager());
