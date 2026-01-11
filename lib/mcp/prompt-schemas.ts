/**
 * MCP Prompt Schemas for Mongrate
 *
 * Defines the prompts available via MCP for migration assistance.
 */

export const PROMPT_SCHEMAS = {
  migration_overview: {
    name: "migration_overview",
    title: "Migration Overview",
    description:
      "Get a comprehensive overview of a migration including status, plan summary, and progress.",
    arguments: [
      {
        name: "migrationId",
        description: "The migration ID to get overview for",
        required: true,
      },
    ],
  },

  analyze_postgres_schema: {
    name: "analyze_postgres_schema",
    title: "Analyze PostgreSQL Schema",
    description:
      "Analyze PostgreSQL patterns in the codebase and suggest MongoDB schema mappings.",
    arguments: [
      {
        name: "migrationId",
        description: "The migration ID with cloned repository",
        required: true,
      },
    ],
  },

  list_all_migrations: {
    name: "list_all_migrations",
    title: "List All Migrations",
    description: "Get a summary of all migrations with their current status.",
    arguments: [],
  },

  migration_help: {
    name: "migration_help",
    title: "Migration Help",
    description:
      "Get help and guidance on PostgreSQL to MongoDB migration best practices.",
    arguments: [
      {
        name: "topic",
        description:
          "Specific topic to get help on (e.g., 'schema', 'indexes', 'queries', 'data-types')",
        required: false,
      },
    ],
  },
} as const;

export type PromptName = keyof typeof PROMPT_SCHEMAS;
