import type { StreamEvent } from "@/types";

type StreamCallback = (event: StreamEvent) => void;

/**
 * Stream Manager - Pub/Sub for SSE events per migration
 *
 * Allows multiple SSE clients to subscribe to a migration's events
 * and the orchestrator to emit events to all subscribers.
 */
class StreamManager {
  private subscribers = new Map<string, Set<StreamCallback>>();
  private eventHistory = new Map<string, StreamEvent[]>();
  private maxHistorySize = 100; // Keep last 100 events per migration

  /**
   * Subscribe to events for a specific migration
   * @returns Unsubscribe function
   */
  subscribe(migrationId: string, callback: StreamCallback): () => void {
    if (!this.subscribers.has(migrationId)) {
      this.subscribers.set(migrationId, new Set());
    }
    this.subscribers.get(migrationId)!.add(callback);

    // Send recent history to new subscriber
    const history = this.eventHistory.get(migrationId) || [];
    for (const event of history) {
      callback(event);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(migrationId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(migrationId);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers for a migration
   */
  emit(migrationId: string, event: StreamEvent): void {
    // Store in history
    if (!this.eventHistory.has(migrationId)) {
      this.eventHistory.set(migrationId, []);
    }
    const history = this.eventHistory.get(migrationId)!;
    history.push(event);

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Notify all subscribers
    const subs = this.subscribers.get(migrationId);
    if (subs) {
      for (const callback of subs) {
        try {
          callback(event);
        } catch (error) {
          console.error("[StreamManager] Subscriber callback error:", error);
        }
      }
    }
  }

  /**
   * Get the number of active subscribers for a migration
   */
  getSubscriberCount(migrationId: string): number {
    return this.subscribers.get(migrationId)?.size || 0;
  }

  /**
   * Clear event history for a migration
   */
  clearHistory(migrationId: string): void {
    this.eventHistory.delete(migrationId);
  }

  /**
   * Get event history for a migration
   */
  getHistory(migrationId: string): StreamEvent[] {
    return this.eventHistory.get(migrationId) || [];
  }
}

// Singleton instance
export const streamManager = new StreamManager();
