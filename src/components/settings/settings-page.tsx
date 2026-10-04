"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Bell, Check, Cloud, Database, Download, Languages, MonitorCog, Moon, Music2, Palette, ShieldCheck, Smartphone, Sprout, WandSparkles } from "lucide-react";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";
import { useFirebaseSyncStatus } from "@/components/providers/firebase-sync-provider";
import { ManualSyncButton } from "@/components/sync/manual-sync-button";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui/primitives";
import { isFirebaseConfigured, missingFirebaseEnvKeys } from "@/lib/firebase/client";
import { getDbSummary } from "@/lib/indexed-db";
import { themeOptions } from "@/lib/themes";
import { useUiStore } from "@/stores/ui-store";
import type { ThemeName } from "@/types/domain";

const themeIcons: Record<ThemeName, typeof Music2> = {
  studio: Music2,
  worship: Sprout,
  stage: WandSparkles,
  dark: Moon,
};

export function SettingsPage() {
  const install = usePwaInstall();
  const auth = useFirebaseAuth();
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const notation = useUiStore((state) => state.notation);
  const setNotation = useUiStore((state) => state.setNotation);
  const sync = useFirebaseSyncStatus();
  const summary = useLiveQuery(() => getDbSummary(), [sync.pending], { songs: 0, setlists: 0, pending: 0 });

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader eyebrow="Preferencias" title="Ajustes" description="Personaliza cómo se ve y se comporta WorshipNotes en este dispositivo." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><Palette className="size-5" /></span><div><h2 className="font-display text-xl font-bold">Tema de color</h2><p className="mt-1 text-sm text-app-secondary">El diseño se mantiene; solo cambia la atmósfera visual.</p></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{themeOptions.map((option) => { const ThemeIcon = themeIcons[option.id]; return <button key={option.id} onClick={() => setTheme(option.id)} className={cx("relative rounded-2xl border p-4 text-left transition", theme === option.id ? "border-brand bg-brand-soft/45 ring-2 ring-brand/15" : "border-app-border hover:bg-app-surface-muted")}><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-app-surface shadow-sm"><ThemeIcon className="size-5 text-app-text" /></span>{theme === option.id ? <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white"><Check className="size-3.5" /></span> : option.recommended ? <Badge tone="brand">Recomendado</Badge> : null}</div><h3 className="mt-4 font-bold">{option.name}</h3><p className="mt-1 text-xs leading-5 text-app-secondary">{option.description}</p><div className="mt-4 flex gap-1.5">{option.colors.map((color) => <span key={color} className={cx("h-2 flex-1 rounded-full", color)} />)}</div></button>; })}</div>
          </Card>

          <Card className="divide-y divide-app-border overflow-hidden">
            <SettingRow icon={<Languages />} title="Notación de acordes" description="Tu preferencia se aplica en canciones y escenario"><div className="flex rounded-xl bg-app-surface-muted p-1"><button onClick={() => setNotation("latin")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "latin" && "bg-app-surface text-brand shadow-sm")}>Do Re Mi</button><button onClick={() => setNotation("english")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "english" && "bg-app-surface text-brand shadow-sm")}>C D E</button></div></SettingRow>
            <SettingRow icon={<Bell />} title="Notificaciones" description="Cambios en setlists y notas del equipo"><Toggle enabled /></SettingRow>
            <SettingRow icon={<MonitorCog />} title="Mantener pantalla activa" description="Se usa durante el modo escenario"><Toggle enabled /></SettingRow>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="overflow-hidden"><div className="bg-brand p-5 text-white"><Smartphone className="size-6" /><h2 className="mt-5 font-display text-xl font-bold">Instalar WorshipNotes</h2><p className="mt-2 text-sm leading-6 text-white/75">Abre tus canciones como una app y trabaja sin conexión.</p>{install.installed ? <p className="mt-5 rounded-xl bg-white/15 p-3 text-sm font-bold">Aplicación instalada</p> : null}<Button className="mt-5 w-full !bg-white !text-brand-ink hover:!bg-white/90" onClick={() => void install.install()}><Download className="size-4" /> {install.installed ? "Ver guía de instalación" : install.available ? "Instalar aplicación" : "Ver cómo instalar"}</Button></div><div className="space-y-3 p-5"><Status icon={<Cloud />} label="Sincronización" value={sync.phase === "disabled" ? "Solo local" : sync.phase === "synced" ? "Actualizado" : sync.phase === "error" ? "Error" : sync.phase === "offline" ? "Sin conexión" : "Conectando"} /><Status icon={<Database />} label="Datos offline" value={`${summary.songs} canciones · ${summary.setlists} setlists`} /><Status icon={<ShieldCheck />} label="Cambios pendientes" value={String(summary.pending)} /><div className="border-t border-app-border pt-4"><p className="mb-3 text-xs leading-5 text-app-secondary">Actualiza todas las canciones y setlists del equipo en este dispositivo para abrirlos sin conexión.</p><ManualSyncButton variant="settings" /></div></div></Card>
          <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Espacio compartido</h2><p className="mt-1 text-xs leading-5 text-app-secondary">Canciones, setlists e historial son comunes para todos los usuarios autenticados.</p></div><Badge tone={isFirebaseConfigured ? sync.phase === "error" ? "warning" : "success" : "warning"}>{isFirebaseConfigured ? "Firebase" : "Sin configurar"}</Badge></div><div className="mt-4 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><Music2 className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{auth.user?.displayName || "Equipo Central"}</p><p className="truncate text-xs text-app-secondary">{auth.user?.email ?? (isFirebaseConfigured ? "Conectando usuario…" : `${missingFirebaseEnvKeys.length} variables pendientes`)}</p></div></div><div className="mt-5 rounded-xl bg-app-surface-muted p-3 text-[11px] leading-5 text-app-secondary">{isFirebaseConfigured ? "Tu cuenta identifica los cambios del historial. Todos los usuarios con acceso leen y escriben las mismas colecciones." : "Copia .env.example como .env.local, pega las credenciales y reinicia el servidor."}</div></Card>
        </aside>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) { return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-brand [&_svg]:size-5">{icon}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-xs text-app-secondary">{description}</p></div><div>{children}</div></div>; }
function Toggle({ enabled }: { enabled: boolean }) { return <button className={cx("relative h-7 w-12 rounded-full transition", enabled ? "bg-brand" : "bg-app-surface-muted")}><span className={cx("absolute top-1 size-5 rounded-full bg-white shadow-sm transition", enabled ? "left-6" : "left-1")} /></button>; }
function Status({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3 text-sm"><span className="text-app-success [&_svg]:size-4">{icon}</span><span className="flex-1 text-app-secondary">{label}</span><strong className="text-xs">{value}</strong></div>; }
