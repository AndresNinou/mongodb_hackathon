import { NextResponse } from "next/server";

/**
 * GET /api/config
 * Returns default configuration values for the frontend
 * These are pre-filled in forms but can be edited by the user
 */
export async function GET() {
  // Mask sensitive parts of tokens/URLs for display
  const maskToken = (token: string | undefined) => {
    if (!token) return "";
    if (token.length <= 8) return token;
    return token.slice(0, 4) + "..." + token.slice(-4);
  };

  const defaults = {
    // GitHub - show masked token, full value used on backend
    githubToken: {
      hasDefault: Boolean(process.env.GITHUB_TOKEN),
      masked: maskToken(process.env.GITHUB_TOKEN),
    },

    // MongoDB - show masked URL, full value used on backend
    mongoUrl: {
      hasDefault: Boolean(process.env.MONGODB_URI),
      masked: process.env.MONGODB_URI
        ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@")
        : "",
      database: process.env.MONGODB_DATABASE || "",
    },

    // Supabase - these are public keys, safe to expose
    supabase: {
      hasDefault: Boolean(process.env.SUPABASE_URL),
      url: process.env.SUPABASE_URL || "",
      projectId: process.env.SUPABASE_PROJECT_ID || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
    },
  };

  return NextResponse.json({ defaults });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
