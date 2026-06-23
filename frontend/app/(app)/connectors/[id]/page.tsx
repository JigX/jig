"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import {
  Terminal, Globe, Server, Database, Plug, CheckCircle, Clock,
  AlertTriangle, ChevronLeft, Trash2, Plus, X, ShieldCheck,
  ShieldAlert, ShieldOff, KeyRound, Eye, EyeOff,
} from "lucide-react";

interface Connector {
  id: string; name: string; description?: string;
  type: string; status: string; auth_mode: string;
  config: Record<string, unknown>;
  created_at: string; updated_at: string;
}

interface MyCredential { has_credential: boolean; updated_at: string | null; }

interface Capability {
  id: string; name: string; description?: string;
  operation_type: string; risk_level: string;
  parameters_schema: Record<string, unknown>;
  policy_id: string | null; policy_tier: string | null;
}

interface Param { name: string; type: string; description: string }

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
  ready: "text-emerald-400", analyzing: "text-amber-400",
  error: "text-red-400", pending: "text-slate-400",
};
const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-400", medium: "text-amber-400",
  high: "text-red-400", critical: "text-red-500",
};
const TIER_ICON: Record<string, React.ElementType> = {
  allow: ShieldCheck, confirm: ShieldAlert, deny: ShieldOff,
};
const TIER_COLOR: Record<string, string> = {
  allow: "text-emerald-400", confirm: "text-amber-400", deny: "text-red-400",
};
const FIELD_LABEL: Record<string, string> = {
  host: "Host", port: "Port", username: "Username",
  auth_method: "Auth method", key_secret_ref: "Key secret ref",
  jump_host: "Jump host", base_url: "Base URL",
  api_key_secret_ref: "API key secret ref", auth_type: "Auth type",
};

const EMPTY_FORM = {
  name: "", description: "", http_method: "POST", http_path: "",
  operation_type: "read", risk_level: "medium", policy_tier: "deny",
};

