import { broadcaster, type AgentMessage } from "@/lib/services/migration/broadcaster";
import { getMigrationRaw } from "@/lib/db/migrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * SSE endpoint for streaming agent messages in real-time
 * The frontend subscribes to this to receive agent responses
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // Verify migration exists
  const migration = await getMigrationRaw(id);
  if (!migration) {
    return new Response(JSON.stringify({ error: "Migration not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message with current agent
      const initMessage: AgentMessage = {
        type: "status",
        agent: migration.currentAgent,
        content: "Connected to agent stream",
        timestamp: Date.now(),
        status: migration.status,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`)
      );

      // Subscribe to broadcast messages
      unsubscribe = broadcaster.subscribe(id, (message) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        } catch (error) {
          console.error("[Stream] Error sending message:", error);
        }
      });

      // Handle client disconnect via abort signal
      request.signal.addEventListener("abort", () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
