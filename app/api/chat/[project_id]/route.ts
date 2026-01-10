import { createACPProvider } from "@mcpc-tech/acp-ai-provider";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "@ai-sdk/react";
import { getProjectById, updateProjectActivity } from "@/lib/db/projects";
import { createMessage } from "@/lib/db/messages";
import { AI_CONFIG, PROJECTS_DIR } from "@/lib/config/constants";
import path from "path";

interface RouteContext {
  params: Promise<{ project_id: string }>;
}

// Helper to extract text content from UIMessage parts
function extractTextFromMessage(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { project_id } = await params;

  try {
    // Verify project exists
    const project = await getProjectById(project_id);
    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await request.json();
    const messages: UIMessage[] = body.messages || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save the last user message to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      const textContent = extractTextFromMessage(lastMessage);
      if (textContent) {
        await createMessage({
          projectId: project_id,
          role: "user",
          messageType: "chat",
          content: textContent,
        });
      }
    }

    // Update project activity
    await updateProjectActivity(project_id);

    // Get project path
    const projectPath = path.join(process.cwd(), PROJECTS_DIR, project_id);

    // Create ACP provider for Claude Code
    const provider = createACPProvider({
      command: "claude-code-acp",
      args: [],
      session: {
        cwd: projectPath,
        mcpServers: [],
      },
    });

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Stream the response
    const result = streamText({
      model: provider.languageModel(),
      messages: modelMessages,
      system: AI_CONFIG.SYSTEM_PROMPT,
      onFinish: async ({ text }) => {
        // Save assistant response to database
        if (text) {
          await createMessage({
            projectId: project_id,
            role: "assistant",
            messageType: "chat",
            content: text,
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long AI responses