export default function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const t  = useTranslations("connectors.detail");
  const ts = useTranslations("status");
  const tc = useTranslations("common");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [params, setParams] = useState<Param[]>([]);
  const [credInput, setCredInput] = useState("");
  const [showCred, setShowCred] = useState(false);

  const { data: connector, isLoading, isError } = useQuery<Connector>({
    queryKey: ["connectors", id],
    queryFn: async () => (await api.get(`/connectors/${id}/`)).data,
    retry: false,
  });

  const { data: myCred, refetch: refetchCred } = useQuery<MyCredential>({
    queryKey: ["my-credential", id],
    queryFn: async () => (await api.get(`/connectors/${id}/my-credential/`)).data,
    enabled: !!id,
  });

  const saveCredMutation = useMutation({
    mutationFn: () => api.put(`/connectors/${id}/my-credential/`, { credential: credInput }),
    onSuccess: () => { setCredInput(""); refetchCred(); },
  });

  const deleteCredMutation = useMutation({
    mutationFn: () => api.delete(`/connectors/${id}/my-credential/`),
    onSuccess: () => refetchCred(),
  });

  const setAuthMode = useMutation({
    mutationFn: (mode: string) => api.patch(`/connectors/${id}/auth-mode/`, { auth_mode: mode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors", id] }),
  });

  const { data: capabilities = [] } = useQuery<Capability[]>({
    queryKey: ["capabilities", id],
    queryFn: async () => (await api.get(`/connectors/${id}/capabilities/`)).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/connectors/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["connectors"] }); router.push("/connectors"); },
  });

  const addCapMutation = useMutation({
    mutationFn: () => api.post(`/connectors/${id}/capabilities/`, { ...form, parameters: params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capabilities", id] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setParams([]);
    },
  });

  const deleteCapMutation = useMutation({
    mutationFn: (capId: string) => api.delete(`/connectors/${id}/capabilities/${capId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capabilities", id] }),
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ policyId, tier }: { policyId: string; tier: string }) =>
      api.patch(`/policies/${policyId}/`, { tier }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capabilities", id] }),
  });

  function addParam() { setParams(p => [...p, { name: "", type: "string", description: "" }]); }
  function updateParam(i: number, field: keyof Param, val: string) {
    setParams(p => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }
  function removeParam(i: number) { setParams(p => p.filter((_, idx) => idx !== i)); }

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm py-8" style={{ color: "var(--text-muted)" }}>
      <Clock className="w-4 h-4 animate-pulse" />{tc("loading")}
    </div>
  );
  if (isError || !connector) return <p className="text-sm text-red-400 py-8">{t("notFound")}</p>;

  const TypeIcon   = TYPE_ICON[connector.type] ?? Plug;
  const StatusIcon = STATUS_ICON[connector.status] ?? Clock;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-1 text-sm mb-4 transition-colors hover:text-white"
          style={{ color: "var(--text-muted)" }}>
          <ChevronLeft className="w-4 h-4" />{tc("back")}
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
              <TypeIcon className="w-3 h-3" />{connector.type.toUpperCase()}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-sm ${STATUS_COLOR[connector.status] ?? "text-slate-400"}`}>
              <StatusIcon className="w-4 h-4" />{ts(connector.status as "ready" | "analyzing" | "pending" | "error")}
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
            <div key={k} className="flex items-center px-5 py-3 gap-4" style={{ borderColor: "var(--border)" }}>
              <dt className="w-44 text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {FIELD_LABEL[k] ?? k}
              </dt>
              <dd className="text-sm font-mono text-white break-all">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Auth mode + My credential */}
      <div className="rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-jig-400" />
            <h2 className="text-sm font-semibold text-white">{t("credential.title")}</h2>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-raised)" }}>
            {["global", "per_user"].map(mode => (
              <button key={mode}
                onClick={() => setAuthMode.mutate(mode)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  connector?.auth_mode === mode ? "bg-jig-600 text-white" : "text-slate-400 hover:text-white"
                }`}>
                {mode === "global" ? t("credential.modeGlobal") : t("credential.modePerUser")}
              </button>
            ))}
          </div>
        </div>

        {connector?.auth_mode === "global" ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("credential.globalNote")}
          </p>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {myCred?.has_credential ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">{t("credential.set")}</p>
                  {myCred.updated_at && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {t("credential.updated")} {new Date(myCred.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <button onClick={() => window.confirm(t("credential.deleteConfirm")) && deleteCredMutation.mutate()}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  {t("credential.delete")}
                </button>
              </div>
            ) : (
              <p className="text-sm text-amber-400">{t("credential.notSet")}</p>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showCred ? "text" : "password"}
                  value={credInput}
                  onChange={e => setCredInput(e.target.value)}
                  placeholder={t("credential.placeholder")}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white pr-10"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                />
                <button onClick={() => setShowCred(s => !s)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                  {showCred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => saveCredMutation.mutate()}
                disabled={!credInput || saveCredMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-jig-600 hover:bg-jig-500 disabled:opacity-50 transition-colors"
              >
                {saveCredMutation.isPending ? tc("loading") : tc("save")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div className="rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold text-white">{t("capabilities")}</h2>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
          >
            {showForm ? <><X className="w-3 h-3" />{tc("cancel")}</> : <><Plus className="w-3 h-3" />{t("addCapability")}</>}
          </button>
        </div>

        {/* Add capability form */}
        {showForm && (
          <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("form.name")} *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white font-mono"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  placeholder="documents.search" />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("form.description")}</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  placeholder="Search documents" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>HTTP method</label>
                <select value={form.http_method} onChange={e => setForm(f => ({ ...f, http_method: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {["GET","POST","PUT","PATCH","DELETE"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Path</label>
                <input value={form.http_path} onChange={e => setForm(f => ({ ...f, http_path: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white font-mono"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  placeholder="/api/documents.search" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("form.operationType")}</label>
                <select value={form.operation_type} onChange={e => setForm(f => ({ ...f, operation_type: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {["read","write","delete","admin","execute"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("form.riskLevel")}</label>
                <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {["low","medium","high","critical"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Policy</label>
                <select value={form.policy_tier} onChange={e => setForm(f => ({ ...f, policy_tier: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <option value="allow">allow</option>
                  <option value="confirm">confirm</option>
                  <option value="deny">deny</option>
                </select>
              </div>
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>{t("form.parameters")}</label>
                <button onClick={addParam} className="text-xs flex items-center gap-1 hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
                  <Plus className="w-3 h-3" /> add param
                </button>
              </div>
              {params.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={p.name} onChange={e => updateParam(i, "name", e.target.value)}
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    placeholder="query" />
                  <select value={p.type} onChange={e => updateParam(i, "type", e.target.value)}
                    className="w-24 rounded-lg px-2 py-1.5 text-sm text-white"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {["string","number","boolean"].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input value={p.description} onChange={e => updateParam(i, "description", e.target.value)}
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    placeholder="description" />
                  <button onClick={() => removeParam(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => addCapMutation.mutate()}
                disabled={!form.name || !form.http_path || addCapMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-jig-600 hover:bg-jig-500 disabled:opacity-50 transition-colors"
              >
                {addCapMutation.isPending ? tc("loading") : t("addCapability")}
              </button>
              {addCapMutation.isError && (
                <span className="text-xs text-red-400">{t("form.error")}</span>
              )}
            </div>
          </div>
        )}

        {/* Capabilities table */}
        {capabilities.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {t("noCapabilities")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {[t("table.capability"), t("table.operation"), t("table.risk"), t("table.policy"), ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {capabilities.map(cap => {
                const TierIcon = TIER_ICON[cap.policy_tier ?? "deny"] ?? ShieldOff;
                return (
                  <tr key={cap.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-white text-xs">{cap.name}</p>
                      {cap.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{cap.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{cap.operation_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${RISK_COLOR[cap.risk_level] ?? "text-slate-400"}`}>
                        {cap.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cap.policy_id ? (
                        <select
                          value={cap.policy_tier ?? "deny"}
                          onChange={e => updatePolicyMutation.mutate({ policyId: cap.policy_id!, tier: e.target.value })}
                          className={`text-xs rounded-md px-2 py-1 border-0 font-medium ${TIER_COLOR[cap.policy_tier ?? "deny"]}`}
                          style={{ background: "var(--surface-raised)" }}
                        >
                          <option value="allow">allow</option>
                          <option value="confirm">confirm</option>
                          <option value="deny">deny</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteCapMutation.mutate(cap.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
          onClick={() => window.confirm(t("deleteConfirm")) && deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/80 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleteMutation.isPending ? t("deleting") : t("delete")}
        </button>
        {deleteMutation.isError && <p className="mt-2 text-sm text-red-400">{t("deleteError")}</p>}
      </div>
    </div>
  );
}
