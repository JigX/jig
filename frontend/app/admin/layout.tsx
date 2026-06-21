"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield, Users, Settings, LayoutDashboard } from "lucide-react";
import clsx from "clsx";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  const tabs = [
    { href: "/admin",       label: t("nav.overview"), icon: LayoutDashboard },
    { href: "/admin/auth",  label: t("nav.auth"),     icon: Shield },
    { href: "/admin/users", label: t("nav.users"),    icon: Users },
    { href: "/admin/system",label: t("nav.system"),   icon: Settings },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
      </div>

      <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors flex-1 justify-center",
                active ? "bg-jig-600/20 text-jig-300" : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
