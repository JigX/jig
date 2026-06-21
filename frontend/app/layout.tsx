import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import enMessages from "../messages/en.json";

export const metadata: Metadata = {
  title: "JIG — AI Governance Platform",
  description: "AI-driven compliance for APIs, SSH and MCP tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
