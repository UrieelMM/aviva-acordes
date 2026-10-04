"use client";

import { Download, Smartphone, X } from "lucide-react";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";

export function InstallAlert() {
  const install = usePwaInstall();
  if (install.installed || install.dismissed) return null;
  return (
    <aside role="status" className="install-alert fixed inset-x-3 z-40 mx-auto max-w-md rounded-2xl border border-brand/25 bg-app-surface p-4 text-app-text shadow-2xl shadow-slate-950/25">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Smartphone className="size-5" /></span>
        <div className="min-w-0 flex-1"><strong className="block text-sm">Lleva WorshipNotes contigo</strong><p className="mt-1 text-xs leading-5 text-app-secondary">Instala la app para abrir tus canciones y setlists guardados sin internet.</p></div>
        <button type="button" onClick={install.dismiss} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-app-secondary" aria-label="Cerrar aviso de instalación"><X className="size-4" /></button>
      </div>
      <button type="button" onClick={() => void install.install()} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white"><Download className="size-4" /> Instalar aplicación</button>
      {install.instructions ? <p className="mt-2 text-xs text-app-secondary">{install.instructions}</p> : null}
    </aside>
  );
}
