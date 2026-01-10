"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ToolCard } from "./ToolCard";
import { User, Bot } from "lucide-react";
import type { StreamEvent, MigrationStatus } from "@/types";

interface ChatMessage {
  id: string;
  type: "user" | "agent" | "text" | "tool";
  content?: string;
  toolData?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    output?: string;
    error?: string;
  };
}

interface AgentChatPanelProps {
  migrationId: string;
  onStatusChange?: (status: MigrationStatus, agent: 1 | 2 | null) => void;
}

export function AgentChatPanel({
  migrationId,
  onStatusChange,
}: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<Map<string, ChatMessage>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Process stream events
  const processEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "text":
          // Append text to current streaming text
          setCurrentText((prev) => prev + event.content);
          break;

        case "tool_start":
          // Add a new tool card
          const toolMessage: ChatMessage = {
            id: event.id,
            type: "tool",
            toolData: {
              id: event.id,
              name: event.name,
              args: event.args,
              status: "running",
            },
          };
          toolsRef.current.set(event.id, toolMessage);
          setMessages((prev) => [...prev, toolMessage]);
          break;

        case "tool_result":
          // Update existing tool card
          const existingTool = toolsRef.current.get(event.id);
          if (existingTool && existingTool.toolData) {
            existingTool.toolData.status = event.success ? "completed" : "failed";
            existingTool.toolData.output = event.output;
            existingTool.toolData.error = event.error;
            setMessages((prev) =>
              prev.map((m) => (m.id === event.id ? { ...existingTool } : m))
            );
          }
          break;

        case "user_message":
          // Finalize any pending text before user message
          setCurrentText((prev) => {
            if (prev.trim()) {
              const textMessage: ChatMessage = {
                id: `text-${Date.now()}`,
                type: "text",
                content: prev,
              };
              setMessages((msgs) => [...msgs, textMessage]);
            }
            return "";
          });

          // Add user message
          const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            type: "user",
            content: event.content,
          };
          setMessages((prev) => [...prev, userMessage]);
          break;

        case "agent_message":
          // Finalize agent message (complete response)
          // This comes after streaming is done, so we don't need to do anything
          // as the text has already been streamed
          break;

        case "status":
          onStatusChange?.(event.status, event.agent);
          break;

        case "log":
          // Could display logs in a separate area or inline
          break;
      }

      setTimeout(scrollToBottom, 50);
    },
    [onStatusChange, scrollToBottom]
  );

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/migrations/${migrationId}/stream`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Handle init event (initial state)
        if (data.type === "init") {
          onStatusChange?.(data.status, data.currentAgent);
          return;
        }

        // Handle done event
        if (data.type === "done") {
          // Finalize any pending text
          setCurrentText((prev) => {
            if (prev.trim()) {
              const textMessage: ChatMessage = {
                id: `text-${Date.now()}`,
                type: "text",
                content: prev,
              };
              setMessages((msgs) => [...msgs, textMessage]);
            }
            return "";
          });
          return;
        }

        // Process stream event
        processEvent(data as StreamEvent);
      } catch (error) {
        console.error("[AgentChatPanel] Parse error:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [migrationId, processEvent, onStatusChange]);

  // Periodically flush current text to a message
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText((prev) => {
        if (prev.trim() && prev.length > 50) {
          // If we have substantial text, convert to message
          const textMessage: ChatMessage = {
            id: `text-${Date.now()}`,
            type: "text",
            content: prev,
          };
          setMessages((msgs) => [...msgs, textMessage]);
          return "";
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
    >
      {/* Connection status indicator */}
      {!isConnected && messages.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span>Connecting to agent...</span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => {
        if (message.type === "user") {
          return (
            <div key={message.id} className="flex gap-3 justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-[var(--accent-purple)] text-white">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--glass-medium)] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            </div>
          );
        }

        if (message.type === "text" || message.type === "agent") {
          return (
            <div key={message.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)] stream-chunk">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          );
        }

        if (message.type === "tool" && message.toolData) {
          return (
            <div key={message.id} className="ml-11">
              <ToolCard {...message.toolData} />
            </div>
          );
        }

        return null;
      })}

      {/* Streaming text (currently being typed) */}
      {currentText && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {currentText}
              <span className="inline-block w-2 h-4 bg-[var(--accent-cyan)] ml-1 animate-pulse" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
