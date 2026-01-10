import { sendChatMessage } from "@/lib/services/migration/orchestrator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return Response.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Trim and validate message length
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return Response.json(
        { success: false, error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 10000) {
      return Response.json(
        { success: false, error: "Message too long (max 10000 characters)" },
        { status: 400 }
      );
    }

    // Send the message to the agent
    const result = await sendChatMessage(id, trimmedMessage);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      data: {
        response: result.output,
      },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
