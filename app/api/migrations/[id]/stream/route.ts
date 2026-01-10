import { getMigrationById } from "@/lib/db/migrations";
import { streamManager } from "@/lib/services/migration/streamManager";
import type { StreamEvent } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let intervalId: NodeJS.Timeout | null = null;
  let lastLogCount = 0;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial migration state
      const migration = await getMigrationById(id);
      if (!migration) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Migration not found" })}\n\n`)
        );
        controller.close();
        return;
      }

      // Send initial state
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "init",
            status: migration.status,
            currentAgent: migration.currentAgent,
            logs: migration.logs,
            plan: migration.plan,
          })}\n\n`
        )
      );
      lastLogCount = migration.logs.length;

      // Subscribe to real-time stream events
      unsubscribe = streamManager.subscribe(id, (event: StreamEvent) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch (error) {
          console.error("[Stream API] Error sending event:", error);
        }
      });

      // Also poll for log updates and status changes every 2 seconds
      // This catches any events that might be missed
      intervalId = setInterval(async () => {
        if (isClosed) return;
        try {
          const updated = await getMigrationById(id);
          if (!updated) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Migration not found" })}\n\n`)
            );
            cleanup();
            controller.close();
            return;
          }

          // Send new logs if any
          if (updated.logs.length > lastLogCount) {
            const newLogs = updated.logs.slice(lastLogCount);
            for (const log of newLogs) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "log",
                    level: log.level,
                    message: log.message,
                    agent: log.agent,
                    timestamp: log.timestamp,
                  })}\n\n`
                )
              );
            }
            lastLogCount = updated.logs.length;
          }

          // Close stream if migration is complete or failed
          if (updated.status === "completed" || updated.status === "failed") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  status: updated.status,
                  result: updated.result,
                })}\n\n`
              )
            );
            cleanup();
            controller.close();
          }
        } catch (error) {
          console.error("[Stream API] Poll error:", error);
        }
      }, 2000);

      function cleanup() {
        isClosed = true;
        if (unsubscribe) unsubscribe();
        if (intervalId) clearInterval(intervalId);
      }
    },
    cancel() {
      isClosed = true;
      if (unsubscribe) unsubscribe();
      if (intervalId) clearInterval(intervalId);
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
