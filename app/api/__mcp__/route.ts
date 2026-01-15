/**
 * MCP Streamable HTTP Endpoint
 *
 * Handles MCP protocol requests via Streamable HTTP transport.
 * Supports POST (initialize/request), GET (SSE stream), DELETE (close session).
 */

import { NextRequest, NextResponse } from "next/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { createMongrateMcpServer } from "@/lib/mcp/server";
import { connectionManager } from "@/lib/mcp/connection-manager";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

// CORS headers for MCP endpoints
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, mcp-session-id, mcp-protocol-version",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * POST - Initialize session or handle requests
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("mcp-session-id");
    const body = await request.json();

    const existingTransport = sessionId
      ? connectionManager.getTransport(sessionId)
      : undefined;

    let transport: StreamableHTTPServerTransport;

    if (sessionId && existingTransport) {
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        transport = existingTransport;
      } else {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Session exists but uses a different transport protocol",
            },
            id: null,
          },
          { status: 400, headers: corsHeaders() }
        );
      }
    } else if (!sessionId && isInitializeRequest(body)) {
      // New session - create MCP server and transport
      const mcpServer = await createMongrateMcpServer();

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          connectionManager.registerTransport(sid, transport);
          console.log(`[mongrate] [mcp] Session initialized: ${sid}`);
        },
        enableJsonResponse: false,
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          connectionManager.removeTransport(transport.sessionId);
        }
      };

      await mcpServer.connect(transport);
    } else {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Invalid session ID or not an initialize request",
          },
          id: null,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Create mock request/response for the transport
    const { mockReq, mockRes, getResponse } = createMockHttpObjects(request);

    await transport.handleRequest(mockReq, mockRes, body);

    // Get the response data
    const responseData = getResponse();

    return new NextResponse(responseData.body, {
      status: responseData.statusCode,
      headers: {
        ...corsHeaders(),
        ...responseData.headers,
      },
    });
  } catch (error) {
    console.error("[mongrate] [mcp] Error handling POST:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET - SSE stream for server-to-client notifications
 */
export async function GET(request: NextRequest) {
  const sessionId = request.headers.get("mcp-session-id");

  if (!sessionId) {
    return new NextResponse("Missing mcp-session-id header", {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const transport = connectionManager.getTransport(sessionId);
  if (!transport) {
    return new NextResponse("Session not found", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  if (!(transport instanceof StreamableHTTPServerTransport)) {
    return new NextResponse("Session uses different transport", {
      status: 400,
      headers: corsHeaders(),
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(": mcp-connected\n\n"));

      // The transport will handle the actual SSE events
      // For now, we just keep the connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * DELETE - Close session
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get("mcp-session-id");

  if (!sessionId) {
    return new NextResponse("Session not found", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  const transport = connectionManager.getTransport(sessionId);
  if (!transport) {
    return new NextResponse("Session not found", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  connectionManager.removeTransport(sessionId);
  console.log(`[mongrate] [mcp] Session closed: ${sessionId}`);

  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Check if the request is an MCP initialize request
 */
function isInitializeRequest(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "method" in body &&
    (body as { method: string }).method === "initialize" &&
    "jsonrpc" in body &&
    (body as { jsonrpc: string }).jsonrpc === "2.0"
  );
}

/**
 * Create mock Node.js HTTP objects for the MCP SDK transport
 */
function createMockHttpObjects(request: NextRequest) {
  let responseBody = "";
  let responseStatusCode = 200;
  const responseHeaders: Record<string, string> = {};

  // Create a minimal socket mock
  const mockSocket = new Socket();

  // Create mock IncomingMessage
  const mockReq = new IncomingMessage(mockSocket);
  mockReq.method = request.method;
  mockReq.url = request.url;
  mockReq.headers = Object.fromEntries(request.headers.entries());

  // Create mock ServerResponse
  const mockRes = new ServerResponse(mockReq);

  // Override write methods to capture response

  mockRes.write = function (
    chunk: unknown,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean {
    if (chunk) {
      responseBody +=
        typeof chunk === "string" ? chunk : Buffer.from(chunk as Buffer).toString();
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
        typeof chunk === "string" ? chunk : Buffer.from(chunk as Buffer).toString();
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

  mockRes.setHeader = function (name: string, value: string | number | readonly string[]): ServerResponse {
    responseHeaders[name] = Array.isArray(value) ? value.join(", ") : String(value);
    return mockRes;
  };

  return {
    mockReq,
    mockRes,
    getResponse: () => ({
      body: responseBody,
      statusCode: responseStatusCode,
      headers: responseHeaders,
    }),
  };
}
