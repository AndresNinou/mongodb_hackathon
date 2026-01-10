import { getProjectsCollection } from "./collections";
import type { Project, ProjectCreate, ProjectUpdate, ProjectResponse } from "@/types";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { scaffoldNextApp } from "@/lib/services/scaffold";

const PROJECTS_DIR = process.env.PROJECTS_DIR || "./data/projects";

function toResponse(project: Project): ProjectResponse {
  return {
    id: project._id.toString(),
    projectId: project.projectId,
    name: project.name,
    description: project.description,
    status: project.status,
    previewUrl: project.previewUrl,
    previewPort: project.previewPort,
    initialPrompt: project.initialPrompt,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    lastActiveAt: project.lastActiveAt.toISOString(),
  };
}

export async function getAllProjects(): Promise<ProjectResponse[]> {
  const collection = await getProjectsCollection();
  const projects = await collection
    .find({})
    .sort({ lastActiveAt: -1 })
    .toArray();
  return projects.map(toResponse);
}

export async function getProjectById(projectId: string): Promise<ProjectResponse | null> {
  const collection = await getProjectsCollection();
  const project = await collection.findOne({ projectId });
  return project ? toResponse(project) : null;
}

export async function createProject(data: ProjectCreate): Promise<ProjectResponse> {
  const collection = await getProjectsCollection();
  const now = new Date();

  const projectId = data.projectId || `project-${randomUUID().slice(0, 8)}`;
  const projectPath = path.join(process.cwd(), PROJECTS_DIR, projectId);

  // Create project directory and scaffold Next.js app
  await fs.mkdir(projectPath, { recursive: true });
  await scaffoldNextApp(projectPath, data.name);

  const project: Omit<Project, "_id"> = {
    projectId,
    name: data.name,
    description: data.description,
    status: "idle",
    repoPath: projectPath,
    initialPrompt: data.initialPrompt,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  };

  const result = await collection.insertOne(project as Project);

  return toResponse({
    ...project,
    _id: result.insertedId,
  } as Project);
}

export async function updateProject(
  projectId: string,
  data: ProjectUpdate
): Promise<ProjectResponse | null> {
  const collection = await getProjectsCollection();
  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { projectId },
    {
      $set: {
        ...data,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  return result ? toResponse(result) : null;
}

export async function updateProjectActivity(projectId: string): Promise<void> {
  const collection = await getProjectsCollection();
  await collection.updateOne(
    { projectId },
    { $set: { lastActiveAt: new Date(), updatedAt: new Date() } }
  );
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const collection = await getProjectsCollection();

  // Get project to find directory
  const project = await collection.findOne({ projectId });
  if (!project) {
    return false;
  }

  // Delete from database
  const result = await collection.deleteOne({ projectId });

  // Try to delete project directory
  if (project.repoPath) {
    try {
      await fs.rm(project.repoPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[Projects] Failed to delete directory: ${project.repoPath}`, error);
    }
  }

  return result.deletedCount > 0;
}

export async function getProjectPath(projectId: string): Promise<string | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const projectPath = path.join(process.cwd(), PROJECTS_DIR, projectId);
  return projectPath;
}
