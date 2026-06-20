"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Plug, FileText, Settings, Activity, ChevronRight } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/",            label: "Dashboard",  icon: Activity },
  { href: "/connectors",  label: "Connectors", icon: Plug },
  { href: "/policies",    label: "Policies",   icon: Shield },
  { href: "/audit",       label: "Audit Log",  icon: FileText },
  { href: "/settings",    label: "Instellingen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-jig-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white tracking-wide">JIG</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI Governance</p>
          </div>
        </div>
      </div>

      {/* Nav */}
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

      {/* Version */}
      <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>v0.1.0 · MVP</p>
      </div>
    </aside>
  );
}
