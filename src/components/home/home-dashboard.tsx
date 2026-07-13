"use client";

import { useQuery } from "@tanstack/react-query";
import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BellRing,
  CloudCog,
  Database,
  Guitar,
  LoaderCircle,
  Music2,
  Smartphone,
  Sparkles,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/stores/ui-store";
import { dayjs } from "@/lib/dayjs";
import { isFirebaseConfigured, missingFirebaseEnvKeys } from "@/lib/firebase/client";
import { getDbSummary, seedDemoSong } from "@/lib/indexed-db";
import { playReferenceTone } from "@/lib/tone";

const sampleSong = new ChordProParser().parse(`{title: Hosanna}
{subtitle: Demo inicial}
[G]Abre mis [D]ojos, quie[Em]ro verte
[C]Quiero verte [D]hoy`);

const sampleSongHtml = new HtmlDivFormatter().format(sampleSong);

type BootstrapStatus = {
  generatedAt: string;
  services: string[];
  pwaReady: boolean;
};

async function loadBootstrapStatus(): Promise<BootstrapStatus> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  return {
    generatedAt: new Date().toISOString(),
    services: ["Next.js", "Firebase", "TanStack Query", "Dexie", "Tone.js", "ChordSheetJS"],
    pwaReady: true,
  };
}

export function HomeDashboard() {
  const practiceMode = useUiStore((state) => state.practiceMode);
  const lastBellAt = useUiStore((state) => state.lastBellAt);
  const togglePracticeMode = useUiStore((state) => state.togglePracticeMode);
  const ringBell = useUiStore((state) => state.ringBell);

  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap-status"],
    queryFn: loadBootstrapStatus,
  });

  const dbSummary = useLiveQuery(() => getDbSummary(), []);

  const handleSeedSong = async () => {
    await seedDemoSong();
    toast.success("Canción demo guardada en IndexedDB.");
  };

  const handleBell = () => {
    ringBell();
    toast("Recordatorio listo", {
      description: "Puedes usar este store global para avisos rápidos del ensayo.",
      icon: <BellRing className="size-4" />,
    });
  };

  const handlePlayTone = async () => {
    await playReferenceTone();
    toast.success("Se reprodujo una referencia tonal con Tone.js.");
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-10">
      <section className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-[0_30px_80px_rgba(120,53,15,0.12)] sm:p-10">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-amber-300/35 via-orange-200/15 to-yellow-200/35 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/70 px-3 py-1 text-sm font-medium text-amber-900">
              <Sparkles className="size-4" />
              Proyecto base listo para crecer
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              App inicial para el grupo de alabanza con sincronización, práctica y trabajo offline.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              La base ya incluye Next.js con TypeScript, Tailwind, Firebase listo para credenciales, estado global,
              PWA, IndexedDB, utilidades de audio y soporte para canciones con acordes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                onClick={handleSeedSong}
              >
                Guardar demo en IndexedDB
              </button>
              <button
                className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                onClick={handlePlayTone}
              >
                Probar Tone.js
              </button>
              <button
                className="rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                onClick={handleBell}
              >
                Lanzar toast global
              </button>
            </div>
          </div>

          <aside className="grid gap-4">
            <StatusCard
              icon={<CloudCog className="size-5" />}
              label="Firebase"
              value={isFirebaseConfigured ? "Configurado" : "Pendiente"}
              detail={
                isFirebaseConfigured
                  ? "El cliente está listo para usarse."
                  : `Completa el .env.local con: ${missingFirebaseEnvKeys.join(", ")}`
              }
            />
            <StatusCard
              icon={<Smartphone className="size-5" />}
              label="PWA / Serwist"
              value={data?.pwaReady ? "Activa" : "Inicializando"}
              detail="Manifest, service worker y pantalla offline ya están conectados."
            />
            <StatusCard
              icon={<Database className="size-5" />}
              label="IndexedDB"
              value={dbSummary ? `${dbSummary.songs} canciones` : "Sin leer"}
              detail="Dexie quedó preparado para canciones y setlists locales."
            />
          </aside>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel rounded-[1.75rem] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-title text-sm font-semibold text-muted">Stack conectado</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Chequeo rápido del arranque</h2>
            </div>
            {isLoading ? <LoaderCircle className="size-5 animate-spin text-amber-700" /> : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(data?.services ?? []).map((service) => (
              <div key={service} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                <p className="text-sm font-medium text-slate-500">Dependencia</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{service}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniMetric
              icon={<Music2 className="size-4" />}
              label="Practice mode"
              value={practiceMode ? "Activado" : "Desactivado"}
              actionLabel="Cambiar"
              onClick={togglePracticeMode}
            />
            <MiniMetric
              icon={<BellRing className="size-4" />}
              label="Último aviso"
              value={lastBellAt ? dayjs(lastBellAt).fromNow() : "Sin avisos"}
            />
            <MiniMetric
              icon={<Database className="size-4" />}
              label="Registros locales"
              value={dbSummary ? String(dbSummary.songs + dbSummary.setlists) : "0"}
            />
          </div>
        </article>

        <article className="glass-panel rounded-[1.75rem] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)]">
          <div className="flex items-center gap-3">
            <Guitar className="size-5 text-amber-800" />
            <div>
              <p className="section-title text-sm font-semibold text-muted">ChordSheetJS</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Vista previa de canción</h2>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-200/70 bg-white/90 p-5">
            <div
              className="max-w-none text-slate-700 [&_.chord]:font-semibold [&_.chord]:text-amber-800"
              dangerouslySetInnerHTML={{ __html: sampleSongHtml }}
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.25rem] bg-slate-950 px-4 py-4 text-white">
            <div>
              <p className="text-sm text-slate-300">Última actualización del chequeo</p>
              <p className="mt-1 text-base font-semibold">
                {data?.generatedAt ? dayjs(data.generatedAt).format("DD MMM YYYY, HH:mm") : "Cargando"}
              </p>
            </div>
            <Volume2 className="size-5 text-amber-300" />
          </div>
        </article>
      </section>
    </main>
  );
}

function StatusCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3 text-amber-900">
        {icon}
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

function MiniMetric({
  icon,
  label,
  value,
  actionLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  actionLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
          {icon}
          {label}
        </span>
        {actionLabel && onClick ? (
          <button className="text-sm font-semibold text-amber-800 transition hover:text-amber-950" onClick={onClick}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
