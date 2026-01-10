import { getProjectById } from "@/lib/db/projects";
import { previewManager } from "@/lib/services/preview";

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

    const logs = previewManager.getLogs(project_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: logs,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Preview API] Logs error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get preview logs",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
