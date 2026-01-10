import { getMigrationById } from "@/lib/db/migrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let lastLogCount = 0;

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
          })}\n\n`
        )
      );
      lastLogCount = migration.logs.length;

      // Poll for updates every 2 seconds
      intervalId = setInterval(async () => {
        try {
          const updated = await getMigrationById(id);
          if (!updated) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Migration not found" })}\n\n`)
            );
            if (intervalId) clearInterval(intervalId);
            controller.close();
            return;
          }

          // Send new logs if any
          if (updated.logs.length > lastLogCount) {
            const newLogs = updated.logs.slice(lastLogCount);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "logs",
                  logs: newLogs,
                })}\n\n`
              )
            );
            lastLogCount = updated.logs.length;
          }

          // Send status update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                status: updated.status,
                currentAgent: updated.currentAgent,
                plan: updated.plan,
                result: updated.result,
              })}\n\n`
            )
          );

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
            if (intervalId) clearInterval(intervalId);
            controller.close();
          }
        } catch (error) {
          console.error("[Stream API] Error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            )
          );
        }
      }, 2000);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
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
