"use client";

import { Bell, Check, Cloud, Database, Download, Languages, MonitorCog, Moon, Music2, Palette, ShieldCheck, Smartphone, Sprout, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui/primitives";
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
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const notation = useUiStore((state) => state.notation);
  const setNotation = useUiStore((state) => state.setNotation);

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader eyebrow="Preferencias" title="Ajustes" description="Personaliza cómo se ve y se comporta Acorde en este dispositivo." />

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
          <Card className="overflow-hidden"><div className="bg-brand p-5 text-white"><Smartphone className="size-6" /><h2 className="mt-5 font-display text-xl font-bold">Instalar Acorde</h2><p className="mt-2 text-sm leading-6 text-white/75">Abre tus canciones como una app y trabaja sin conexión.</p><Button className="mt-5 w-full !bg-white !text-brand-ink hover:!bg-white/90" onClick={() => toast.success("Acorde está listo para instalarse")}><Download className="size-4" /> Instalar PWA</Button></div><div className="space-y-3 p-5"><Status icon={<Cloud />} label="Sincronización" value="Actualizado" /><Status icon={<Database />} label="Datos offline" value="5 canciones" /><Status icon={<ShieldCheck />} label="Almacenamiento" value="Seguro" /></div></Card>
          <Card className="p-5"><h2 className="font-display text-lg font-bold">Espacio de trabajo</h2><div className="mt-4 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><Music2 className="size-5" /></span><div><p className="text-sm font-bold">Equipo Central</p><p className="text-xs text-app-secondary">8 miembros · Administrador</p></div></div><Button variant="secondary" className="mt-5 w-full">Administrar equipo</Button></Card>
        </aside>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) { return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-brand [&_svg]:size-5">{icon}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-xs text-app-secondary">{description}</p></div><div>{children}</div></div>; }
function Toggle({ enabled }: { enabled: boolean }) { return <button className={cx("relative h-7 w-12 rounded-full transition", enabled ? "bg-brand" : "bg-app-surface-muted")}><span className={cx("absolute top-1 size-5 rounded-full bg-white shadow-sm transition", enabled ? "left-6" : "left-1")} /></button>; }
function Status({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3 text-sm"><span className="text-app-success [&_svg]:size-4">{icon}</span><span className="flex-1 text-app-secondary">{label}</span><strong className="text-xs">{value}</strong></div>; }
