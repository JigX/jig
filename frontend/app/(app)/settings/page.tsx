"use client";
import { useTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { locale, setLocale } = useLocale();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      {/* Language */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
          <Globe className="w-5 h-5 text-jig-400" />
          <div>
            <h2 className="font-semibold text-white">{t("language.title")}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("language.description")}</p>
          </div>
        </div>
        <div className="px-6 py-4 flex gap-3">
          {(["en", "nl"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                locale === l
                  ? "border-jig-500 bg-jig-500/10 text-white"
                  : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {t(`language.${l}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
