import { streamText } from "ai";
import { exec } from "child_process";
import { promisify } from "util";
import {
  getMigrationRaw,
  updateMigration,
  addMigrationLog,
} from "@/lib/db/migrations";
import {
  AGENT_1_PROMPT,
  AGENT_2_PROMPT,
  MIGRATION_SYSTEM_PROMPT,
} from "@/lib/agents/prompts";
import { streamManager } from "./streamManager";
import { sessionManager } from "./sessionManager";
import type { Migration, MigrationStatus } from "@/types";

const execAsync = promisify(exec);

interface OrchestratorResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Clone the GitHub repository for migration
 */
export async function cloneRepository(
  migrationId: string
): Promise<OrchestratorResult> {
  const migration = await getMigrationRaw(migrationId);
  if (!migration) {
    return { success: false, error: "Migration not found" };
  }

  if (!migration.repoPath) {
    return { success: false, error: "Migration repo path not set" };
  }

  try {
    await updateMigration(migrationId, { status: "cloning" });
    await addMigrationLog(migrationId, {
      agent: null,
      level: "info",
      message: `Cloning repository: ${migration.config.repoUrl}`,
    });

    // Clone with optional auth token
    let cloneUrl = migration.config.repoUrl;
    if (migration.config.githubToken) {
      // Insert token into URL for private repos
      const url = new URL(migration.config.repoUrl);
      url.username = migration.config.githubToken;
      cloneUrl = url.toString();
    }

    const branch = migration.config.branch || "main";
    const cmd = `git clone --branch ${branch} --single-branch --depth 100 "${cloneUrl}" "${migration.repoPath}"`;

    await execAsync(cmd);

    await addMigrationLog(migrationId, {
      agent: null,
      level: "info",
      message: "Repository cloned successfully",
    });

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await addMigrationLog(migrationId, {
      agent: null,
      level: "error",
      message: `Failed to clone repository: ${errorMsg}`,
    });
    await updateMigration(migrationId, { status: "failed" });
    return { success: false, error: errorMsg };
  }
}

/**
 * Get or create ACP provider for migration using session manager
 * Enables session persistence for interactive chat
 */
function getMigrationProvider(migrationId: string, migration: Migration) {
  return sessionManager.getOrCreate(migrationId, {
    command: "claude-code-acp",
    args: [],
    existingSessionId: migration.sessionId,
    persistSession: true,
    session: {
      cwd: migration.repoPath || process.cwd(),
      mcpServers: [],
    },
  });
}

/**
 * Run Agent 1 (Planning)
 */
