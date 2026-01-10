import { getProjectById, updateProject, deleteProject } from "@/lib/db/projects";
import { deleteMessagesByProjectId } from "@/lib/db/messages";
import type { ProjectUpdate } from "@/types";

interface RouteContext {
  params: Promise<{ project_id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { project_id } = await params;

  try {
    const project = await getProjectById(project_id);

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: project }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Project API] GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { project_id } = await params;

  try {
    const body = await request.json();

    const updateData: ProjectUpdate = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim();
    if (body.status !== undefined) updateData.status = body.status;

    const project = await updateProject(project_id, updateData);

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: project }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Project API] PUT error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to update project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { project_id } = await params;

  try {
    // Delete messages first
    await deleteMessagesByProjectId(project_id);

    // Delete project
    const deleted = await deleteProject(project_id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Project deleted" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Project API] DELETE error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to delete project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
