import { createACPProvider, type ACPProvider } from "@mcpc-tech/acp-ai-provider";
import type { ACPProviderSettings } from "@mcpc-tech/acp-ai-provider";

/**
 * Session Manager - Manages ACP provider instances per migration
 *
 * Enables interactive chat by persisting ACP sessions across multiple
 * streamText calls. Each migration can have one active session.
 */
class SessionManager {
  private providers = new Map<string, ACPProvider>();
  private sessionIds = new Map<string, string>();

  /**
   * Get or create an ACP provider for a migration
   */
  getOrCreate(migrationId: string, config: ACPProviderSettings): ACPProvider {
    // If we have an existing provider, return it
    const existing = this.providers.get(migrationId);
    if (existing) {
      return existing;
    }

    // Create new provider with session persistence enabled
    const provider = createACPProvider({
      ...config,
      persistSession: true,
    });

    this.providers.set(migrationId, provider);
    return provider;
  }

  /**
   * Get existing provider for a migration (returns null if not found)
   */
  get(migrationId: string): ACPProvider | null {
    return this.providers.get(migrationId) || null;
  }

  /**
   * Store the session ID for a migration
   */
  setSessionId(migrationId: string, sessionId: string): void {
    this.sessionIds.set(migrationId, sessionId);
  }

  /**
   * Get the stored session ID for a migration
   */
  getSessionId(migrationId: string): string | null {
    // First check our local cache
    const cached = this.sessionIds.get(migrationId);
    if (cached) return cached;

    // Then check the provider
    const provider = this.providers.get(migrationId);
    if (provider) {
      const id = provider.getSessionId();
      if (id) {
        this.sessionIds.set(migrationId, id);
        return id;
      }
    }

    return null;
  }

  /**
   * Check if a migration has an active session
   */
  hasActiveSession(migrationId: string): boolean {
    return this.providers.has(migrationId);
  }

  /**
   * Cleanup a migration's session
   */
  cleanup(migrationId: string): void {
    const provider = this.providers.get(migrationId);
    if (provider) {
      try {
        provider.cleanup();
      } catch (error) {
        console.error("[SessionManager] Cleanup error:", error);
      }
    }
    this.providers.delete(migrationId);
    this.sessionIds.delete(migrationId);
  }

  /**
   * Cleanup all sessions
   */
  cleanupAll(): void {
    for (const [migrationId] of this.providers) {
      this.cleanup(migrationId);
    }
  }

  /**
   * Get the number of active sessions
   */
  getActiveSessionCount(): number {
    return this.providers.size;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
