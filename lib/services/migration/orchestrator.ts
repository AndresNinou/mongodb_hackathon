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

// ACP command configuration - use full path to npx for nvm environments
const NPX_PATH = "/home/andres/.config/nvm/versions/node/v20.19.6/bin/npx";
const ACP_COMMAND = NPX_PATH;
const ACP_ARGS = ["-y", "@anthropics/claude-code", "--acp"];

/**
 * Get or create ACP provider for migration using session manager
 * Enables session persistence for interactive chat
 */
async function getMigrationProvider(migrationId: string, migration: Migration) {
  console.log("[Orchestrator] Using ACP command:", ACP_COMMAND, ACP_ARGS.join(" "));

  const { provider, sessionId, isNew } = await sessionManager.getOrCreate(migrationId, {
    command: ACP_COMMAND,
    args: ACP_ARGS,
    existingSessionId: migration.sessionId,
    persistSession: true,
    session: {
      cwd: migration.repoPath || process.cwd(),
      mcpServers: [],
    },
  });

  // Save session ID to database if this is a new session
  if (isNew && sessionId) {
    await updateMigration(migrationId, { sessionId });
    console.log("[Orchestrator] Saved new session ID to migration:", sessionId);
  }

  return provider;
}

/**
 * Run Agent 1 (Planning) - Automated planning flow
 * Note: For interactive chat, use the /api/migrations/[id]/chat endpoint instead
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

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: "Starting planning agent...",
    });

    const provider = await getMigrationProvider(migrationId, migration);

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

    await addMigrationLog(migrationId, {
      agent: 1,
      level: "info",
      message: "Connecting to Claude Code ACP...",
    });

    const result = await streamText({
      model: provider.languageModel(),
      system: MIGRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      tools: provider.tools,
      onChunk: async ({ chunk }) => {
        // Handle text chunks
        if (chunk.type === "text-delta" && chunk.text) {
          fullResponse += chunk.text;
          onChunk?.(chunk.text);

          // Log progress every 2 seconds to avoid flooding
          const now = Date.now();
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
      },
    });

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

    await updateMigration(migrationId, { status: "failed", currentAgent: null });
    return { success: false, error: errorMsg };
  }
}

/**
 * Run Agent 2 (Execution) - Automated execution flow
 * Note: For interactive chat, use the /api/migrations/[id]/chat endpoint instead
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

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: "Starting execution agent...",
    });

    const provider = await getMigrationProvider(migrationId, migration);

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

    await addMigrationLog(migrationId, {
      agent: 2,
      level: "info",
      message: "Connecting to Claude Code ACP for execution...",
    });

    const result = await streamText({
      model: provider.languageModel(),
      system: MIGRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      tools: provider.tools,
      onChunk: async ({ chunk }) => {
        // Handle text chunks
        if (chunk.type === "text-delta" && chunk.text) {
          fullResponse += chunk.text;
          onChunk?.(chunk.text);

          // Log progress every 2 seconds
          const now = Date.now();
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
      },
    });

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
