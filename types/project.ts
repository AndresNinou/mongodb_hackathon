import { ObjectId } from "mongodb";

export interface Project {
  _id: ObjectId;
  projectId: string;
  name: string;
  description?: string;
  status: "idle" | "running" | "stopped" | "error";
  previewUrl?: string;
  previewPort?: number;
  repoPath?: string;
  initialPrompt?: string;
  activeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface ProjectCreate {
  projectId?: string;
  name: string;
  description?: string;
  initialPrompt?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: Project["status"];
  previewUrl?: string;
  previewPort?: number;
  activeSessionId?: string;
}

export interface Message {
  _id: ObjectId;
  projectId: string;
  role: "user" | "assistant" | "system" | "tool";
  messageType: "chat" | "thinking" | "tool_use" | "tool_result" | "error";
  content: string;
  metadata?: Record<string, unknown>;
  parentMessageId?: string;
  sessionId?: string;
  conversationId?: string;
  requestId?: string;
  createdAt: Date;
}

export interface MessageCreate {
  projectId: string;
  role: Message["role"];
  messageType: Message["messageType"];
  content: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  sessionId?: string;
}

// API response types
export interface ProjectResponse {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: Project["status"];
  previewUrl?: string;
  previewPort?: number;
  initialPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}
