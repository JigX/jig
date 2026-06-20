"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { setToken, getToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData();
    form.append("username", email);
    form.append("password", password);

    try {
      const res = await fetch("/api/v1/auth/login", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        router.replace("/");
      } else {
        setError("Ongeldig e-mailadres of wachtwoord");
      }
    } catch {
      setError("Verbindingsfout. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-jig-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-xl tracking-wide">JIG</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI Governance Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h1 className="text-white font-semibold text-lg mb-6">Inloggen</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-jig-400"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                placeholder="jeffrey@crv4all.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-jig-400"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 py-2 px-3 rounded-lg bg-red-900/20 border border-red-900/40">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-jig-500 hover:bg-jig-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bezig…
                </>
              ) : (
                "Inloggen"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Geen account? Vraag toegang aan bij de beheerder.
        </p>
      </div>
    </div>
  );
}
