/**
 * MCP SSE Endpoint (Legacy)
 *
 * Handles MCP protocol via Server-Sent Events transport.
 * Used by editors like Cursor that prefer SSE over Streamable HTTP.
 */

import { NextRequest } from "next/server";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMongrateMcpServer } from "@/lib/mcp/server";
import { connectionManager } from "@/lib/mcp/connection-manager";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

// Store SSE transports for message handling
const sseTransports = new Map<string, SSEServerTransport>();

export { sseTransports };

// CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET - Establish SSE connection
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") || "agent";
  const migrationId = url.searchParams.get("migrationId");

  console.log(
    `[mongrate] [mcp-sse] New connection: clientId=${clientId}, migrationId=${migrationId || "global"}`
  );

  // Create response stream
  const encoder = new TextEncoder();
  let transport: SSEServerTransport;
  let sessionId: string;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create mock response for SSEServerTransport
        const mockSocket = new Socket();
        const mockReq = new IncomingMessage(mockSocket);
        const mockRes = new ServerResponse(mockReq);

        // Track if we're still open
        let isOpen = true;

        // Override write to send SSE events
        mockRes.write = function (
          chunk: unknown,
          encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
          callback?: (error?: Error | null) => void
        ): boolean {
          if (!isOpen) return false;
          try {
            const data =
              typeof chunk === "string"
                ? chunk
                : Buffer.from(chunk as Buffer).toString();
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error("[mongrate] [mcp-sse] Write error:", error);
          }
          if (typeof encodingOrCallback === "function") {
            encodingOrCallback();
          } else if (callback) {
            callback();
          }
          return true;
        };

        mockRes.end = function (): ServerResponse {
          isOpen = false;
          return mockRes;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockRes as any).writeHead = function (
          _statusCode: number,
          _statusMessageOrHeaders?: string | Record<string, string | string[]>,
          _headers?: Record<string, string | string[]>
        ): ServerResponse {
          // Headers already sent via Response - parameters intentionally unused
          return mockRes;
        };

        mockRes.setHeader = function (): ServerResponse {
          return mockRes;
        };

        // Set up socket properties
        (mockRes as unknown as { socket: { setKeepAlive: () => void; setTimeout: () => void } }).socket = {
          setKeepAlive: () => {},
          setTimeout: () => {},
        };

        // Create SSE transport
        transport = new SSEServerTransport("/api/__mcp__/messages", mockRes);
        sessionId = transport.sessionId;

        console.log(`[mongrate] [mcp-sse] Session created: ${sessionId}`);

        // Store transport for message handling
        sseTransports.set(sessionId, transport);
        connectionManager.registerTransport(
          sessionId,
          transport,
          migrationId || undefined
        );

        // Create and connect MCP server
        const mcpServer = await createMongrateMcpServer();
        await mcpServer.connect(transport);

        // Handle close
        request.signal.addEventListener("abort", () => {
          console.log(`[mongrate] [mcp-sse] Connection closed: ${sessionId}`);
          isOpen = false;
          sseTransports.delete(sessionId);
          connectionManager.removeTransport(sessionId);
          controller.close();
        });

        // Send connected message
        controller.enqueue(encoder.encode(": mcp-sse-connected\n\n"));
      } catch (error) {
        console.error("[mongrate] [mcp-sse] Error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "identity",
    },
  });
}
