import { NextResponse } from "next/server";
import {
  getChatMessages,
  addChatMessage,
  clearChatMessages,
} from "@/lib/db/migrations";
import type { ChatMessage } from "@/types";

// GET - Fetch all chat messages for a migration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: migrationId } = await params;
    const messages = await getChatMessages(migrationId);

    // Convert Date to ISO string for response
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      timestamp:
        msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : msg.timestamp,
    }));

    return NextResponse.json({ success: true, data: formattedMessages });
  } catch (error) {
    console.error("[Messages API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Add a new chat message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: migrationId } = await params;
    const body = await request.json();

    const message: Omit<ChatMessage, "timestamp"> = {
      id: body.id || `msg-${Date.now()}`,
      role: body.role,
      content: body.content,
      agent: body.agent,
      tools: body.tools,
    };

    await addChatMessage(migrationId, message);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[Messages API] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear all chat messages for a migration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: migrationId } = await params;
    await clearChatMessages(migrationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Messages API] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
