/**
 * Editor MCP Config Updater
 *
 * Auto-updates MCP configuration files for various editors:
 * - Cursor (.cursor/mcp.json)
 * - VS Code (.vscode/mcp.json)
 * - Claude Code (.mcp.json)
 */

import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export type EditorId = "cursor" | "vscode" | "claude-code";

interface EditorConfig {
  name: string;
  path: string;
  file: string;
  urlKey: string;
  format: "servers" | "mcpServers";
  clientId: string;
}

const EDITORS: Record<EditorId, EditorConfig> = {
  cursor: {
    name: "Cursor",
    path: ".cursor",
    file: "mcp.json",
    urlKey: "url",
    format: "mcpServers",
    clientId: "cursor",
  },
  vscode: {
    name: "VS Code",
    path: ".vscode",
    file: "mcp.json",
    urlKey: "url",
    format: "servers",
    clientId: "vscode",
  },
  "claude-code": {
    name: "Claude Code",
    path: ".",
    file: ".mcp.json",
    urlKey: "url",
    format: "mcpServers",
    clientId: "claude-code",
  },
};

/**
 * Build URL with clientId query parameter
 */
function buildMcpUrl(baseUrl: string, clientId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("clientId", clientId);
  return url.toString();
}

/**
 * Update MCP configuration files for all supported editors
 */
export async function updateMcpConfigs(
  root: string,
  mcpBaseUrl: string,
  serverName: string = "mongrate"
): Promise<string[]> {
  const updated: string[] = [];

  for (const [_id, editor] of Object.entries(EDITORS)) {
    const configDir = join(root, editor.path);
    const configPath = join(configDir, editor.file);
    const mcpUrl = buildMcpUrl(mcpBaseUrl, editor.clientId);

    try {
      // Create directory if it doesn't exist
      if (editor.path !== ".") {
        await mkdir(configDir, { recursive: true });
      }

      // Read existing config or create new one
      let config: Record<string, unknown> = {};
      if (existsSync(configPath)) {
        try {
          const content = await readFile(configPath, "utf-8");
          config = JSON.parse(content);
        } catch {
          // If parse fails, start fresh
          config = {};
        }
      }

      // Get the servers key based on format
      const key = editor.format === "servers" ? "servers" : "mcpServers";
      const servers = (config[key] as Record<string, unknown>) || {};

      // Check if already configured with same URL
      const existingServer = servers[serverName] as Record<string, unknown> | undefined;
      const existingUrl = existingServer?.[editor.urlKey];
      if (existingUrl === mcpUrl) {
        continue; // Already configured correctly
      }

      // Update the server configuration
      if (editor.format === "servers") {
        servers[serverName] = {
          type: "sse",
          url: mcpUrl,
        };
      } else {
        servers[serverName] = {
          [editor.urlKey]: mcpUrl,
        };
      }

      config[key] = servers;

      // Write updated config
      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      updated.push(`${editor.name}: ${configPath}`);
      console.log(`[mongrate] Updated MCP config: ${configPath}`);
    } catch (error) {
      console.error(`[mongrate] Failed to update ${configPath}:`, error);
    }
  }

  return updated;
}

/**
 * Remove MCP configuration for a specific server from all editors
 */
export async function removeMcpConfigs(
  root: string,
  serverName: string = "mongrate"
): Promise<string[]> {
  const removed: string[] = [];

  for (const [_id, editor] of Object.entries(EDITORS)) {
    const configPath = join(root, editor.path, editor.file);

    try {
      if (!existsSync(configPath)) {
        continue;
      }

      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content) as Record<string, unknown>;

      const key = editor.format === "servers" ? "servers" : "mcpServers";
      const servers = config[key] as Record<string, unknown>;

      if (servers && serverName in servers) {
        delete servers[serverName];
        config[key] = servers;

        await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
        removed.push(`${editor.name}: ${configPath}`);
        console.log(`[mongrate] Removed from MCP config: ${configPath}`);
      }
    } catch (error) {
      console.error(`[mongrate] Failed to update ${configPath}:`, error);
    }
  }

  return removed;
}
