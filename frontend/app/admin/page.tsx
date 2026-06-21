"use client";
import { useTranslations } from "next-intl";
import { Shield, Users, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const t = useTranslations("admin");

  const cards = [
    {
      href: "/admin/auth",
      icon: Shield,
      title: t("auth.title"),
      description: t("auth.description"),
      color: "bg-jig-600/20 text-jig-300",
    },
    {
      href: "/admin/users",
      icon: Users,
      title: t("users.title"),
      description: t("users.description"),
      color: "bg-emerald-900/30 text-emerald-400",
    },
    {
      href: "/admin/system",
      icon: Activity,
      title: t("system.title"),
      description: "Platform health, AI provider and database status",
      color: "bg-amber-900/30 text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(({ href, icon: Icon, title, description, color }) => (
        <Link
          key={href}
          href={href}
          className="rounded-xl border p-5 hover:border-jig-600/40 transition-colors group"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
            {title}
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{description}</p>
        </Link>
      ))}
    </div>
  );
}
