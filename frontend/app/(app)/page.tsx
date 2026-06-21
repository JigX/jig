"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/i18n";
import { Shield, Plug, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { api } from "@/lib/api";

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
}

async function fetchConnectors(): Promise<Connector[]> {
  const { data } = await api.get("/connectors/");
  return data;
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

const STATUS_ICON: Record<string, React.ElementType> = {
  ready: CheckCircle, analyzing: Clock, error: AlertTriangle, pending: Clock,
};
const STATUS_COLOR: Record<string, string> = {
  ready: "text-emerald-400", analyzing: "text-amber-400", error: "text-red-400", pending: "text-slate-400",
};

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const ts = useTranslations("status");
  const { data: connectors = [], isLoading, isError } = useQuery({
    queryKey: ["connectors"],
    queryFn: fetchConnectors,
    retry: false,
  });

  const ready = connectors.filter((c) => c.status === "ready").length;
  const pending = connectors.filter((c) => c.status !== "ready").length;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p style={{ color: "var(--text-muted)" }} className="mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("stats.connectors")} value={connectors.length} icon={Plug}          color="bg-jig-600/20 text-jig-300" />
        <StatCard label={t("stats.active")}      value={ready}             icon={CheckCircle}   color="bg-emerald-900/30 text-emerald-400" />
        <StatCard label={t("stats.pending")}     value={pending}           icon={Clock}         color="bg-amber-900/30 text-amber-400" />
        <StatCard label={t("stats.highRisk")}    value={0}                 icon={AlertTriangle} color="bg-red-900/30 text-red-400" />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold text-white">{t("recentConnectors")}</h2>
          <a href="/connectors" className="text-sm text-jig-400 hover:text-jig-300">{t("viewAll")}</a>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center" style={{ color: "var(--text-muted)" }}>
            <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            {t("loading")}
          </div>
        ) : isError ? (
          <div className="px-6 py-8 text-center text-red-400 text-sm">{t("error")}</div>
        ) : connectors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Plug className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="font-medium text-white mb-1">{t("empty.title")}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("empty.description")}</p>
            <a href="/connectors/new" className="inline-block mt-4 px-4 py-2 rounded-lg bg-jig-600 text-white text-sm hover:bg-jig-500 transition-colors">
              {t("empty.action")}
            </a>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="px-6 py-3 text-left">{t("table.name")}</th>
                <th className="px-6 py-3 text-left">{t("table.type")}</th>
                <th className="px-6 py-3 text-left">{t("table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {connectors.slice(0, 8).map((c) => {
                const Icon = STATUS_ICON[c.status] ?? Clock;
                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => (window.location.href = `/connectors/${c.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-jig-600/10 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-jig-400" />
                        </div>
                        <span className="font-medium text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5" style={{ color: "var(--text-muted)" }}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-sm ${STATUS_COLOR[c.status]}`}>
                        <Icon className="w-4 h-4" />
                        {ts(c.status as "ready" | "analyzing" | "pending" | "error")}
                      </div>
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
