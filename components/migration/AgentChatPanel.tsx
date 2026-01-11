"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput } from "./ChatInput";
import { renderMessagePart, MessageWrapper } from "@/lib/utils/messageRenderer";
import { ToolSummary } from "./ToolCard";
import { Markdown } from "@/components/ui/Markdown";
import { MessageCircle, Loader2, Brain, Hammer } from "lucide-react";
import type { UIMessagePart, UITool } from "ai";

// Agent message from SSE stream
interface AgentMessage {
  type: "text" | "tool-call" | "tool-result" | "status" | "error";
  agent: 1 | 2 | null;
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolOutput?: string;
  toolStatus?: "running" | "completed" | "failed";
  status?: string;
}

// Accumulated message for display
interface StreamedMessage {
  id: string;
  agent: 1 | 2 | null;
  text: string;
  tools: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    output?: string;
  }>;
  timestamp: number;
}

// Saved chat message from database
interface SavedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agent?: 1 | 2 | null;
  tools?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    output?: string;
  }>;
}

const AGENT_NAMES: Record<number, { name: string; icon: typeof Brain }> = {
  1: { name: "Planner", icon: Brain },
  2: { name: "Builder", icon: Hammer },
};

interface AgentChatPanelProps {
  migrationId: string;
}

export function AgentChatPanel({
  migrationId,
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [streamedMessages, setStreamedMessages] = useState<StreamedMessage[]>([]);
  const [savedMessages, setSavedMessages] = useState<SavedChatMessage[]>([]);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const currentMessageRef = useRef<StreamedMessage | null>(null);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());

  // Use AI SDK's useChat hook with custom transport
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/migrations/${migrationId}/chat`,
    }),
  });

  // Load saved messages on mount
  useEffect(() => {
    const loadSavedMessages = async () => {
      try {
        const res = await fetch(`/api/migrations/${migrationId}/messages`);
        const data = await res.json();
        if (data.success && data.data) {
          setSavedMessages(data.data);
          // Track saved message IDs to avoid duplicates
          savedMessageIdsRef.current = new Set(data.data.map((m: SavedChatMessage) => m.id));
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadSavedMessages();
  }, [migrationId]);

  // Save message to database
  const saveMessage = useCallback(async (message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    agent?: 1 | 2 | null;
    tools?: StreamedMessage["tools"];
  }) => {
    // Skip if already saved
    if (savedMessageIdsRef.current.has(message.id)) {
      console.log("[Chat] Message already saved:", message.id);
      return;
    }

    console.log("[Chat] Saving message:", message.id, message.role);

    try {
      savedMessageIdsRef.current.add(message.id);
      const response = await fetch(`/api/migrations/${migrationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Chat] Failed to save message:", response.status, errorData);
        savedMessageIdsRef.current.delete(message.id);
      } else {
        console.log("[Chat] Message saved successfully:", message.id);
      }
    } catch (error) {
      console.error("[Chat] Network error saving message:", error);
      savedMessageIdsRef.current.delete(message.id);
    }
  }, [migrationId]);

  // Subscribe to SSE stream for agent messages
  useEffect(() => {
    const eventSource = new EventSource(`/api/migrations/${migrationId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const message: AgentMessage = JSON.parse(event.data);

        // Handle different message types
        if (message.type === "status") {
          if (message.status === "planning" || message.status === "executing") {
            setIsAgentActive(true);
            // Start a new message
            const newMsg: StreamedMessage = {
              id: `agent-${Date.now()}`,
              agent: message.agent,
              text: message.content + "\n\n",
              tools: [],
              timestamp: message.timestamp,
            };
            currentMessageRef.current = newMsg;
            setStreamedMessages(prev => [...prev, newMsg]);
          } else if (message.status === "plan_ready" || message.status === "completed" || message.status === "failed") {
            console.log("[Chat] Received completion status:", message.status);
            setIsAgentActive(false);
            // Finalize current message and save to database
            if (currentMessageRef.current) {
              const finalMsg = currentMessageRef.current;
              const finalText = finalMsg.text + "\n\n" + message.content;
              console.log("[Chat] Finalizing message:", finalMsg.id, "text length:", finalText.length);

              setStreamedMessages(prev =>
                prev.map(m =>
                  m.id === finalMsg.id
                    ? { ...m, text: finalText }
                    : m
                )
              );

              // Save the completed agent message to database
              console.log("[Chat] Calling saveMessage for agent response");
              saveMessage({
                id: finalMsg.id,
                role: "assistant",
                content: finalText,
                agent: finalMsg.agent,
                tools: finalMsg.tools,
              });

              currentMessageRef.current = null;
            } else {
              console.log("[Chat] No currentMessageRef, skipping save");
            }
          }
        } else if (message.type === "text" && currentMessageRef.current) {
          // Append text to current message - update BOTH ref and state
          currentMessageRef.current.text += message.content;
          setStreamedMessages(prev =>
            prev.map(m =>
              m.id === currentMessageRef.current?.id
                ? { ...m, text: m.text + message.content }
                : m
            )
          );
        } else if (message.type === "tool-call" && currentMessageRef.current) {
          // Add tool call - update BOTH ref and state
          const toolId = `tool-${Date.now()}`;
          const newTool = {
            id: toolId,
            name: message.toolName || "unknown",
            args: message.toolArgs || {},
            status: "running" as const,
          };
          currentMessageRef.current.tools.push(newTool);
          setStreamedMessages(prev =>
            prev.map(m =>
              m.id === currentMessageRef.current?.id
                ? { ...m, tools: [...m.tools, newTool] }
                : m
            )
          );
        } else if (message.type === "tool-result" && currentMessageRef.current && message.toolName) {
          // Update tool with result - update BOTH ref and state
          const toolIndex = currentMessageRef.current.tools.findIndex(
            t => t.name === message.toolName && t.status === "running"
          );
          if (toolIndex !== -1) {
            currentMessageRef.current.tools[toolIndex].status = "completed";
            currentMessageRef.current.tools[toolIndex].output = message.toolOutput;
          }
          setStreamedMessages(prev =>
            prev.map(m =>
              m.id === currentMessageRef.current?.id
                ? {
                    ...m,
                    tools: m.tools.map(t =>
                      t.name === message.toolName && t.status === "running"
                        ? { ...t, status: "completed" as const, output: message.toolOutput }
                        : t
                    )
                  }
                : m
            )
          );
        } else if (message.type === "error") {
          setIsAgentActive(false);
          // Add error message
          const errorMsg: StreamedMessage = {
            id: `error-${Date.now()}`,
            agent: message.agent,
            text: `❌ ${message.content}`,
            tools: [],
            timestamp: message.timestamp,
          };
          setStreamedMessages(prev => [...prev, errorMsg]);
          currentMessageRef.current = null;
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      console.log("SSE connection error, will retry...");
    };

    return () => {
      eventSource.close();
    };
  }, [migrationId, saveMessage]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedMessages, savedMessages, scrollToBottom]);

  // Handle send message
  const handleSend = async (message: string) => {
    if (message.trim()) {
      const msgId = `user-${Date.now()}`;
      // Save user message to database
      await saveMessage({
        id: msgId,
        role: "user",
        content: message,
      });
      sendMessage({ text: message });
    }
  };

  // Determine streaming state
  const isStreaming = status === "streaming" || isAgentActive;
  const isSubmitting = status === "submitted";

  // Get contextual message based on state
  const getStatusMessage = () => {
    if (isLoadingHistory) return null;
    if (messages.length > 0 || streamedMessages.length > 0 || savedMessages.length > 0) return null;
    if (error) {
      return {
        title: "Connection Error",
        message: error.message || "Failed to connect to the agent.",
      };
    }
    return {
      title: "Ready to Chat",
      message: "Send a message to start a conversation with the AI agent, or click &quot;Start Planning&quot; to begin.",
    };
  };

  const statusMessage = getStatusMessage();

  // Render saved message from database
  const renderSavedMessage = (msg: SavedChatMessage) => {
    if (msg.role === "user") {
      return (
        <div key={msg.id} className="flex gap-3 justify-end animate-[fadeIn_0.3s_ease-out]">
          <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20 border border-[var(--glass-border-subtle)]">
            <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        </div>
      );
    }

    // Assistant message (agent)
    const agentInfo = msg.agent ? AGENT_NAMES[msg.agent] : null;
    const AgentIcon = agentInfo?.icon || Brain;

    return (
      <div key={msg.id} className="flex gap-3 animate-[fadeIn_0.3s_ease-out]">
        {/* Agent avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${msg.agent === 1
            ? "bg-gradient-to-br from-[var(--accent-cyan)] to-blue-500"
            : "bg-gradient-to-br from-[var(--accent-purple)] to-pink-500"
          }
        `}>
          <AgentIcon className="w-4 h-4 text-white" />
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Agent name */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              text-xs font-medium
              ${msg.agent === 1 ? "text-cyan-400" : "text-purple-400"}
            `}>
              {agentInfo?.name || "Agent"}
            </span>
          </div>

          {/* Text content */}
          <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
            <Markdown content={msg.content} className="text-sm" />

            {/* Tool calls */}
            {msg.tools && msg.tools.length > 0 && (
              <ToolSummary tools={msg.tools} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render agent message bubble
  const renderAgentMessage = (msg: StreamedMessage) => {
    const agentInfo = msg.agent ? AGENT_NAMES[msg.agent] : null;
    const AgentIcon = agentInfo?.icon || Brain;

    return (
      <div key={msg.id} className="flex gap-3 animate-[fadeIn_0.3s_ease-out]">
        {/* Agent avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${msg.agent === 1
            ? "bg-gradient-to-br from-[var(--accent-cyan)] to-blue-500"
            : "bg-gradient-to-br from-[var(--accent-purple)] to-pink-500"
          }
        `}>
          <AgentIcon className="w-4 h-4 text-white" />
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Agent name */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              text-xs font-medium
              ${msg.agent === 1 ? "text-cyan-400" : "text-purple-400"}
            `}>
              {agentInfo?.name || "Agent"}
            </span>
            {isAgentActive && msg.id === currentMessageRef.current?.id && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 animate-pulse">
                Thinking...
              </span>
            )}
          </div>

          {/* Text content */}
          <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
            <Markdown content={msg.text} className="text-sm" />

            {/* Tool calls */}
            {msg.tools.length > 0 && (
              <ToolSummary tools={msg.tools} />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {/* Loading history indicator */}
        {isLoadingHistory && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[var(--accent-cyan)] animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Loading History
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
              Fetching previous messages...
            </p>
          </div>
        )}

        {/* Status message when no messages */}
        {statusMessage && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-cyan)]/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-[var(--accent-cyan)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {statusMessage.title}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
              {statusMessage.message}
            </p>
          </div>
        )}

        {/* Render saved messages from database (history) */}
        {savedMessages.map(renderSavedMessage)}

        {/* Render streamed agent messages (new messages in this session) */}
        {streamedMessages.map(renderAgentMessage)}

        {/* Render chat messages */}
        {messages.map((message) => (
          <MessageWrapper
            key={message.id}
            role={message.role as "user" | "assistant"}
          >
            <div className="space-y-2">
              {message.parts.map((part, index) =>
                renderMessagePart(
                  part as UIMessagePart<Record<string, unknown>, Record<string, UITool>>,
                  message.id,
                  index,
                  isStreaming && index === message.parts.length - 1,
                  message.metadata as Record<string, unknown> | undefined
                )
              )}
            </div>
          </MessageWrapper>
        ))}

        {/* Loading indicator when submitting */}
        {isSubmitting && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                <span>Connecting to agent...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="text-sm text-red-400">
              <strong>Error:</strong> {error.message}
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <ChatInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={false}
        placeholder="Send a message to the agent..."
      />
    </div>
  );
}
