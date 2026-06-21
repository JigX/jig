"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import {
  Terminal, Globe, Server, Database, Plug, CheckCircle, Clock,
  AlertTriangle, ChevronLeft, Trash2,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  ssh: Terminal, openapi: Globe, mcp: Server, graphql: Database,
};
const TYPE_COLOR: Record<string, string> = {
  ssh: "bg-amber-900/30 text-amber-400",
  openapi: "bg-blue-900/30 text-blue-400",
  mcp: "bg-jig-600/20 text-jig-300",
  graphql: "bg-pink-900/30 text-pink-400",
};
const STATUS_ICON: Record<string, React.ElementType> = {
  ready: CheckCircle, analyzing: Clock, error: AlertTriangle, pending: Clock,
};
const STATUS_COLOR: Record<string, string> = {
  ready: "text-emerald-400", analyzing: "text-amber-400", error: "text-red-400", pending: "text-slate-400",
};

const FIELD_LABEL: Record<string, string> = {
  host: "Host",
  port: "Port",
  username: "Username",
  auth_method: "Auth method",
  key_secret_ref: "Key secret ref",
  jump_host: "Jump host",
};

async function fetchConnector(id: string): Promise<Connector> {
  const { data } = await api.get(`/connectors/${id}`);
  return data;
}

export default function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const t  = useTranslations("connectors.detail");
  const ts = useTranslations("status");
  const tc = useTranslations("common");

  const { data: connector, isLoading, isError } = useQuery({
    queryKey: ["connectors", id],
    queryFn: () => fetchConnector(id),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/connectors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      router.push("/connectors");
    },
  });

  function handleDelete() {
    if (!window.confirm(t("deleteConfirm"))) return;
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm py-8" style={{ color: "var(--text-muted)" }}>
        <Clock className="w-4 h-4 animate-pulse" />
        {tc("loading")}
      </div>
    );
  }

  if (isError || !connector) {
    return <p className="text-sm text-red-400 py-8">{t("notFound")}</p>;
  }

  const TypeIcon    = TYPE_ICON[connector.type] ?? Plug;
  const StatusIcon  = STATUS_ICON[connector.status] ?? Clock;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm mb-4 transition-colors hover:text-white"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {tc("back")}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{connector.name}</h1>
            {connector.description && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{connector.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${TYPE_COLOR[connector.type] ?? "bg-white/5 text-slate-400"}`}>
              <TypeIcon className="w-3 h-3" />
              {connector.type.toUpperCase()}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-sm ${STATUS_COLOR[connector.status] ?? "text-slate-400"}`}>
              <StatusIcon className="w-4 h-4" />
              {ts(connector.status as "ready" | "analyzing" | "pending" | "error")}
            </span>
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold text-white">{t("config")}</h2>
        </div>
        <dl className="divide-y" style={{ borderColor: "var(--border)" }}>
          {Object.entries(connector.config).map(([k, v]) => (
            <div key={k} className="flex items-center px-5 py-3 gap-4 divide-y" style={{ borderColor: "var(--border)" }}>
              <dt className="w-40 text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {FIELD_LABEL[k] ?? k}
              </dt>
              <dd className="text-sm font-mono text-white break-all">
                {String(v)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Meta */}
      <div className="rounded-xl border mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <dl className="divide-y" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center px-5 py-3 gap-4">
            <dt className="w-40 text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>ID</dt>
            <dd className="text-sm font-mono text-white">{connector.id}</dd>
          </div>
          <div className="flex items-center px-5 py-3 gap-4">
            <dt className="w-40 text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>Added</dt>
            <dd className="text-sm text-white">{new Date(connector.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/50 p-5" style={{ background: "rgba(220,38,38,0.05)" }}>
        <h2 className="text-sm font-semibold text-red-400 mb-3">{t("delete")}</h2>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/80 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleteMutation.isPending ? t("deleting") : t("delete")}
        </button>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-400">{t("deleteError")}</p>
        )}
      </div>
    </div>
  );
}
