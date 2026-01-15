/**
 * MCP Server for Mongrate
 *
 * Creates an MCP server that exposes migration tools via the Model Context Protocol.
 * Based on patterns from dev-inspector-mcp.
 */

import { createClientExecServer } from "@mcpc-tech/cmcp";
import { mcpc } from "@mcpc-tech/core";
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  type GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_SCHEMAS } from "./tool-schemas";
import { PROMPT_SCHEMAS } from "./prompt-schemas";
import {
  getAllMigrations,
  getMigrationById,
  getMigrationRaw,
  createMigration,
  deleteMigration,
  getMigrationPath,
} from "@/lib/db/migrations";
import {
  runPlanningAgent,
  runExecutionAgent,
  cloneRepository,
} from "@/lib/services/migration/orchestrator";
import fs from "fs/promises";
import path from "path";

export interface ServerContext {
  host?: string;
  port?: number;
}

// Helper to create text message for GetPromptResult
function textMessage(text: string): GetPromptResult {
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}

/**
 * Create the Mongrate MCP server
 */
export async function createMongrateMcpServer(
  _serverContext?: ServerContext
): Promise<ReturnType<typeof createClientExecServer>> {
  const mcpServer = await mcpc([
    {
      name: "mongrate",
      version: "1.0.0",
      title: "PostgreSQL to MongoDB Migration Tool",
    },
    {
      capabilities: {
        tools: { listChanged: true },
        prompts: { listChanged: true },
      },
    },
  ]);

  // Register tools

  // list_migrations
  mcpServer.tool(
    TOOL_SCHEMAS.list_migrations.name,
    TOOL_SCHEMAS.list_migrations.description,
    TOOL_SCHEMAS.list_migrations.inputSchema,
    async ({ status, limit = 20 }: { status?: string; limit?: number }) => {
      try {
        const migrations = await getAllMigrations();
        let filtered = migrations;
        if (status) {
          filtered = migrations.filter((m) => m.status === status);
        }
        const result = filtered.slice(0, limit).map((m) => ({
          id: m.migrationId,
          name: m.name,
          status: m.status,
          createdAt: m.createdAt,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // get_migration_status
  mcpServer.tool(
    TOOL_SCHEMAS.get_migration_status.name,
    TOOL_SCHEMAS.get_migration_status.description,
    TOOL_SCHEMAS.get_migration_status.inputSchema,
    async ({ migrationId }: { migrationId: string }) => {
      try {
        const migration = await getMigrationById(migrationId);
        if (!migration) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: migration.migrationId,
                  name: migration.name,
                  status: migration.status,
                  currentAgent: migration.currentAgent,
                  hasPlan: !!migration.plan,
                  hasResult: !!migration.result,
                  config: migration.config,
                  createdAt: migration.createdAt,
                  updatedAt: migration.updatedAt,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // get_migration_plan
  mcpServer.tool(
    TOOL_SCHEMAS.get_migration_plan.name,
    TOOL_SCHEMAS.get_migration_plan.description,
    TOOL_SCHEMAS.get_migration_plan.inputSchema,
    async ({ migrationId }: { migrationId: string }) => {
      try {
        const migration = await getMigrationById(migrationId);
        if (!migration) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }
        if (!migration.plan) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No plan available. Run the planning agent first.",
              },
            ],
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(migration.plan, null, 2) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // get_migration_logs
  mcpServer.tool(
    TOOL_SCHEMAS.get_migration_logs.name,
    TOOL_SCHEMAS.get_migration_logs.description,
    TOOL_SCHEMAS.get_migration_logs.inputSchema,
    async ({
      migrationId,
      limit = 50,
      level,
    }: {
      migrationId: string;
      limit?: number;
      level?: string;
    }) => {
      try {
        const migration = await getMigrationById(migrationId);
        if (!migration) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }
        let logs = migration.logs;
        if (level) {
          logs = logs.filter((l) => l.level === level);
        }
        const result = logs.slice(-limit);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // start_planning
  mcpServer.tool(
    TOOL_SCHEMAS.start_planning.name,
    TOOL_SCHEMAS.start_planning.description,
    TOOL_SCHEMAS.start_planning.inputSchema,
    async ({ migrationId }: { migrationId: string }) => {
      try {
        const migration = await getMigrationRaw(migrationId);
        if (!migration) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }

        // Clone repo if not already done
        if (migration.status === "pending") {
          const cloneResult = await cloneRepository(migrationId);
          if (!cloneResult.success) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to clone repository: ${cloneResult.error}`,
                },
              ],
            };
          }
        }

        // Start planning in background
        runPlanningAgent(migrationId).catch((error) => {
          console.error("[MCP] Planning agent error:", error);
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Planning agent started for migration ${migrationId}. Use get_migration_status to track progress.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // start_execution
  mcpServer.tool(
    TOOL_SCHEMAS.start_execution.name,
    TOOL_SCHEMAS.start_execution.description,
    TOOL_SCHEMAS.start_execution.inputSchema,
    async ({ migrationId }: { migrationId: string }) => {
      try {
        const migration = await getMigrationRaw(migrationId);
        if (!migration) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }

        if (!migration.plan) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No plan available. Run the planning agent first.",
              },
            ],
          };
        }

        // Start execution in background
        runExecutionAgent(migrationId).catch((error) => {
          console.error("[MCP] Execution agent error:", error);
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Execution agent started for migration ${migrationId}. Use get_migration_status to track progress.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // browse_files
  mcpServer.tool(
    TOOL_SCHEMAS.browse_files.name,
    TOOL_SCHEMAS.browse_files.description,
    TOOL_SCHEMAS.browse_files.inputSchema,
    async ({ migrationId, path: dirPath = "" }: { migrationId: string; path?: string }) => {
      try {
        const repoPath = await getMigrationPath(migrationId);
        if (!repoPath) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Migration not found or repository not cloned",
              },
            ],
          };
        }

        const fullPath = path.join(repoPath, dirPath);
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const result = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        }));

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // read_file
  mcpServer.tool(
    TOOL_SCHEMAS.read_file.name,
    TOOL_SCHEMAS.read_file.description,
    TOOL_SCHEMAS.read_file.inputSchema,
    async ({ migrationId, filePath }: { migrationId: string; filePath: string }) => {
      try {
        const repoPath = await getMigrationPath(migrationId);
        if (!repoPath) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Migration not found or repository not cloned",
              },
            ],
          };
        }

        const fullPath = path.join(repoPath, filePath);
        const content = await fs.readFile(fullPath, "utf-8");

        return {
          content: [{ type: "text" as const, text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // create_migration
  mcpServer.tool(
    TOOL_SCHEMAS.create_migration.name,
    TOOL_SCHEMAS.create_migration.description,
    TOOL_SCHEMAS.create_migration.inputSchema,
    async ({
      name,
      repoUrl,
      branch,
      postgresUrl,
      mongoUrl,
    }: {
      name: string;
      repoUrl: string;
      branch?: string;
      postgresUrl?: string;
      mongoUrl: string;
    }) => {
      try {
        const migration = await createMigration({
          name,
          config: {
            repoUrl,
            branch,
            postgresUrl,
            mongoUrl,
          },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  migrationId: migration.migrationId,
                  message: `Migration "${name}" created successfully.`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // delete_migration
  mcpServer.tool(
    TOOL_SCHEMAS.delete_migration.name,
    TOOL_SCHEMAS.delete_migration.description,
    TOOL_SCHEMAS.delete_migration.inputSchema,
    async ({ migrationId }: { migrationId: string }) => {
      try {
        const success = await deleteMigration(migrationId);
        if (!success) {
          return {
            content: [{ type: "text" as const, text: "Migration not found" }],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Migration ${migrationId} deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Create client exec server wrapper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mcpClientExecServer = createClientExecServer(mcpServer as any, "mongrate");

  // Register prompts handler
  mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: Object.values(PROMPT_SCHEMAS) };
  });

  mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name: promptName, arguments: args } = request.params;

    switch (promptName) {
      case "migration_overview": {
        const migrationId = args?.migrationId as string;
        if (!migrationId) {
          return textMessage("Please provide a migrationId argument.");
        }
        const migration = await getMigrationById(migrationId);
        if (!migration) {
          return textMessage(`Migration ${migrationId} not found.`);
        }
        const overview = `# Migration Overview: ${migration.name}

**ID:** ${migration.migrationId}
**Status:** ${migration.status}
**Current Agent:** ${migration.currentAgent || "None"}
**Created:** ${migration.createdAt}

## Configuration
- Repository: ${migration.config.repoUrl}
- Branch: ${migration.config.branch || "main"}

## Plan
${migration.plan ? "Plan available. Use get_migration_plan tool to view." : "No plan yet."}

## Result
${migration.result ? JSON.stringify(migration.result, null, 2) : "No result yet."}
`;
        return textMessage(overview);
      }

      case "analyze_postgres_schema": {
        const migrationId = args?.migrationId as string;
        if (!migrationId) {
          return textMessage("Please provide a migrationId argument.");
        }
        return textMessage(
          `To analyze PostgreSQL schema for migration ${migrationId}, use the browse_files and read_file tools to explore the codebase, then look for:
- Database connection files (db.ts, database.js, etc.)
- Migration files (usually in migrations/ or db/migrations/)
- Models or schema definitions
- SQL queries in the codebase`
        );
      }

      case "list_all_migrations": {
        const migrations = await getAllMigrations();
        const summary = migrations
          .map((m) => `- **${m.name}** (${m.migrationId}): ${m.status}`)
          .join("\n");
        return textMessage(`# All Migrations\n\n${summary || "No migrations found."}`);
      }

      case "migration_help": {
        const topic = args?.topic as string;
        const helpText = getMigrationHelp(topic);
        return textMessage(helpText);
      }

      default:
        throw new Error(`Unknown prompt: ${promptName}`);
    }
  });

  return mcpClientExecServer;
}

function getMigrationHelp(topic?: string): string {
  const topics: Record<string, string> = {
    schema: `# Schema Migration Help

When migrating from PostgreSQL to MongoDB:

1. **Tables → Collections**: Each table typically becomes a collection
2. **Rows → Documents**: Each row becomes a document
3. **Foreign Keys → Embedded or Referenced**:
   - Embed data for 1:1 or 1:few relationships
   - Reference for 1:many or many:many relationships
4. **Joins → Aggregation Pipeline**: Use $lookup for joins`,

    indexes: `# Index Migration Help

PostgreSQL to MongoDB index mapping:
- B-tree indexes → Regular indexes
- Unique constraints → Unique indexes
- Composite indexes → Compound indexes
- Text search → Text indexes
- GIN indexes → Array or text indexes`,

    queries: `# Query Migration Help

Common query patterns:
- SELECT → find()
- INSERT → insertOne/insertMany()
- UPDATE → updateOne/updateMany()
- DELETE → deleteOne/deleteMany()
- JOIN → $lookup in aggregation
- GROUP BY → $group in aggregation`,

    "data-types": `# Data Type Migration Help

PostgreSQL to MongoDB type mapping:
- INTEGER → NumberInt
- BIGINT → NumberLong
- VARCHAR/TEXT → String
- BOOLEAN → Boolean
- TIMESTAMP → Date
- JSON/JSONB → Object/Array
- ARRAY → Array
- UUID → String or Binary`,
  };

  if (topic && topics[topic]) {
    return topics[topic];
  }

  return `# PostgreSQL to MongoDB Migration Help

Available topics:
- **schema**: Table to collection mapping
- **indexes**: Index migration strategies
- **queries**: Query pattern conversion
- **data-types**: Type mapping reference

Use migration_help prompt with a topic argument for details.`;
}
