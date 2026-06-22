"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/i18n";
import { ClipboardList, CheckCircle, XCircle, HelpCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface AuditEntry {
  id: string;
  timestamp: string;
  connector_name: string;
  capability_name: string;
  actor: string;
  decision: "allow" | "confirm" | "deny";
  outcome: "executed" | "blocked" | "pending";
}

const OUTCOME_CONFIG = {
  executed: { icon: CheckCircle, color: "text-emerald-400", label: "Executed" },
  blocked:  { icon: XCircle,     color: "text-red-400",     label: "Blocked" },
  pending:  { icon: HelpCircle,  color: "text-amber-400",   label: "Pending" },
};

async function fetchAuditLog(): Promise<AuditEntry[]> {
  const { data } = await api.get("/audit/");
  return data;
}

export default function AuditPage() {
  const t = useTranslations("audit");

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["audit"],
    queryFn: fetchAuditLog,
    retry: 1,
    refetchInterval: 30_000,
  });

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            Loading...
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-sm text-red-400">
            Failed to load audit log. Please refresh.
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="font-semibold text-white mb-1">{t("empty.title")}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("empty.subtitle")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="px-6 py-3 text-left">{t("table.time")}</th>
                <th className="px-6 py-3 text-left">{t("table.connector")}</th>
                <th className="px-6 py-3 text-left">{t("table.capability")}</th>
                <th className="px-6 py-3 text-left">{t("table.actor")}</th>
                <th className="px-6 py-3 text-left">{t("table.outcome")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const cfg = OUTCOME_CONFIG[e.outcome] ?? OUTCOME_CONFIG.pending;
                const OutIcon = cfg.icon;
                return (
                  <tr
                    key={e.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-6 py-3 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-white">{e.connector_name}</td>
                    <td className="px-6 py-3 text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                      {e.capability_name}
                    </td>
                    <td className="px-6 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{e.actor}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${cfg.color}`}>
                        <OutIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
