import fs from "fs/promises";
import path from "path";

export async function scaffoldNextApp(projectPath: string, projectName: string): Promise<void> {
  // Create basic Next.js structure
  await fs.mkdir(path.join(projectPath, "app"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "public"), { recursive: true });

  // package.json
  const packageJson = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      next: "^15.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    },
    devDependencies: {
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      typescript: "^5",
      tailwindcss: "^3.4.0",
      postcss: "^8",
      autoprefixer: "^10",
    },
  };
  await fs.writeFile(
    path.join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: {
        "@/*": ["./*"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };
  await fs.writeFile(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2)
  );

  // next.config.ts
  const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
`;
  await fs.writeFile(path.join(projectPath, "next.config.ts"), nextConfig);

  // tailwind.config.ts
  const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;
  await fs.writeFile(path.join(projectPath, "tailwind.config.ts"), tailwindConfig);

  // postcss.config.mjs
  const postcssConfig = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`;
  await fs.writeFile(path.join(projectPath, "postcss.config.mjs"), postcssConfig);

  // app/globals.css
  const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: system-ui, sans-serif;
}
`;
  await fs.writeFile(path.join(projectPath, "app", "globals.css"), globalsCss);

  // app/layout.tsx
  const layoutTsx = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Created with PG2Mongo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  await fs.writeFile(path.join(projectPath, "app", "layout.tsx"), layoutTsx);

  // app/page.tsx
  const pageTsx = `export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">${projectName}</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Your project is ready. Start building!
      </p>
    </main>
  );
}
`;
  await fs.writeFile(path.join(projectPath, "app", "page.tsx"), pageTsx);

  // .gitignore
  const gitignore = `# dependencies
node_modules
.pnpm-store

# next.js
.next/
out/

# production
build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts
`;
  await fs.writeFile(path.join(projectPath, ".gitignore"), gitignore);

  console.log(`[Scaffold] Created Next.js project at ${projectPath}`);
}
