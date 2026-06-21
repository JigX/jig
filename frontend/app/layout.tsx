import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { I18nProvider } from "@/lib/i18n";
import enMessages from "../messages/en.json";

export const metadata: Metadata = {
  title: "JIG — AI Governance Platform",
  description: "AI-driven compliance for APIs, SSH and MCP tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <I18nProvider defaultMessages={enMessages}>
          <QueryProvider>{children}</QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
