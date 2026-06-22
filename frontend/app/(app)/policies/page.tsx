"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, AlertTriangle, CheckCircle, Ban, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";

interface Policy {
  id: string;
  capability_name: string;
  connector_name: string;
  connector_id: string;
  decision: "allow" | "confirm" | "deny";
  risk_score: number;
}

const DECISION_CONFIG = {
  allow:   { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20", label: "Allow" },
  confirm: { icon: HelpCircle,  color: "text-amber-400",   bg: "bg-amber-900/20",   label: "Confirm" },
  deny:    { icon: Ban,         color: "text-red-400",      bg: "bg-red-900/20",     label: "Deny" },
};

async function fetchPolicies(): Promise<Policy[]> {
  const { data } = await api.get("/policies/");
  return data;
}

export default function PoliciesPage() {
  const t = useTranslations("policies");
  const router = useRouter();

  const { data: policies = [], isLoading, isError } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
    retry: 1,
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            Loading...
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-sm text-red-400">
            Failed to load policies. Please refresh.
          </div>
        ) : policies.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShieldOff className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="font-semibold text-white mb-1">{t("empty.title")}</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{t("empty.subtitle")}</p>
            <button
              onClick={() => router.push("/connectors/new")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-jig-500 hover:bg-jig-400 text-white text-sm font-medium transition-colors"
            >
              {t("empty.action")}
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="px-6 py-3 text-left">{t("table.capability")}</th>
                <th className="px-6 py-3 text-left">{t("table.connector")}</th>
                <th className="px-6 py-3 text-left">{t("table.risk")}</th>
                <th className="px-6 py-3 text-left">{t("table.decision")}</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const cfg = DECISION_CONFIG[p.decision] ?? DECISION_CONFIG.confirm;
                const DecIcon = cfg.icon;
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/connectors/${p.connector_id}`)}
                    className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-white font-mono text-sm">{p.capability_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      {p.connector_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.risk_score >= 7 ? "bg-red-500" : p.risk_score >= 4 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${p.risk_score * 10}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{p.risk_score}/10</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <DecIcon className="w-3 h-3" />
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
