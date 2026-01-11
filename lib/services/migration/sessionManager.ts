import { createACPProvider, type ACPProvider } from "@mcpc-tech/acp-ai-provider";
import type { ACPProviderSettings } from "@mcpc-tech/acp-ai-provider";

interface SessionEntry {
  provider: ACPProvider;
  sessionId: string;
  createdAt: number;
}

/**
 * Session Manager - Manages ACP provider instances per migration
 *
 * Follows the official ACP multi-session management pattern:
 * 1. Create provider with persistSession: true
 * 2. Call initSession() to establish the session
 * 3. Store provider keyed by migrationId
 * 4. Use provider for subsequent streamText calls
 */
class SessionManager {
  private sessions = new Map<string, SessionEntry>();

  /**
   * Get an existing session for a migration
   */
  get(migrationId: string): SessionEntry | null {
    return this.sessions.get(migrationId) || null;
  }

  /**
   * Create a new session for a migration
   * This initializes the ACP connection and returns the session ID
   */
  async createSession(
    migrationId: string,
    config: ACPProviderSettings
  ): Promise<{ provider: ACPProvider; sessionId: string }> {
    // Clean up any existing session first
    if (this.sessions.has(migrationId)) {
      this.cleanup(migrationId);
    }

    console.log("[SessionManager] Creating new session for:", migrationId);

    // Create provider with session persistence enabled
    const provider = createACPProvider({
      ...config,
      persistSession: true,
    });

    // Initialize the session - this is critical!
    console.log("[SessionManager] Calling initSession()...");
    const session = await provider.initSession();
    const sessionId = session.sessionId;
    console.log("[SessionManager] Session initialized:", sessionId);

    // Store the session
    this.sessions.set(migrationId, {
      provider,
      sessionId,
      createdAt: Date.now(),
    });

    return { provider, sessionId };
  }

  /**
   * Get or create a session for a migration
   * Returns existing session if available, otherwise creates new one
   */
  async getOrCreate(
    migrationId: string,
    config: ACPProviderSettings
  ): Promise<{ provider: ACPProvider; sessionId: string; isNew: boolean }> {
    const existing = this.sessions.get(migrationId);
    if (existing) {
      console.log("[SessionManager] Using existing session:", existing.sessionId);
      return {
        provider: existing.provider,
        sessionId: existing.sessionId,
        isNew: false,
      };
    }

    const { provider, sessionId } = await this.createSession(migrationId, config);
    return { provider, sessionId, isNew: true };
  }

  /**
   * Get the stored session ID for a migration
   */
  getSessionId(migrationId: string): string | null {
    const session = this.sessions.get(migrationId);
    return session?.sessionId || null;
  }

  /**
   * Check if a migration has an active session
   */
  hasActiveSession(migrationId: string): boolean {
    return this.sessions.has(migrationId);
  }

  /**
   * Cleanup a migration's session
   */
  cleanup(migrationId: string): void {
    const session = this.sessions.get(migrationId);
    if (session) {
      try {
        console.log("[SessionManager] Cleaning up session:", session.sessionId);
        session.provider.cleanup();
      } catch (error) {
        console.error("[SessionManager] Cleanup error:", error);
      }
    }
    this.sessions.delete(migrationId);
  }

  /**
   * Cleanup all sessions
   */
  cleanupAll(): void {
    for (const [migrationId] of this.sessions) {
      this.cleanup(migrationId);
    }
  }

  /**
   * Get the number of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
