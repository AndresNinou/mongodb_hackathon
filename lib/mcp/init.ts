/**
 * MCP Initialization for Mongrate
 *
 * Initializes MCP server configuration on startup:
 * - Logs MCP endpoint URLs
 * - Auto-updates editor configurations in development
 */

import { updateMcpConfigs } from "@/lib/utils/config-updater";

let initialized = false;

/**
 * Initialize MCP server configuration
 */
export async function initializeMcp(): Promise<void> {
  if (initialized) {
    return;
  }

  const host = process.env.HOST || "localhost";
  const port = process.env.PORT || "3000";
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://${host}:${port}`;

  // MCP endpoints
  const mcpStreamUrl = `${baseUrl}/api/__mcp__`;
  const mcpSseUrl = `${baseUrl}/api/__mcp__/sse`;

  console.log(`[mongrate] MCP Server initialized`);
  console.log(`[mongrate]   Streamable HTTP: ${mcpStreamUrl}`);
  console.log(`[mongrate]   SSE (legacy):    ${mcpSseUrl}`);

  // Auto-update editor configs in development
  if (process.env.NODE_ENV === "development") {
    try {
      const updated = await updateMcpConfigs(process.cwd(), mcpSseUrl, "mongrate");
      if (updated.length > 0) {
        console.log(`[mongrate] Updated editor configs: ${updated.join(", ")}`);
      }
    } catch (error) {
      console.error("[mongrate] Failed to update editor configs:", error);
    }
  }

  initialized = true;
}

/**
 * Check if MCP is initialized
 */
export function isMcpInitialized(): boolean {
  return initialized;
}

/**
 * Get MCP endpoint URLs
 */
export function getMcpUrls(): { streamUrl: string; sseUrl: string } {
  const host = process.env.HOST || "localhost";
  const port = process.env.PORT || "3000";
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://${host}:${port}`;

  return {
    streamUrl: `${baseUrl}/api/__mcp__`,
    sseUrl: `${baseUrl}/api/__mcp__/sse`,
  };
}
