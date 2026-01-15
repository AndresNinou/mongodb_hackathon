import { NextResponse } from "next/server";
import {
  getAllMigrations,
  createMigration,
} from "@/lib/db/migrations";
import type { MigrationCreate } from "@/types";

export async function GET() {
  try {
    const migrations = await getAllMigrations();
    return NextResponse.json({ success: true, data: migrations });
  } catch (error) {
    console.error("[Migrations API] GET error:", error);
    // Return empty array if MongoDB is unavailable (allows UI to work)
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    if (errorMsg.includes("SSL") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ServerSelection")) {
      console.warn("[Migrations API] MongoDB unavailable, returning empty list");
      return NextResponse.json({ success: true, data: [], dbUnavailable: true });
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch migrations",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Resolve MongoDB URL - use default from env or provided value
    const mongoUrl = body.config?.useDefaultMongo !== false
      ? process.env.MONGODB_URI
      : body.config?.mongoUrl || process.env.MONGODB_URI;

    // Resolve GitHub token - use default from env or provided value
    const githubToken = body.config?.useDefaultGithub !== false
      ? process.env.GITHUB_TOKEN
      : body.config?.githubToken || process.env.GITHUB_TOKEN;

    // Resolve Supabase config - use default from env or provided value
    const supabase = body.config?.useDefaultSupabase !== false
      ? {
          url: process.env.SUPABASE_URL || "",
          projectId: process.env.SUPABASE_PROJECT_ID || "",
          anonKey: process.env.SUPABASE_ANON_KEY || "",
        }
      : body.config?.supabase || {
          url: process.env.SUPABASE_URL || "",
          projectId: process.env.SUPABASE_PROJECT_ID || "",
          anonKey: process.env.SUPABASE_ANON_KEY || "",
        };

    // Validate required fields
    if (!body.name || !body.config?.repoUrl || !mongoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, config.repoUrl, config.mongoUrl (or MONGODB_URI env)",
        },
        { status: 400 }
      );
    }

    const migrationData: MigrationCreate = {
      name: body.name,
      config: {
        repoUrl: body.config.repoUrl,
        branch: body.config.branch || "main",
        supabase: supabase,
        mongoUrl: mongoUrl,
        githubToken: githubToken,
      },
    };

    const migration = await createMigration(migrationData);

    return NextResponse.json(
      { success: true, data: migration },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Migrations API] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create migration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
