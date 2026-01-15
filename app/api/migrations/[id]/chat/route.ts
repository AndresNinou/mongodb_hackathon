import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createACPProvider } from "@mcpc-tech/acp-ai-provider";
import { getMigrationRaw, updateMigration } from "@/lib/db/migrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ACP command configuration - use full path to npx for nvm environments
const NPX_PATH = "/home/andres/.config/nvm/versions/node/v20.19.6/bin/npx";

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { messages } = body as { messages: UIMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const migration = await getMigrationRaw(id);
    if (!migration) {
      return Response.json(
        { error: "Migration not found" },
        { status: 404 }
      );
    }

    console.log("[Chat API] Creating ACP provider for migration:", id);
    console.log("[Chat API] Using cwd:", migration.repoPath || process.cwd());
    console.log("[Chat API] Existing session ID:", migration.sessionId);

    const provider = createACPProvider({
      command: NPX_PATH,
      args: ["-y", "@zed-industries/claude-code-acp"],
      persistSession: true,
      existingSessionId: migration.sessionId,
      session: {
        cwd: migration.repoPath || process.cwd(),
        mcpServers: [],
      },
    });

    // Initialize and save session ID if new
    const session = await provider.initSession();
    console.log("[Chat API] Session initialized:", session.sessionId);

    if (session.sessionId && session.sessionId !== migration.sessionId) {
      await updateMigration(id, { sessionId: session.sessionId });
      console.log("[Chat API] Saved new session ID to migration");
    }

    const result = streamText({
      model: provider.languageModel(),
      includeRawChunks: true,
      messages: await convertToModelMessages(messages),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: provider.tools as any,
      onError: (error) => {
        console.error("[Chat API] Stream error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // Extract plan from raw chunks if available
        if (part.type === "raw" && part.rawValue) {
          try {
            const parsed = JSON.parse(part.rawValue as string);
            // Check if it's a plan array
            if (Array.isArray(parsed)) {
              return { plan: parsed };
            }
            // Check for diff data
            if (parsed.type === "diff") {
              return { diff: parsed };
            }
            // Check for terminal data
            if (parsed.type === "terminal") {
              return { terminal: parsed };
            }
          } catch {
            // Not JSON, ignore
          }
        }
        return undefined;
      },
      onError: (error) => {
        console.error("[Chat API] Response stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to process chat",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
