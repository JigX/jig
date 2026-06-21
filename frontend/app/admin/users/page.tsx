"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Users, UserPlus, Shield, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get("/admin/users/");
  return data;
}

export default function UsersAdmin() {
  const t = useTranslations("admin.users");
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-semibold text-white">{t("title")}</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{t("description")}</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-jig-500 hover:bg-jig-400 transition-colors">
            <UserPlus className="w-4 h-4" />
            {t("invite")}
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="font-medium text-white mb-1">{t("empty.title")}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("empty.description")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <th className="px-6 py-3 text-left">{t("table.name")}</th>
                <th className="px-6 py-3 text-left">{t("table.email")}</th>
                <th className="px-6 py-3 text-left">{t("table.role")}</th>
                <th className="px-6 py-3 text-left">{t("table.created")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-6 py-4 text-white font-medium">{u.full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs w-fit px-2 py-1 rounded-full ${u.is_admin ? "bg-jig-600/20 text-jig-300" : "bg-white/5 text-[var(--text-muted)]"}`}>
                      {u.is_admin ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {u.is_admin ? t("roles.admin") : t("roles.viewer")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
