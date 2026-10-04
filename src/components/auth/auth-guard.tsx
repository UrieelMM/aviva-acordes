"use client";

import { LoaderCircle, Music2 } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { isOfflineShell } from "@/components/providers/offline-navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useFirebaseAuth();
  const offlineSession = useSyncExternalStore(subscribeOfflineSession, getOfflineSession, () => false);

  useEffect(() => {
    if (!loading && !user && !offlineSession) window.location.replace("/auth");
  }, [loading, user, offlineSession]);

  if (loading || (!user && !offlineSession)) {
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

function getOfflineSession() {
  if (navigator.onLine && !isOfflineShell()) return false;
  try { return Boolean(localStorage.getItem("acorde-last-session")); } catch { return false; }
}

function subscribeOfflineSession(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  window.addEventListener("storage", callback);
  window.addEventListener("acorde-auth-session", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("acorde-auth-session", callback);
  };
}
