/**
 * MCP SSE Messages Endpoint
 *
 * Handles message posting for SSE transport connections.
 * Used in conjunction with the /api/__mcp__/sse endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { sseTransports } from "../sse/route";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

// CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * POST - Send message to SSE transport
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      return NextResponse.json(
        { error: "Session not found or wrong transport type" },
        { status: 404, headers: corsHeaders() }
      );
    }

    const body = await request.json();

    // Create mock request/response for the transport
    const mockSocket = new Socket();
    const mockReq = new IncomingMessage(mockSocket);
    mockReq.method = "POST";
    mockReq.url = request.url;
    mockReq.headers = Object.fromEntries(request.headers.entries());

    let responseBody = "";
    let responseStatusCode = 200;
    const responseHeaders: Record<string, string> = {};

    const mockRes = new ServerResponse(mockReq);

    mockRes.write = function (
      chunk: unknown,
      encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void
    ): boolean {
      if (chunk) {
        responseBody +=
          typeof chunk === "string"
            ? chunk
            : Buffer.from(chunk as Buffer).toString();
      }
      if (typeof encodingOrCallback === "function") {
        encodingOrCallback();
      } else if (callback) {
        callback();
      }
      return true;
    };

    mockRes.end = function (
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void
    ): ServerResponse {
      if (chunk) {
        responseBody +=
          typeof chunk === "string"
            ? chunk
            : Buffer.from(chunk as Buffer).toString();
      }
      if (typeof encodingOrCallback === "function") {
        encodingOrCallback();
      } else if (callback) {
        callback();
      }
      return mockRes;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRes as any).writeHead = function (
      statusCode: number,
      statusMessageOrHeaders?: string | Record<string, string | string[]>,
      headers?: Record<string, string | string[]>
    ): ServerResponse {
      responseStatusCode = statusCode;
      const headersToApply =
        typeof statusMessageOrHeaders === "object"
          ? statusMessageOrHeaders
          : headers;
      if (headersToApply) {
        for (const [key, value] of Object.entries(headersToApply)) {
          responseHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }
      return mockRes;
    };

    mockRes.setHeader = function (
      name: string,
      value: string | number | readonly string[]
    ): ServerResponse {
      responseHeaders[name] = Array.isArray(value)
        ? value.join(", ")
        : String(value);
      return mockRes;
    };

    // Handle the message via transport
    await transport.handlePostMessage(mockReq, mockRes, body);

    return new NextResponse(responseBody || null, {
      status: responseStatusCode,
      headers: {
        ...corsHeaders(),
        ...responseHeaders,
      },
    });
  } catch (error) {
    console.error("[mongrate] [mcp-messages] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
