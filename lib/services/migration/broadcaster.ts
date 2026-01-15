import { EventEmitter } from "events";

export interface AgentMessage {
  type: "text" | "tool-call" | "tool-result" | "status" | "error";
  agent: 1 | 2 | null;
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolOutput?: string;
  toolStatus?: "running" | "completed" | "failed";
  status?: string;
}

interface MigrationEmitter extends EventEmitter {
  on(event: "message", listener: (message: AgentMessage) => void): this;
  emit(event: "message", message: AgentMessage): boolean;
}

/**
 * Message Broadcaster - Broadcasts agent messages to subscribed clients via SSE
 *
 * Usage:
 * - Orchestrator calls broadcaster.broadcast(migrationId, message)
 * - SSE endpoint calls broadcaster.subscribe(migrationId, callback)
 */
class MessageBroadcaster {
  private emitters = new Map<string, MigrationEmitter>();
  private subscribers = new Map<string, Set<(message: AgentMessage) => void>>();

  /**
   * Get or create an emitter for a migration
   */
  private getEmitter(migrationId: string): MigrationEmitter {
    let emitter = this.emitters.get(migrationId);
    if (!emitter) {
      emitter = new EventEmitter() as MigrationEmitter;
      emitter.setMaxListeners(100); // Allow many subscribers
      this.emitters.set(migrationId, emitter);
    }
    return emitter;
  }

  /**
   * Broadcast a message to all subscribers for a migration
   */
  broadcast(migrationId: string, message: Omit<AgentMessage, "timestamp">): void {
    const fullMessage: AgentMessage = {
      ...message,
      timestamp: Date.now(),
    };

    const emitter = this.getEmitter(migrationId);
    emitter.emit("message", fullMessage);

    // Also log for debugging
    console.log(`[Broadcaster] ${migrationId}:`, message.type, message.content?.slice(0, 100));
  }

  /**
   * Subscribe to messages for a migration
   * Returns an unsubscribe function
   */
  subscribe(
    migrationId: string,
    callback: (message: AgentMessage) => void
  ): () => void {
    const emitter = this.getEmitter(migrationId);

    // Track subscribers
    let subs = this.subscribers.get(migrationId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(migrationId, subs);
    }
    subs.add(callback);

    // Listen to messages
    emitter.on("message", callback);

    // Return unsubscribe function
    return () => {
      emitter.off("message", callback);
      subs?.delete(callback);

      // Clean up if no more subscribers
      if (subs?.size === 0) {
        this.subscribers.delete(migrationId);
      }
    };
  }

  /**
   * Get number of subscribers for a migration
   */
  getSubscriberCount(migrationId: string): number {
    return this.subscribers.get(migrationId)?.size || 0;
  }

  /**
   * Clean up a migration's emitter
   */
  cleanup(migrationId: string): void {
    const emitter = this.emitters.get(migrationId);
    if (emitter) {
      emitter.removeAllListeners();
      this.emitters.delete(migrationId);
    }
    this.subscribers.delete(migrationId);
  }
}

// Singleton instance
export const broadcaster = new MessageBroadcaster();
