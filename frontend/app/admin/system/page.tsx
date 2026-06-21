"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";

async function fetchHealth() {
  const res = await fetch("/api/health");
  return res.json();
}

export default function SystemAdmin() {
  const t = useTranslations("admin.system");
  const tc = useTranslations("common");
  const { data } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });

  const rows = [
    { label: t("version"),    value: data?.version ?? "—" },
    { label: t("aiProvider"), value: "Ollama (llama3.2:3b)" },
    { label: t("database"),   value: "PostgreSQL 17" },
    { label: "Status",        value: data?.status ?? "—" },
  ];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
        <Activity className="w-5 h-5 text-jig-400" />
        <h2 className="font-semibold text-white">{t("title")}</h2>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-6 py-4">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-sm font-mono text-white">{value}</span>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tc("version")}</p>
      </div>
    </div>
  );
}
