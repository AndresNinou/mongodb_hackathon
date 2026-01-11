/**
 * Next.js Instrumentation Hook
 *
 * This file is called during Next.js server startup.
 * Used to initialize MCP server configuration.
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initializeMcp } = await import("@/lib/mcp/init");
      await initializeMcp();
    } catch (error) {
      console.error("[mongrate] Failed to initialize MCP:", error);
    }
  }
}
