"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Terminal, Globe, Server, Database, ChevronLeft, KeyRound, Lock } from "lucide-react";

type ConnectorType = "ssh" | "openapi" | "mcp" | "graphql";
type AuthMethod = "key" | "password";

const TYPES: { id: ConnectorType; icon: React.ElementType; color: string }[] = [
  { id: "ssh",     icon: Terminal, color: "text-amber-400" },
  { id: "openapi", icon: Globe,    color: "text-blue-400" },
  { id: "mcp",     icon: Server,   color: "text-jig-300" },
  { id: "graphql", icon: Database, color: "text-pink-400" },
];

const INPUT =
  "w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-white placeholder-slate-500 outline-none focus:border-jig-500 transition-colors";

export default function NewConnectorPage() {
  const t  = useTranslations("connectors.new");
  const tc = useTranslations("common");
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null);
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost]             = useState("");
  const [port, setPort]             = useState("22");
  const [username, setUsername]     = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("key");
  const [keySecretRef, setKeySecretRef] = useState("");
  const [jumpHost, setJumpHost]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    setSubmitting(true);
    setError("");

    const config: Record<string, unknown> = {};
    if (selectedType === "ssh") {
      config.host        = host;
      config.port        = parseInt(port, 10) || 22;
      config.username    = username;
      config.auth_method = authMethod;
      config.key_secret_ref = keySecretRef;
      if (jumpHost) config.jump_host = jumpHost;
    }

    try {
      const { data } = await api.post("/connectors/", {
        name,
        description,
        type: selectedType,
        config,
      });
      router.push(`/connectors/${data.id}`);
    } catch {
      setError(t("error"));
      setSubmitting(false);
    }
  }

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
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      {/* Type selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-white mb-3">{t("selectType")}</p>
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map(({ id, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedType(id)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                selectedType === id
                  ? "border-jig-500 bg-jig-500/10"
                  : "border-white/10 hover:border-white/20 bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-sm font-medium text-white">{t(`types.${id}.label`)}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t(`types.${id}.description`)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {/* Name + Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">{t("fields.name")}</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("fields.namePlaceholder")}
                  className={INPUT}
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">{t("fields.description")}</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("fields.descriptionPlaceholder")}
                  className={INPUT}
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
            </div>

            {/* SSH-specific fields */}
            {selectedType === "ssh" && (
              <>
                <hr style={{ borderColor: "var(--border)" }} />
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">{t("fields.host")}</label>
                    <input
                      required
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder={t("fields.hostPlaceholder")}
                      className={INPUT}
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">{t("fields.port")}</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className={INPUT}
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">{t("fields.username")}</label>
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("fields.usernamePlaceholder")}
                    className={INPUT}
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                {/* Auth method */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">{t("fields.authMethod")}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAuthMethod("key")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                        authMethod === "key"
                          ? "border-jig-500 bg-jig-500/10 text-white"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <KeyRound className="w-4 h-4" />
                      {t("fields.authKey")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod("password")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                        authMethod === "password"
                          ? "border-jig-500 bg-jig-500/10 text-white"
                          : "border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      {t("fields.authPassword")}
                    </button>
                  </div>
                </div>

                {/* Key/password secret ref */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">{t("fields.keySecretRef")}</label>
                  <input
                    required
                    value={keySecretRef}
                    onChange={(e) => setKeySecretRef(e.target.value)}
                    placeholder={t("fields.keySecretRefPlaceholder")}
                    className={INPUT}
                    style={{ borderColor: "var(--border)" }}
                  />
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    Name of the Kubernetes secret that holds the SSH {authMethod === "key" ? "private key" : "password"}.
                  </p>
                </div>

                {/* Jump host */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">{t("fields.jumpHost")}</label>
                  <input
                    value={jumpHost}
                    onChange={(e) => setJumpHost(e.target.value)}
                    placeholder={t("fields.jumpHostPlaceholder")}
                    className={INPUT}
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-jig-500 hover:bg-jig-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
