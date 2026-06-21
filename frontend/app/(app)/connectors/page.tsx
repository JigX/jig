"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Plug, Plus, CheckCircle, Clock, AlertTriangle, Terminal, Globe, Database, Server } from "lucide-react";
import { api } from "@/lib/api";

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  ssh: Terminal,
  openapi: Globe,
  database: Database,
  mcp: Server,
  graphql: Globe,
};

const TYPE_COLOR: Record<string, string> = {
  ssh:      "bg-amber-900/30 text-amber-400",
  openapi:  "bg-blue-900/30 text-blue-400",
  database: "bg-purple-900/30 text-purple-400",
  mcp:      "bg-jig-600/20 text-jig-300",
  graphql:  "bg-pink-900/30 text-pink-400",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  ready: CheckCircle, analyzing: Clock, error: AlertTriangle, pending: Clock,
};
const STATUS_COLOR: Record<string, string> = {
  ready: "text-emerald-400", analyzing: "text-amber-400", error: "text-red-400", pending: "text-slate-400",
};

async function fetchConnectors(): Promise<Connector[]> {
  const { data } = await api.get("/connectors/");
  return data;
}

export default function ConnectorsPage() {
  const t = useTranslations("connectors");
  const ts = useTranslations("status");
  const router = useRouter();

  const { data: connectors = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["connectors"],
    queryFn: fetchConnectors,
    retry: 1,
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
        </div>
        <button
          onClick={() => router.push("/connectors/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jig-500 hover:bg-jig-400 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("addConnector")}
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            {t("loading")}
          </div>
        ) : isError || connectors.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Plug className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="font-semibold text-white mb-1">{t("empty.title")}</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{t("empty.subtitle")}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/connectors/new")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-jig-500 hover:bg-jig-400 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("addConnector")}
              </button>
              {isError && (
                <button
                  onClick={() => refetch()}
                  className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  {t("retry")}
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="px-6 py-3 text-left">{t("table.name")}</th>
                <th className="px-6 py-3 text-left">{t("table.type")}</th>
                <th className="px-6 py-3 text-left">{t("table.status")}</th>
                <th className="px-6 py-3 text-left">{t("table.added")}</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => {
                const TypeIcon = TYPE_ICON[c.type] ?? Plug;
                const StatusIcon = STATUS_ICON[c.status] ?? Clock;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/connectors/${c.id}`)}
                    className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{c.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${TYPE_COLOR[c.type] ?? "bg-white/5 text-slate-400"}`}>
                        <TypeIcon className="w-3 h-3" />
                        {c.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm ${STATUS_COLOR[c.status] ?? "text-slate-400"}`}>
                        <StatusIcon className="w-4 h-4" />
                        {ts(c.status as "ready" | "analyzing" | "pending" | "error")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(c.created_at).toLocaleDateString()}
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
