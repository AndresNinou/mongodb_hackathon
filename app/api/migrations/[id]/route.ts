import { NextResponse } from "next/server";
import {
  getMigrationById,
  deleteMigration,
  updateMigration,
} from "@/lib/db/migrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const migration = await getMigrationById(id);

    if (!migration) {
      return NextResponse.json(
        { success: false, error: "Migration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: migration });
  } catch (error) {
    console.error("[Migration API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch migration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = await request.json();
    const migration = await updateMigration(id, body);

    if (!migration) {
      return NextResponse.json(
        { success: false, error: "Migration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: migration });
  } catch (error) {
    console.error("[Migration API] PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update migration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const deleted = await deleteMigration(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Migration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Migration deleted" });
  } catch (error) {
    console.error("[Migration API] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete migration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
