// Message rendering utilities for AI SDK chat messages

import { ToolCard } from "@/components/migration/ToolCard";
import type { UIMessagePart, UITool } from "ai";
import type { ProviderAgentDynamicToolInput } from "@mcpc-tech/acp-ai-provider";
import { Bot, User, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// Type guard for tool parts
function isToolPart(part: unknown): part is Record<string, unknown> & {
  type: string;
  state: string;
} {
  const p = part as Record<string, unknown>;
  return typeof p.type === "string" && p.type.startsWith("tool-") && "state" in p;
}

// Normalize tool names (strip prefixes/namespaces)
function normalizeToolName(rawName: string): string {
  let name = rawName;
  name = name.replace(/^tool-/, "");
  name = name.replace(/^mcp__/, "");
  name = name.replace(/(^|__|\/)(acp[-_]?ai[-_]?sdk[-_]?tools)(?=__|\/|$)/g, "$1");
  name = name.replace(/^__+/, "").replace(/__+$/, "");
  name = name.replace(/__{3,}/g, "__");
  return name || rawName;
}

// Reasoning/Thinking component
function ReasoningBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-[var(--glass-border-subtle)] bg-[var(--glass-dark)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--glass-medium)] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Thinking{isStreaming ? "..." : ""}</span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 border-t border-[var(--glass-border-subtle)] text-sm text-[var(--text-tertiary)] whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}

// Plan display component
function PlanBlock({ plan, isStreaming }: { plan: Array<Record<string, unknown>>; isStreaming: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-2 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--glass-dark)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--accent-cyan)] hover:bg-[var(--glass-medium)] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Agent Plan{isStreaming ? " (updating...)" : ""}</span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 border-t border-[var(--accent-cyan)]/20">
          <ul className="space-y-2">
            {plan.map((item, i) => {
              const content = (item.content as string) || JSON.stringify(item);
              const priority = item.priority as string | undefined;
              const status = item.status as string | undefined;

              return (
                <li
                  key={`plan-${i}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div
                      className={`text-sm ${
                        status === "done"
                          ? "line-through text-[var(--text-tertiary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {content}
                    </div>
                    {priority && (
                      <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                        Priority: {priority}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full font-medium text-[10px] uppercase tracking-wide ${
                        status === "pending"
                          ? "bg-[var(--glass-medium)] text-[var(--text-tertiary)]"
                          : status === "done"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                      }`}
                    >
                      {status ?? "pending"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Main message part renderer
export function renderMessagePart(
  part: UIMessagePart<Record<string, unknown>, Record<string, UITool>>,
  messageId: string,
  index: number,
  isStreaming: boolean,
  metadata?: Record<string, unknown>
): React.ReactNode {
  // Render text content
  if (part.type === "text" && part.text) {
    return (
      <div key={`${messageId}-${index}`} className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
        {part.text as string}
      </div>
    );
  }

  // Render reasoning/thinking process
  if (part.type === "reasoning") {
    return (
      <ReasoningBlock
        key={`${messageId}-${index}`}
        text={part.text as string}
        isStreaming={isStreaming}
      />
    );
  }

  // Render plan from message metadata (only on first part)
  const plan = metadata?.plan as Array<Record<string, unknown>> | undefined;
  if (plan && index === 0) {
    return (
      <PlanBlock
        key={`${messageId}-plan`}
        plan={plan}
        isStreaming={isStreaming}
      />
    );
  }

  // Handle tool calls with type starting with "tool-"
  if (isToolPart(part)) {
    const toolInput = part.input as ProviderAgentDynamicToolInput | undefined;

    // Guard clause: skip rendering if input or toolName is missing
    if (!toolInput || !toolInput.toolName) {
      return null;
    }

    const normalizedToolName = normalizeToolName(toolInput.toolName);
    const toolState = part.state as
      | "input-streaming"
      | "input-available"
      | "output-available"
      | "output-error";

    // Map AI SDK state to ToolCard status
    const status = toolState === "output-available"
      ? "completed"
      : toolState === "output-error"
      ? "failed"
      : "running";

    return (
      <div key={`${messageId}-${index}`} className="my-2">
        <ToolCard
          id={`${messageId}-tool-${index}`}
          name={normalizedToolName}
          args={toolInput.args as Record<string, unknown>}
          status={status}
          output={part.output ? JSON.stringify(part.output, null, 2).slice(0, 500) : undefined}
          error={part.errorText as string | undefined}
        />
      </div>
    );
  }

  return null;
}

// Message wrapper component for user/assistant messages
export function MessageWrapper({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-[var(--accent-purple)] text-white">
          {children}
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--glass-medium)] flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--glass-frosted)] border border-[var(--glass-border-subtle)]">
        {children}
      </div>
    </div>
  );
}
