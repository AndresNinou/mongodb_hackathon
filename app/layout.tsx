import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Mongrate - AI-Powered Database Migration",
  description: "PostgreSQL to MongoDB migration powered by AI. Clone, analyze, and transform your database with automated code generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
