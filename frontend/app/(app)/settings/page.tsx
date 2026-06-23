"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";

interface MCPKey {
  id: string; label: string; key_prefix: string;
  created_at: string; last_used_at: string | null;
}

export default function SettingsPage() {
  const t  = useTranslations("settings");
  const tc = useTranslations("common");
  const { locale, setLocale } = useLocale();
  const qc = useQueryClient();

  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: keys = [] } = useQuery<MCPKey[]>({
    queryKey: ["mcp-keys"],
    queryFn: async () => (await api.get("/mcp-keys/")).data,
  });

  const createKey = useMutation({
    mutationFn: async (label: string) => (await api.post("/mcp-keys/", { label })).data,
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      setNewKeyLabel("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["mcp-keys"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api.delete(`/mcp-keys/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-keys"] }),
  });

  async function copyKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      {/* MCP API Keys */}
      <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-jig-400" />
            <h2 className="text-sm font-semibold text-white">{t("mcp.title")}</h2>
          </div>
          <button
            onClick={() => { setShowForm(s => !s); setGeneratedKey(null); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
          >
            <Plus className="w-3 h-3" />{t("mcp.generate")}
          </button>
        </div>

        <p className="px-5 py-3 text-xs border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
          {t("mcp.description")}
        </p>

        {/* Generate form */}
        {showForm && (
          <div className="px-5 py-4 border-b flex gap-3" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            <input
              value={newKeyLabel}
              onChange={e => setNewKeyLabel(e.target.value)}
              placeholder={t("mcp.labelPlaceholder")}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onKeyDown={e => e.key === "Enter" && newKeyLabel && createKey.mutate(newKeyLabel)}
            />
            <button
              onClick={() => newKeyLabel && createKey.mutate(newKeyLabel)}
              disabled={!newKeyLabel || createKey.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-jig-600 hover:bg-jig-500 disabled:opacity-50 transition-colors"
            >
              {createKey.isPending ? tc("loading") : t("mcp.generate")}
            </button>
          </div>
        )}

        {/* Generated key — shown once */}
        {generatedKey && (
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.05)" }}>
            <p className="text-xs text-emerald-400 mb-2 font-medium">{t("mcp.keyGenerated")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-white break-all px-3 py-2 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {generatedKey}
              </code>
              <button onClick={copyKey}
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ background: "var(--surface-raised)" }}>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            <p className="text-xs mt-2 text-amber-400">{t("mcp.keyOnce")}</p>
          </div>
        )}

        {/* Keys list */}
        {keys.length === 0 && !generatedKey ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {t("mcp.empty")}
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {keys.map(k => (
              <li key={k.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{k.label}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {k.key_prefix}…
                    <span className="ml-3">{t("mcp.created")} {new Date(k.created_at).toLocaleDateString()}</span>
                    {k.last_used_at && (
                      <span className="ml-3">{t("mcp.lastUsed")} {new Date(k.last_used_at).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => window.confirm(t("mcp.revokeConfirm")) && revokeKey.mutate(k.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Claude Code config snippet */}
        {keys.length > 0 && (
          <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            <p className="text-xs mb-2 font-medium" style={{ color: "var(--text-muted)" }}>{t("mcp.claudeConfig")}</p>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">{`{
  "mcpServers": {
    "jig": {
      "type": "http",
      "url": "https://jig.indeweygerlings.com/api/v1/mcp",
      "headers": { "X-JIG-API-Key": "<your key from above>" }
    }
  }
}`}</pre>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold text-white">{t("language.title")}</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{t("language.description")}</p>
          <div className="flex gap-3">
            {(["en", "nl"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === lang ? "bg-jig-600 text-white" : "text-slate-400 hover:text-white"
                }`}
                style={locale !== lang ? { background: "var(--surface-raised)" } : {}}
              >
                {t(`language.${lang}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
