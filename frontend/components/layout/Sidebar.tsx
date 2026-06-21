"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/i18n";
import { Shield, Plug, FileText, Settings, Activity, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { clearToken } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  const nav = [
    { href: "/",           label: t("dashboard"),  icon: Activity },
    { href: "/connectors", label: t("connectors"), icon: Plug },
    { href: "/policies",   label: t("policies"),   icon: Shield },
    { href: "/audit",      label: t("auditLog"),   icon: FileText },
    { href: "/settings",   label: t("settings"),   icon: Settings },
    { href: "/admin",      label: t("admin"),      icon: ShieldCheck },
  ];

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-jig-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white tracking-wide">{tc("appName")}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tc("appTagline")}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-jig-600/20 text-jig-300"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-muted)] hover:text-red-400 hover:bg-red-900/10"
        >
          <LogOut className="w-4 h-4" />
          <span>{t("signOut")}</span>
        </button>
        <p className="text-xs px-3" style={{ color: "var(--text-muted)" }}>{tc("version")}</p>
      </div>
    </aside>
  );
}
