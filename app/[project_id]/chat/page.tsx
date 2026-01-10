"use client";

import { useState, useEffect, use } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "@ai-sdk/react";
import { Header } from "@/components/layout/Header";
import { GlassContainer } from "@/components/layout/GlassContainer";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { FileBrowser } from "@/components/project/FileBrowser";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { PreviewControls } from "@/components/preview/PreviewControls";
import { PanelLeft, PanelRight, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface PageProps {
  params: Promise<{ project_id: string }>;
}

type PreviewStatus = "starting" | "running" | "stopped" | "error";

// Separate component that uses the chat hook with initial messages
function ChatPanel({
  projectId,
  initialMessages,
  isFullscreen,
  setIsFullscreen,
  projectName,
}: {
  projectId: string;
  initialMessages: UIMessage[];
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
  projectName?: string;
}) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/chat/${projectId}`,
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  if (isFullscreen) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-2 glass-solid border-b border-white/10">
          <span className="text-sm font-medium px-2">
            {projectName || "Chat"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col glass-solid">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <GlassContainer
      variant="solid"
      className="flex-1 flex flex-col rounded-none p-0 overflow-hidden"
    >
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </GlassContainer>
  );
}

export default function ChatPage({ params }: PageProps) {
  const { project_id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [showFiles, setShowFiles] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("stopped");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat/${project_id}/messages`);
        if (res.ok) {
          const data = await res.json();
          // Convert to UIMessage format
          const uiMessages: UIMessage[] = data.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: msg.content }],
            createdAt: new Date(msg.createdAt),
          }));
          setInitialMessages(uiMessages);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [project_id]);

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${project_id}`);
        const data = await res.json();
        if (data.success) {
          setProject(data.data);
          if (data.data.previewUrl) {
            setPreviewUrl(data.data.previewUrl);
            setPreviewStatus("running");
          }
        }
      } catch (error) {
        console.error("Failed to fetch project:", error);
      }
    };
    fetchProject();
  }, [project_id]);

  // Fetch initial preview status
  useEffect(() => {
    const fetchPreviewStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${project_id}/preview/status`);
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewStatus(data.data.status);
          setPreviewUrl(data.data.url);
        }
      } catch (error) {
        console.error("Failed to fetch preview status:", error);
      }
    };
    fetchPreviewStatus();
  }, [project_id]);

  const handlePreviewStatusChange = (status: PreviewStatus, url?: string) => {
    setPreviewStatus(status);
    if (url) setPreviewUrl(url);
    if (status === "stopped") setPreviewUrl(null);
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
  };

  // Show loading state while fetching history
  if (isLoadingHistory) {
    return (
      <div className="h-screen flex flex-col">
        <Header showBack projectName={project?.name} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading chat history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="h-screen flex flex-col">
        <ChatPanel
          projectId={project_id}
          initialMessages={initialMessages}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          projectName={project?.name}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header showBack projectName={project?.name} />

      <div className="flex-1 flex overflow-hidden">
        {/* File Browser Sidebar */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            showFiles ? "w-64" : "w-0"
          )}
        >
          {showFiles && (
            <GlassContainer
              variant="solid"
              className="h-full rounded-none border-r border-white/10 p-0"
            >
              <FileBrowser
                projectId={project_id}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </GlassContainer>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="glass-solid border-b border-white/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFiles(!showFiles)}
                className={cn("h-8 w-8", showFiles && "bg-muted")}
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(true)}
                className="h-8 w-8"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            <PreviewControls
              projectId={project_id}
              status={previewStatus}
              onStatusChange={handlePreviewStatusChange}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              className={cn("h-8 w-8", showPreview && "bg-muted")}
            >
              <PanelRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Panel */}
            <div
              className={cn(
                "flex flex-col transition-all duration-300",
                showPreview ? "flex-1" : "flex-1"
              )}
            >
              <ChatPanel
                projectId={project_id}
                initialMessages={initialMessages}
                isFullscreen={false}
                setIsFullscreen={setIsFullscreen}
                projectName={project?.name}
              />
            </div>

            {/* Preview Panel */}
            <div
              className={cn(
                "transition-all duration-300 ease-in-out border-l border-white/10",
                showPreview ? "w-1/2" : "w-0"
              )}
            >
              {showPreview && (
                <PreviewFrame url={previewUrl} status={previewStatus} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