export async function runPlanningAgent(
  migrationId: string,
  onChunk?: (chunk: string) => void
): Promise<OrchestratorResult> {
  const migration = await getMigrationRaw(migrationId);
  if (!migration) {
    return { success: false, error: "Migration not found" };
  }

  try {
    await updateMigration(migrationId, {
      status: "planning",
      currentAgent: 1,
    });

    // Emit status event
    streamManager.emit(migrationId, {
      type: "status",
      status: "planning",
      agent: 1,
    });

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: "Starting planning agent...",
    });

    const provider = getMigrationProvider(migrationId, migration);

    // Build the prompt with context
    let prompt = AGENT_1_PROMPT;
    if (migration.config.postgresUrl) {
      prompt += `\n\n## PostgreSQL Connection\nConnection string: ${migration.config.postgresUrl}\nUse psql or pg_dump to inspect the database.`;
    }
    if (migration.config.mongoUrl) {
      prompt += `\n\n## MongoDB Connection\nConnection string: ${migration.config.mongoUrl}\nYou can use mongosh or the MongoDB MCP server (npx -y mongodb-mcp-server with MONGODB_URI env var) to interact with MongoDB.`;
    }

    let fullResponse = "";
    let lastLogTime = Date.now();
    let textBuffer = "";
    const textBufferFlushInterval = 100; // Flush text buffer every 100ms
    let lastTextFlush = Date.now();

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: "Connecting to Claude Code ACP...",
    });

    streamManager.emit(migrationId, {
      type: "log",
      level: "info",
      message: "Connecting to Claude Code ACP...",
      agent: 1,
    });

    const result = await streamText({
      model: provider.languageModel(),
      system: MIGRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      onChunk: async ({ chunk }) => {
        // Handle text chunks
        if (chunk.type === "text-delta" && chunk.text) {
          fullResponse += chunk.text;
          textBuffer += chunk.text;
          onChunk?.(chunk.text);

          // Flush text buffer periodically for smoother streaming
          const now = Date.now();
          if (now - lastTextFlush > textBufferFlushInterval) {
            streamManager.emit(migrationId, {
              type: "text",
              content: textBuffer,
            });
            textBuffer = "";
            lastTextFlush = now;
          }

          // Log progress every 2 seconds to avoid flooding
          if (now - lastLogTime > 2000) {
            lastLogTime = now;
            const preview = fullResponse.slice(-200).replace(/\n/g, " ");
            await addMigrationLog(migrationId, {
              agent: 1,
              level: "info",
              message: `Agent: ...${preview}`,
            });
          }
        }

        // Handle tool call start
        if (chunk.type === "tool-call") {
          streamManager.emit(migrationId, {
            type: "tool_start",
            id: chunk.toolCallId,
            name: chunk.toolName,
            args: chunk.args as Record<string, unknown>,
          });
        }

        // Handle tool result
        if (chunk.type === "tool-result") {
          const result = chunk.result;
          const isError = typeof result === "object" && result !== null && "error" in result;
          streamManager.emit(migrationId, {
            type: "tool_result",
            id: chunk.toolCallId,
            success: !isError,
            output: typeof result === "string" ? result : JSON.stringify(result).slice(0, 500),
            error: isError ? String((result as { error: unknown }).error) : undefined,
          });
        }
      },
    });

    // Flush any remaining text buffer
    if (textBuffer) {
      streamManager.emit(migrationId, {
        type: "text",
        content: textBuffer,
      });
    }

    // Wait for the stream to complete
    await result.text;

    // Store session ID for interactive chat
    const sessionId = sessionManager.getSessionId(migrationId);
    if (sessionId) {
      await updateMigration(migrationId, { sessionId });
    }

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: `Planning complete. Response: ${fullResponse.length} chars`,
    });

    // Try to extract JSON plan from the response
    let plan: Record<string, unknown> | undefined;
    try {
      // Look for JSON in the response
      const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[1]);
      } else {
        // Try parsing the whole response as JSON
        plan = JSON.parse(fullResponse);
      }
    } catch {
      // If no JSON found, store the raw response
      plan = { raw_output: fullResponse };
    }

    await updateMigration(migrationId, {
      status: "plan_ready",
      currentAgent: null,
      plan,
    });

    streamManager.emit(migrationId, {
      type: "status",
      status: "plan_ready",
      agent: null,
    });

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: "Planning completed",
    });

    return { success: true, output: fullResponse };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await addMigrationLog(migrationId, {
      agent: 1,
      level: "error",
      message: `Planning failed: ${errorMsg}`,
    });

    streamManager.emit(migrationId, {
      type: "status",
      status: "failed",
      agent: null,
    });

    await updateMigration(migrationId, { status: "failed", currentAgent: null });
    return { success: false, error: errorMsg };
  }
}

/**
 * Run Agent 2 (Execution)
 */
