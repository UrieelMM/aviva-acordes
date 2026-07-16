import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarDays, Clock3, CloudCheck, ListMusic, Music, Sparkles, Users } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { demoSetlists, demoSongs, getSong } from "@/data/demo";
import { dayjs } from "@/lib/dayjs";

export function DashboardPage() {
  const nextSetlist = demoSetlists[0];

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow="Domingo, 12 de julio"
        title="Hola, Uriel. Todo listo para el próximo servicio."
        description="Organiza el repertorio, prepara cada instrumento y mantén al equipo en la misma página."
        action={<Link href={`/stage/${nextSetlist.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-[var(--app-glow)] hover:bg-brand-hover"><Sparkles className="size-4" /> Abrir modo escenario</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<BookOpenText />} value={String(demoSongs.length)} label="Canciones activas" detail="1 pendiente de sincronizar" />
        <MetricCard icon={<ListMusic />} value={String(demoSetlists.length)} label="Setlists próximos" detail="El siguiente está listo" />
        <MetricCard icon={<Users />} value="8" label="Músicos en el equipo" detail="5 instrumentos asignados" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-app-border p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><Badge tone="success"><CloudCheck className="size-3.5" /> Setlist listo</Badge><span className="text-xs font-medium text-app-secondary">4 canciones</span></div>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">{nextSetlist.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-app-secondary">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {dayjs(nextSetlist.date).format("dddd D [de] MMMM")}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" /> {nextSetlist.time}</span>
                  <span>{nextSetlist.venue}</span>
                </div>
              </div>
              <Link href={`/setlists/${nextSetlist.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-hover">Ver setlist <ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <div className="divide-y divide-app-border px-5 sm:px-6">
            {nextSetlist.items.map((item, index) => {
              const song = getSong(item.songId);
              return (
                <Link href={`/songs/${song.id}`} key={item.id} className="group flex items-center gap-4 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-xs font-extrabold text-app-secondary group-hover:bg-brand-soft group-hover:text-brand-ink">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-app-text">{song.title}</strong><span className="mt-0.5 block truncate text-xs text-app-secondary">{song.artist}</span></span>
                  <span className="rounded-lg border border-app-border px-2.5 py-1 text-xs font-extrabold">{song.originalKey}</span>
                  <span className="hidden text-xs text-app-secondary sm:block">{song.duration}</span>
                  <ArrowRight className="size-4 text-app-secondary opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="relative overflow-hidden bg-brand p-6 text-white">
            <div className="absolute -right-12 -top-12 size-44 rounded-full border-[28px] border-white/10" />
            <div className="relative">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15"><Music className="size-5" /></span>
              <p className="mt-8 text-sm font-semibold text-white/75">Canción sugerida para revisar</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Digno y Santo</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">Hay 3 notas instrumentales nuevas desde tu última visita.</p>
              <Link href="/songs/digno-y-santo" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-ink">Revisar arreglo <ArrowRight className="size-4" /></Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Actividad reciente</h2><span className="size-2 rounded-full bg-app-success" /></div>
            <div className="mt-5 space-y-4">
              <Activity initials="SM" text="Sofía agregó una nota de piano" time="Hace 18 min" />
              <Activity initials="DR" text="Daniel actualizó el setlist" time="Hace 1 h" />
              <Activity initials="UL" text="Tú editaste Bueno es Dios" time="Hace 3 h" />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, value, label, detail }: { icon: React.ReactNode; value: string; label: string; detail: string }) {
  return <Card className="flex items-center gap-4 p-4 sm:p-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink [&_svg]:size-5">{icon}</span><div><p className="font-display text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-app-secondary">{detail}</p></div></Card>;
}

function Activity({ initials, text, time }: { initials: string; text: string; time: string }) {
  return <div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-[10px] font-extrabold">{initials}</span><div className="min-w-0"><p className="text-sm font-medium leading-5">{text}</p><p className="mt-0.5 text-xs text-app-secondary">{time}</p></div></div>;
}

