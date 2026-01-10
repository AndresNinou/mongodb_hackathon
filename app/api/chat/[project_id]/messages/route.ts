import { getMessagesByProjectId } from "@/lib/db/messages";
import { getProjectById } from "@/lib/db/projects";

interface RouteContext {
  params: Promise<{ project_id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
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

    // Get messages
    const messages = await getMessagesByProjectId(project_id);

    // Convert to format expected by useChat
    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));

    return new Response(JSON.stringify(formattedMessages), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Messages API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch messages" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
