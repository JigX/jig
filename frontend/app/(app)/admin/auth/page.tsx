"use client";
import { useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { CheckCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import clsx from "clsx";

type Provider = "local" | "azure" | "authentik";

interface ProviderConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export default function AuthSettings() {
  const t = useTranslations("admin.auth");
  const [active, setActive] = useState<Provider>("local");
  const [expanded, setExpanded] = useState<Provider | null>(null);
  const [config, setConfig] = useState<Record<Provider, ProviderConfig>>({
    local: {},
    azure: { tenantId: "", clientId: "", clientSecret: "" },
    authentik: { baseUrl: "", clientId: "", clientSecret: "" },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800)); // TODO: wire to /api/v1/admin/settings
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const providers: { id: Provider; fields: { key: keyof ProviderConfig; labelKey: string; placeholderKey: string; secret?: boolean }[] }[] = [
    { id: "local", fields: [] },
    {
      id: "azure",
      fields: [
        { key: "tenantId",     labelKey: "providers.azure.tenantId",     placeholderKey: "providers.azure.tenantIdPlaceholder" },
        { key: "clientId",     labelKey: "providers.azure.clientId",     placeholderKey: "providers.azure.clientIdPlaceholder" },
        { key: "clientSecret", labelKey: "providers.azure.clientSecret", placeholderKey: "providers.azure.clientId", secret: true },
      ],
    },
    {
      id: "authentik",
      fields: [
        { key: "baseUrl",      labelKey: "providers.authentik.baseUrl",      placeholderKey: "providers.authentik.baseUrlPlaceholder" },
        { key: "clientId",     labelKey: "providers.authentik.clientId",     placeholderKey: "providers.authentik.baseUrl" },
        { key: "clientSecret", labelKey: "providers.authentik.clientSecret", placeholderKey: "providers.authentik.baseUrl", secret: true },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5 mb-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-white mb-1">{t("title")}</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("description")}</p>
      </div>

      {providers.map(({ id, fields }) => {
        const isActive = active === id;
        const isExpanded = expanded === id;

        return (
          <div
            key={id}
            className={clsx(
              "rounded-xl border transition-colors",
              isActive ? "border-jig-500/50" : "border-[var(--border)]"
            )}
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center gap-4 p-5">
              <button
                onClick={() => setActive(id)}
                className={clsx(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  isActive ? "border-jig-400 bg-jig-500" : "border-[var(--text-muted)]"
                )}
              >
                {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t(`providers.${id}.name`)}</span>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-jig-600/30 text-jig-300">
                      {t("active")}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t(`providers.${id}.description`)}
                </p>
              </div>

              {fields.length > 0 && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : id)}
                  className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
                >
                  {t("configure")}
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {isExpanded && fields.length > 0 && (
              <div className="px-5 pb-5 pt-0 border-t space-y-4" style={{ borderColor: "var(--border)" }}>
                <div className="pt-4 grid grid-cols-1 gap-4">
                  {fields.map(({ key, labelKey, placeholderKey, secret }) => (
                    <div key={key}>
                      <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                        {t(labelKey as Parameters<typeof t>[0])}
                      </label>
                      <input
                        type={secret ? "password" : "text"}
                        value={(config[id][key] as string) ?? ""}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, [id]: { ...prev[id], [key]: e.target.value } }))
                        }
                        placeholder={t(placeholderKey as Parameters<typeof t>[0])}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-jig-400 font-mono"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-jig-500 hover:bg-jig-400 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? t("saving") : t("save")}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}
