"use client";

import { Header } from "@/components/layout/Header";
import { TodoList } from "@/components/todo/TodoList";

export default function TodosPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <TodoList />
      </main>

      {/* Footer */}
      <footer className="glass-solid border-t border-white/10 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with Claude Code &middot; Powered by ACP
        </div>
      </footer>
    </div>
  );
}
