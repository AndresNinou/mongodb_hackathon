import { ObjectId } from "mongodb";

export type MigrationStatus =
  | "pending"
  | "cloning"
  | "planning"
  | "plan_ready"
  | "executing"
  | "completed"
  | "failed";

export interface MigrationConfig {
  repoUrl: string;
  branch?: string;
  postgresUrl?: string;
  mongoUrl: string;
  githubToken?: string;
}

export interface MigrationLog {
  timestamp: Date;
  agent: 1 | 2 | null;
  level: "info" | "warn" | "error";
  message: string;
}

export interface MigrationResult {
  prUrl?: string;
  prNumber?: number;
  filesChanged?: number;
  collectionsCreated?: number;
  rowsMigrated?: number;
  summary?: string;
}

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
  repoPath?: string;
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
