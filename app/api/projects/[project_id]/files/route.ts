import { getProjectById } from "@/lib/db/projects";
import { listDirectory, readFile, writeFile } from "@/lib/services/file-browser";
import { PROJECTS_DIR } from "@/lib/config/constants";
import path from "path";

interface RouteContext {
  params: Promise<{ project_id: string }>;
}

// GET - List files or read file content
export async function GET(request: Request, { params }: RouteContext) {
  const { project_id } = await params;
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path") || ".";
  const action = searchParams.get("action") || "list";

  try {
    const project = await getProjectById(project_id);
    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const projectPath = path.join(process.cwd(), PROJECTS_DIR, project_id);

    if (action === "read") {
      const content = await readFile(projectPath, filePath);
      return new Response(
        JSON.stringify({ success: true, data: { path: filePath, content } }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Default: list directory
    const entries = await listDirectory(projectPath, filePath);
    return new Response(
      JSON.stringify({ success: true, data: entries }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Files API] GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to access files" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST - Write file content
export async function POST(request: Request, { params }: RouteContext) {
  const { project_id } = await params;

  try {
    const project = await getProjectById(project_id);
    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || typeof content !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Path and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const projectPath = path.join(process.cwd(), PROJECTS_DIR, project_id);
    await writeFile(projectPath, filePath, content);

    return new Response(
      JSON.stringify({ success: true, message: "File saved" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Files API] POST error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to save file" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
