"use client";

import { LoaderCircle, Music2 } from "lucide-react";
import { useEffect } from "react";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useFirebaseAuth();

  useEffect(() => {
    if (!loading && !user) window.location.replace("/auth");
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-app-bg px-6 text-app-text">
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-[var(--app-glow)]">
            {loading ? <LoaderCircle className="size-6 animate-spin" /> : <Music2 className="size-6" />}
          </span>
          <p className="mt-4 text-sm font-bold">{loading ? "Restaurando tu sesión…" : "Redirigiendo al inicio de sesión…"}</p>
          <p className="mt-1 text-xs text-app-secondary">Espera un momento.</p>
        </div>
      </div>
    );
  }

  return children;
}