export async function runExecutionAgent(
  migrationId: string,
  onChunk?: (chunk: string) => void
): Promise<OrchestratorResult> {
  const migration = await getMigrationRaw(migrationId);
  if (!migration) {
    return { success: false, error: "Migration not found" };
  }

  if (!migration.plan) {
    return { success: false, error: "No plan found. Run planning agent first." };
  }

  try {
    await updateMigration(migrationId, {
      status: "executing",
      currentAgent: 2,
    });

    // Emit status event
    streamManager.emit(migrationId, {
      type: "status",
      status: "executing",
      agent: 2,
    });

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: "Starting execution agent...",
    });

    const provider = getMigrationProvider(migrationId, migration);

    // Build the prompt with the plan and connection info
    const planJson = JSON.stringify(migration.plan, null, 2);
    let prompt = AGENT_2_PROMPT(planJson);
    if (migration.config.postgresUrl) {
      prompt += `\n\n## PostgreSQL Connection\nConnection string: ${migration.config.postgresUrl}`;
    }
    if (migration.config.mongoUrl) {
      prompt += `\n\n## MongoDB Connection\nConnection string: ${migration.config.mongoUrl}\nUse mongosh or MongoDB MCP server to interact with MongoDB.`;
    }

    let fullResponse = "";
    let lastLogTime = Date.now();
    let textBuffer = "";
    const textBufferFlushInterval = 100;
    let lastTextFlush = Date.now();

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: "Connecting to Claude Code ACP for execution...",
    });

    streamManager.emit(migrationId, {
      type: "log",
      level: "info",
      message: "Connecting to Claude Code ACP for execution...",
      agent: 2,
    });

    const result = await streamText({
      model: provider.languageModel(),
      system: MIGRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      onChunk: async ({ chunk }) => {
        // Handle text chunks
        if (chunk.type === "text-delta" && chunk.text) {
          fullResponse += chunk.text;
          textBuffer += chunk.text;
          onChunk?.(chunk.text);

          // Flush text buffer periodically
          const now = Date.now();
          if (now - lastTextFlush > textBufferFlushInterval) {
            streamManager.emit(migrationId, {
              type: "text",
              content: textBuffer,
            });
            textBuffer = "";
            lastTextFlush = now;
          }

          // Log progress every 2 seconds
          if (now - lastLogTime > 2000) {
            lastLogTime = now;
            const preview = fullResponse.slice(-200).replace(/\n/g, " ");
            await addMigrationLog(migrationId, {
              agent: 2,
              level: "info",
              message: `Agent: ...${preview}`,
            });
          }
        }

        // Handle tool call start
        if (chunk.type === "tool-call") {
          streamManager.emit(migrationId, {
            type: "tool_start",
            id: chunk.toolCallId,
            name: chunk.toolName,
            args: chunk.args as Record<string, unknown>,
          });
        }

        // Handle tool result
        if (chunk.type === "tool-result") {
          const result = chunk.result;
          const isError = typeof result === "object" && result !== null && "error" in result;
          streamManager.emit(migrationId, {
            type: "tool_result",
            id: chunk.toolCallId,
            success: !isError,
            output: typeof result === "string" ? result : JSON.stringify(result).slice(0, 500),
            error: isError ? String((result as { error: unknown }).error) : undefined,
          });
        }
      },
    });

    // Flush any remaining text buffer
    if (textBuffer) {
      streamManager.emit(migrationId, {
        type: "text",
        content: textBuffer,
      });
    }

    // Wait for the stream to complete
    await result.text;

    // Update session ID if needed
    const sessionId = sessionManager.getSessionId(migrationId);
    if (sessionId && sessionId !== migration.sessionId) {
      await updateMigration(migrationId, { sessionId });
    }

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: `Execution complete. Response: ${fullResponse.length} chars`,
    });

    // Try to extract result summary from the response
    let resultSummary: Migration["result"] | undefined;
    try {
      const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        resultSummary = {
          prUrl: parsed.pr_url,
          prNumber: parsed.pr_number,
          filesChanged: parsed.files_changed,
          collectionsCreated: parsed.collections_created?.length,
          rowsMigrated: parsed.rows_migrated
            ? Object.values(parsed.rows_migrated as Record<string, number>).reduce(
                (a: number, b: number) => a + b,
                0
              )
            : undefined,
          summary: parsed.notes?.join(", ") || parsed.summary,
        };
      }
    } catch {
      resultSummary = { summary: "Migration completed. Check logs for details." };
    }

    await updateMigration(migrationId, {
      status: "completed",
      currentAgent: null,
      result: resultSummary,
    });

    streamManager.emit(migrationId, {
      type: "status",
      status: "completed",
      agent: null,
    });

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: "Execution completed",
    });

    return { success: true, output: fullResponse };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await addMigrationLog(migrationId, {
      agent: 2,
      level: "error",
      message: `Execution failed: ${errorMsg}`,
    });

    streamManager.emit(migrationId, {
      type: "status",
      status: "failed",
      agent: null,
    });

    await updateMigration(migrationId, { status: "failed", currentAgent: null });
    return { success: false, error: errorMsg };
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(
  migrationId: string
): Promise<{ status: MigrationStatus; currentAgent: 1 | 2 | null } | null> {
  const migration = await getMigrationRaw(migrationId);
  if (!migration) return null;
  return {
    status: migration.status,
    currentAgent: migration.currentAgent,
  };
}

