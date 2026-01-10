'use client';

import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Counter App</h1>

      <div className="flex flex-col items-center gap-6 mt-8">
        <div className="text-6xl font-bold">
          {count}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setCount(count - 1)}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Decrement
          </button>

          <button
            onClick={() => setCount(count + 1)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
          >
            Increment
          </button>
        </div>

        <button
          onClick={() => setCount(0)}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Reset
        </button>
      </div>
    </main>
  );
}
