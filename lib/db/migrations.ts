import { getDb } from "./collections";
import type {
  Migration,
  MigrationCreate,
  MigrationUpdate,
  MigrationResponse,
  MigrationLog,
} from "@/types";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || "./data/migrations";

async function getMigrationsCollection() {
  const db = await getDb();
  return db.collection<Migration>("migrations");
}

function maskSensitiveData(
  config: Migration["config"]
): MigrationResponse["config"] {
  return {
    repoUrl: config.repoUrl,
    branch: config.branch,
    mongoUrl: config.mongoUrl,
    // Mask sensitive fields
    postgresUrl: config.postgresUrl ? "***hidden***" : undefined,
    githubToken: !!config.githubToken,
  };
}

function toResponse(migration: Migration): MigrationResponse {
  return {
    id: migration._id.toString(),
    migrationId: migration.migrationId,
    name: migration.name,
    config: maskSensitiveData(migration.config),
    plan: migration.plan,
    status: migration.status,
    currentAgent: migration.currentAgent,
    result: migration.result,
    logs: migration.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    repoPath: migration.repoPath,
    createdAt: migration.createdAt.toISOString(),
    updatedAt: migration.updatedAt.toISOString(),
  };
}

export async function getAllMigrations(): Promise<MigrationResponse[]> {
  const collection = await getMigrationsCollection();
  const migrations = await collection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return migrations.map(toResponse);
}

export async function getMigrationById(
  migrationId: string
): Promise<MigrationResponse | null> {
  const collection = await getMigrationsCollection();
  const migration = await collection.findOne({ migrationId });
  return migration ? toResponse(migration) : null;
}

export async function getMigrationRaw(
  migrationId: string
): Promise<Migration | null> {
  const collection = await getMigrationsCollection();
  return collection.findOne({ migrationId });
}

export async function createMigration(
  data: MigrationCreate
): Promise<MigrationResponse> {
  const collection = await getMigrationsCollection();
  const now = new Date();

  const migrationId = `migration-${randomUUID().slice(0, 8)}`;
  const repoPath = path.join(process.cwd(), MIGRATIONS_DIR, migrationId);

  // Create migration directory
  await fs.mkdir(repoPath, { recursive: true });

  const migration: Omit<Migration, "_id"> = {
    migrationId,
    name: data.name,
    config: data.config,
    status: "pending",
    currentAgent: null,
    logs: [
      {
        timestamp: now,
        agent: null,
        level: "info",
        message: "Migration job created",
      },
    ],
    repoPath,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(migration as Migration);

  return toResponse({
    ...migration,
    _id: result.insertedId,
  } as Migration);
}

export async function updateMigration(
  migrationId: string,
  data: MigrationUpdate
): Promise<MigrationResponse | null> {
  const collection = await getMigrationsCollection();
  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { migrationId },
    {
      $set: {
        ...data,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  return result ? toResponse(result) : null;
}

export async function addMigrationLog(
  migrationId: string,
  log: Omit<MigrationLog, "timestamp">
): Promise<void> {
  const collection = await getMigrationsCollection();
  const now = new Date();

  await collection.updateOne(
    { migrationId },
    {
      $push: {
        logs: {
          ...log,
          timestamp: now,
        },
      },
      $set: { updatedAt: now },
    }
  );
}

export async function deleteMigration(migrationId: string): Promise<boolean> {
  const collection = await getMigrationsCollection();

  // Get migration to find directory
  const migration = await collection.findOne({ migrationId });
  if (!migration) {
    return false;
  }

  // Delete from database
  const result = await collection.deleteOne({ migrationId });

  // Try to delete migration directory
  if (migration.repoPath) {
    try {
      await fs.rm(migration.repoPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `[Migrations] Failed to delete directory: ${migration.repoPath}`,
        error
      );
    }
  }

  return result.deletedCount > 0;
}

export async function getMigrationPath(
  migrationId: string
): Promise<string | null> {
  const migration = await getMigrationById(migrationId);
  if (!migration) return null;
  return migration.repoPath || null;
}

// Ensure indexes for migrations collection
export async function ensureMigrationIndexes(): Promise<void> {
  try {
    const collection = await getMigrationsCollection();

    await collection.createIndex({ migrationId: 1 }, { unique: true });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ createdAt: -1 });

    console.log("[MongoDB] Migration indexes ensured");
  } catch (error) {
    console.error("[MongoDB] Failed to ensure migration indexes:", error);
  }
}