/**
 * Send a chat message to the active agent session
 * Enables interactive communication with the agent during migration
 */
export async function sendChatMessage(
  migrationId: string,
  message: string,
  onChunk?: (chunk: string) => void
): Promise<OrchestratorResult> {
  const migration = await getMigrationRaw(migrationId);
  if (!migration) {
    return { success: false, error: "Migration not found" };
  }

  // Check if there's an active session
  if (!migration.sessionId && !sessionManager.hasActiveSession(migrationId)) {
    return { success: false, error: "No active agent session. Start the planning agent first." };
  }

  try {
    // Emit user message event
    streamManager.emit(migrationId, {
      type: "user_message",
      content: message,
    });

    await addMigrationLog(migrationId, {
      agent: migration.currentAgent,
      level: "info",
      message: `User: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
    });

    // Get or create provider with existing session
    const provider = getMigrationProvider(migrationId, migration);

    let fullResponse = "";
    let textBuffer = "";
    const textBufferFlushInterval = 100;
    let lastTextFlush = Date.now();

    const result = await streamText({
      model: provider.languageModel(),
      messages: [{ role: "user", content: message }],
      onChunk: async ({ chunk }) => {
        // Handle text chunks
        if (chunk.type === "text-delta" && chunk.text) {
          fullResponse += chunk.text;
          textBuffer += chunk.text;
          onChunk?.(chunk.text);

          // Flush text buffer periodically
          const now = Date.now();
          if (now - lastTextFlush > textBufferFlushInterval) {
            streamManager.emit(migrationId, {
              type: "text",
              content: textBuffer,
            });
            textBuffer = "";
            lastTextFlush = now;
          }
        }

        // Handle tool call start
        if (chunk.type === "tool-call") {
          streamManager.emit(migrationId, {
            type: "tool_start",
            id: chunk.toolCallId,
            name: chunk.toolName,
            args: chunk.args as Record<string, unknown>,
          });
        }

        // Handle tool result
        if (chunk.type === "tool-result") {
          const result = chunk.result;
          const isError = typeof result === "object" && result !== null && "error" in result;
          streamManager.emit(migrationId, {
            type: "tool_result",
            id: chunk.toolCallId,
            success: !isError,
            output: typeof result === "string" ? result : JSON.stringify(result).slice(0, 500),
            error: isError ? String((result as { error: unknown }).error) : undefined,
          });
        }
      },
    });

    // Flush any remaining text buffer
    if (textBuffer) {
      streamManager.emit(migrationId, {
        type: "text",
        content: textBuffer,
      });
    }

    // Wait for the stream to complete
    await result.text;

    // Emit agent message complete event
    streamManager.emit(migrationId, {
      type: "agent_message",
      content: fullResponse,
    });

    return { success: true, output: fullResponse };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await addMigrationLog(migrationId, {
      agent: migration.currentAgent,
      level: "error",
      message: `Chat error: ${errorMsg}`,
    });
    return { success: false, error: errorMsg };
  }
}
