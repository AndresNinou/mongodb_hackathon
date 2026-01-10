import { NextResponse } from "next/server";
import {
  getMigrationById,
  updateMigration,
  addMigrationLog,
} from "@/lib/db/migrations";
import {
  cloneRepository,
  runPlanningAgent,
} from "@/lib/services/migration/orchestrator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const migration = await getMigrationById(id);

    if (!migration) {
      return NextResponse.json(
        { success: false, error: "Migration not found" },
        { status: 404 }
      );
    }

    // Check if already in progress
    if (
      migration.status === "planning" ||
      migration.status === "executing" ||
      migration.status === "cloning"
    ) {
      return NextResponse.json(
        { success: false, error: "Migration already in progress" },
        { status: 400 }
      );
    }

    // Clone repository if not already done
    if (migration.status === "pending") {
      const cloneResult = await cloneRepository(id);
      if (!cloneResult.success) {
        return NextResponse.json(
          { success: false, error: cloneResult.error },
          { status: 500 }
        );
      }
    }

    // Run planning agent (non-blocking, returns immediately)
    // The actual work happens in the background
    runPlanningAgent(id).catch((error) => {
      console.error("[Plan API] Planning agent error:", error);
      addMigrationLog(id, {
        agent: 1,
        level: "error",
        message: `Unexpected error: ${error.message}`,
      });
      updateMigration(id, { status: "failed", currentAgent: null });
    });

    return NextResponse.json({
      success: true,
      message: "Planning started",
      data: { migrationId: id, status: "planning" },
    });
  } catch (error) {
    console.error("[Plan API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start planning",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
