"use client";

import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className="glass-card group hover:scale-[1.01] cursor-pointer animate-fade-in">
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id)}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-lg border-2 transition-all duration-200",
            "flex items-center justify-center",
            todo.completed
              ? "bg-gradient-to-br from-purple-500 to-pink-500 border-transparent"
              : "border-purple-300 dark:border-purple-600 hover:border-purple-500"
          )}
        >
          {todo.completed && <Check className="w-4 h-4 text-white" />}
        </button>

        {/* Todo Text */}
        <button
          onClick={() => onToggle(todo.id)}
          className={cn(
            "flex-1 text-left transition-all duration-200",
            todo.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          )}
        >
          {todo.text}
        </button>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(todo.id)}
          className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-all duration-200",
            "text-muted-foreground hover:text-red-500",
            "hover:bg-red-500/10",
            "opacity-0 group-hover:opacity-100"
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
