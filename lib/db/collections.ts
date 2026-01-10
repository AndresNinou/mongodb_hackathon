import clientPromise from "@/lib/mongodb";
import type { Project, Message, Migration } from "@/types";

const DB_NAME = "pg2mongo";

export async function getDb() {
  const client = await clientPromise;
  if (!client) {
    throw new Error("MongoDB client not available");
  }
  return client.db(DB_NAME);
}

export async function getProjectsCollection() {
  const db = await getDb();
  return db.collection<Project>("projects");
}

export async function getMessagesCollection() {
  const db = await getDb();
  return db.collection<Message>("messages");
}

export async function getMigrationsCollection() {
  const db = await getDb();
  return db.collection<Migration>("migrations");
}

// Ensure indexes exist for optimal query performance
export async function ensureIndexes() {
  try {
    const projects = await getProjectsCollection();
    const messages = await getMessagesCollection();
    const migrations = await getMigrationsCollection();

    // Project indexes
    await projects.createIndex({ projectId: 1 }, { unique: true });
    await projects.createIndex({ lastActiveAt: -1 });
    await projects.createIndex({ createdAt: -1 });

    // Message indexes
    await messages.createIndex({ projectId: 1, createdAt: -1 });
    await messages.createIndex({ requestId: 1 });
    await messages.createIndex({ sessionId: 1 });

    // Migration indexes
    await migrations.createIndex({ migrationId: 1 }, { unique: true });
    await migrations.createIndex({ status: 1 });
    await migrations.createIndex({ createdAt: -1 });

    console.log("[MongoDB] Indexes ensured");
  } catch (error) {
    console.error("[MongoDB] Failed to ensure indexes:", error);
  }
}
