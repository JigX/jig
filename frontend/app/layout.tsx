import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "JIG — AI Governance Platform",
  description: "AI-gedreven compliance voor API's, SSH en MCP tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="flex h-screen overflow-hidden">
        <QueryProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
