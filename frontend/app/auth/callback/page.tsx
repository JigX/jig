"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import { Shield, Loader2 } from "lucide-react";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
      router.replace("/");
    } else {
      router.replace("/login?error=oauth_failed");
    }
  }, [params, router]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 text-slate-400">
        <Shield className="w-5 h-5 text-jig-400" />
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Signing in...</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
