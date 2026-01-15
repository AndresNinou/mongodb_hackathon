import { ObjectId } from "mongodb";

export type MigrationStatus =
  | "pending"
  | "cloning"
  | "planning"
  | "plan_ready"
  | "executing"
  | "completed"
  | "failed";

export interface SupabaseConfig {
  url: string;
  projectId: string;
  anonKey: string;
}

export interface MigrationConfig {
  repoUrl: string;
  branch?: string;
  postgresUrl?: string; // Legacy, kept for backward compatibility
  supabase?: SupabaseConfig; // New Supabase configuration
  mongoUrl: string;
  githubToken?: string;
}

export interface MigrationLog {
  timestamp: Date;
  agent: 1 | 2 | null;
  level: "info" | "warn" | "error";
  message: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: 1 | 2 | null;
  tools?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    output?: string;
  }>;
}

export interface MigrationResult {
  prUrl?: string;
  prNumber?: number;
  filesChanged?: number;
  collectionsCreated?: number;
  rowsMigrated?: number;
  summary?: string;
}

// Stream event types for real-time agent UI
export type StreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; success: boolean; output?: string; error?: string }
  | { type: "status"; status: MigrationStatus; agent: 1 | 2 | null }
  | { type: "log"; level: string; message: string; agent: number | null }
  | { type: "user_message"; content: string }
  | { type: "agent_message"; content: string };

export interface Migration {
  _id: ObjectId;
  migrationId: string;
  name: string;
  config: MigrationConfig;
  plan?: Record<string, unknown>;
  status: MigrationStatus;
  currentAgent: 1 | 2 | null;
  result?: MigrationResult;
  logs: MigrationLog[];
  chatMessages?: ChatMessage[]; // Persisted chat history
  repoPath?: string;
  sessionId?: string; // ACP session ID for interactive chat
  createdAt: Date;
  updatedAt: Date;
}

export interface MigrationCreate {
  name: string;
  config: MigrationConfig;
}

export interface MigrationUpdate {
  name?: string;
  status?: MigrationStatus;
  currentAgent?: 1 | 2 | null;
  plan?: Record<string, unknown>;
  result?: MigrationResult;
  repoPath?: string;
  sessionId?: string;
}

export interface MigrationResponse {
  id: string;
  migrationId: string;
  name: string;
  config: Omit<MigrationConfig, "postgresUrl" | "githubToken"> & {
    postgresUrl?: string;
    githubToken?: boolean;
  };
  plan?: Record<string, unknown>;
  status: MigrationStatus;
  currentAgent: 1 | 2 | null;
  result?: MigrationResult;
  logs: Array<{
    timestamp: string;
    agent: 1 | 2 | null;
    level: "info" | "warn" | "error";
    message: string;
  }>;
  repoPath?: string;
  createdAt: string;
  updatedAt: string;
}
