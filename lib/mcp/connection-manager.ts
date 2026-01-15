/**
 * MCP Connection Manager for Mongrate
 *
 * Manages MCP transport connections, tracking sessions and handling cleanup.
 * Based on patterns from dev-inspector-mcp.
 */

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

type Transport = StreamableHTTPServerTransport | SSEServerTransport;

export class ConnectionManager {
  public transports: Record<string, Transport> = {};
  private sessionsByMigration = new Map<string, Set<string>>();

  /**
   * Get a transport by session ID
   */
  getTransport(sessionId: string): Transport | undefined {
    return this.transports[sessionId];
  }

  /**
   * Register a new transport
   */
  registerTransport(
    sessionId: string,
    transport: Transport,
    migrationId?: string
  ): void {
    console.log(`[mongrate] [connection-manager] Registering transport: ${sessionId}`);
    this.transports[sessionId] = transport;
    transport.onclose = () => this.removeTransport(sessionId);

    // Track sessions by migration for targeted notifications
    if (migrationId) {
      if (!this.sessionsByMigration.has(migrationId)) {
        this.sessionsByMigration.set(migrationId, new Set());
      }
      this.sessionsByMigration.get(migrationId)!.add(sessionId);
    }
  }

  /**
   * Remove a transport by session ID
   */
  removeTransport(sessionId: string): void {
    console.log(`[mongrate] [connection-manager] Removing transport: ${sessionId}`);
    delete this.transports[sessionId];

    // Clean up migration tracking
    for (const [, sessionIds] of this.sessionsByMigration) {
      sessionIds.delete(sessionId);
    }
  }

  /**
   * Get all transports for a specific migration
   */
  getTransportsForMigration(migrationId: string): Transport[] {
    const sessionIds = this.sessionsByMigration.get(migrationId);
    if (!sessionIds) return [];
    return Array.from(sessionIds)
      .map((sid) => this.transports[sid])
      .filter(Boolean);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Object.keys(this.transports);
  }

  /**
   * Get the number of active connections
   */
  getActiveConnectionCount(): number {
    return Object.keys(this.transports).length;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    const sessionIds = Object.keys(this.transports);
    if (sessionIds.length === 0) return;

    console.log(
      `[mongrate] [connection-manager] Closing ${sessionIds.length} connections...`
    );

    for (const sessionId of sessionIds) {
      const transport = this.transports[sessionId];
      if (transport) {
        try {
          transport.close?.();
        } catch (error) {
          console.error(
            `[mongrate] [connection-manager] Error closing transport ${sessionId}:`,
            error
          );
        }
      }
    }

    this.transports = {};
    this.sessionsByMigration.clear();
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
