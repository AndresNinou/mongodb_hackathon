"use client";

import { useState, useEffect } from "react";
import { Plus, ListTodo } from "lucide-react";
import { TodoItem } from "./TodoItem";
import { GlassContainer } from "@/components/layout/GlassContainer";
import type { Todo } from "@/types/todo";

const STORAGE_KEY = "todos";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Load todos from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTodos(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load todos:", error);
      }
    }
  }, []);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }
  }, [todos, isMounted]);

  const addTodo = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setInputValue("");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  const remainingCount = todos.filter((todo) => !todo.completed).length;

  if (!isMounted) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with count */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
          <ListTodo className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">My Todos</span>
        </h1>
        <p className="text-muted-foreground">
          {remainingCount === 0
            ? "All done! Great job!"
            : `${remainingCount} ${
                remainingCount === 1 ? "task" : "tasks"
              } remaining`}
        </p>
      </div>

      {/* Input Section */}
      <GlassContainer variant="prismatic">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a new todo..."
            className="input-glass flex-1"
          />
          <button
            onClick={addTodo}
            disabled={!inputValue.trim()}
            className="btn-gradient px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </GlassContainer>

      {/* Todos List */}
      {todos.length === 0 ? (
        <GlassContainer className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
            <ListTodo className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No todos yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first task to get started
          </p>
        </GlassContainer>
      ) : (
        <div className="space-y-3">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {todos.length > 0 && (
        <GlassContainer>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {todos.length}
              </span>{" "}
              total {todos.length === 1 ? "task" : "tasks"}
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {todos.filter((t) => t.completed).length}
              </span>{" "}
              completed
            </div>
          </div>
        </GlassContainer>
      )}
    </div>
  );
}
