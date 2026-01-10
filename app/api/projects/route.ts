import { getAllProjects, createProject } from "@/lib/db/projects";
import type { ProjectCreate } from "@/types";

export async function GET() {
  try {
    const projects = await getAllProjects();
    return new Response(JSON.stringify({ success: true, data: projects }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Projects API] GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch projects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Project name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const projectData: ProjectCreate = {
      projectId: body.projectId,
      name: body.name.trim(),
      description: body.description?.trim(),
      initialPrompt: body.initialPrompt?.trim(),
    };

    const project = await createProject(projectData);

    return new Response(
      JSON.stringify({ success: true, data: project }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Projects API] POST error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to create project" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
