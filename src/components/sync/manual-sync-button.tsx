"use client";

import { CloudCheck, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFirebaseSyncStatus } from "@/components/providers/firebase-sync-provider";
import { refreshFirebaseSync } from "@/lib/firebase/sync";
import { cx } from "@/components/ui/primitives";

export function ManualSyncButton({ variant = "header" }: { variant?: "header" | "drawer" | "settings" }) {
  const sync = useFirebaseSyncStatus();
  const [busy, setBusy] = useState(false);
  const refreshing = busy || sync.refreshing;
  const unavailable = sync.phase === "disabled" || sync.phase === "signed-out";
  const label = refreshing ? "Actualizando" : sync.phase === "disabled" ? "Solo local" : sync.phase === "signed-out" ? "Inicia sesión" : sync.phase === "offline" ? "Sin conexión" : sync.phase === "error" ? "Reintentar" : sync.phase === "synced" ? "Sincronizado" : "Actualizar";
  const Icon = refreshing ? LoaderCircle : sync.phase === "offline" ? CloudOff : sync.phase === "synced" ? CloudCheck : RefreshCw;

  const handleClick = async () => {
    if (refreshing) return;
    setBusy(true);
    try {
      const summary = await refreshFirebaseSync();
      toast.success("Biblioteca actualizada", {
        description: `${summary.songs} canciones y ${summary.setlists} setlists disponibles sin conexión.`,
      });
    } catch (error) {
      toast.error("No se pudo actualizar la biblioteca", {
        description: error instanceof Error ? error.message : "Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={refreshing || unavailable}
      aria-label="Actualizar canciones y setlists para uso sin conexión"
      title="Descargar los últimos cambios del equipo"
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 border border-app-border bg-app-surface text-xs font-bold text-app-secondary transition hover:border-brand/40 hover:bg-app-surface-muted hover:text-app-text disabled:cursor-wait disabled:opacity-65",
        variant === "header" ? "size-10 shrink-0 rounded-xl sm:w-auto sm:rounded-full sm:px-3" : "w-full rounded-xl px-4",
        variant === "settings" && "min-h-11 border-brand/25 bg-brand-soft text-brand-ink hover:bg-brand-soft/70",
      )}
    >
      <Icon className={cx("size-4 shrink-0", refreshing && "animate-spin", sync.phase === "synced" && !refreshing && "text-app-success")} />
      <span className={variant === "header" ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
}
