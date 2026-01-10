import { NextResponse } from "next/server";
import {
  getMigrationById,
  updateMigration,
  addMigrationLog,
} from "@/lib/db/migrations";
import { runExecutionAgent } from "@/lib/services/migration/orchestrator";

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

    // Check status - must have a plan ready
    if (migration.status !== "plan_ready") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot execute. Current status: ${migration.status}. Need status: plan_ready`,
        },
        { status: 400 }
      );
    }

    if (!migration.plan) {
      return NextResponse.json(
        { success: false, error: "No plan found. Run planning agent first." },
        { status: 400 }
      );
    }

    // Run execution agent (non-blocking, returns immediately)
    runExecutionAgent(id).catch((error) => {
      console.error("[Execute API] Execution agent error:", error);
      addMigrationLog(id, {
        agent: 2,
        level: "error",
        message: `Unexpected error: ${error.message}`,
      });
      updateMigration(id, { status: "failed", currentAgent: null });
    });

    return NextResponse.json({
      success: true,
      message: "Execution started",
      data: { migrationId: id, status: "executing" },
    });
  } catch (error) {
    console.error("[Execute API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start execution",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
