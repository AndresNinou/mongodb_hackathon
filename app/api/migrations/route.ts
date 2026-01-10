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

    // Validate required fields
    if (!body.name || !body.config?.repoUrl || !body.config?.mongoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, config.repoUrl, config.mongoUrl",
        },
        { status: 400 }
      );
    }

    const migrationData: MigrationCreate = {
      name: body.name,
      config: {
        repoUrl: body.config.repoUrl,
        branch: body.config.branch || "main",
        postgresUrl: body.config.postgresUrl,
        mongoUrl: body.config.mongoUrl,
        githubToken: body.config.githubToken,
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
