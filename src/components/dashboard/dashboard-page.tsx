"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarDays, Clock3, CloudCheck, ListMusic, Music, Sparkles, Users } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { dayjs } from "@/lib/dayjs";
import { listRecentHistory, listSetlists, listSongs } from "@/lib/indexed-db";
import { getMostRecentSetlist } from "@/lib/setlist-selection";

export function DashboardPage() {
  const songs = useLiveQuery(() => listSongs(), [], []);
  const setlists = useLiveQuery(() => listSetlists(), [], []);
  const history = useLiveQuery(() => listRecentHistory(6), [], []);
  const nextSetlist = getMostRecentSetlist(setlists);
  const songMap = new Map(songs.map((song) => [song.id, song]));
  const recentUsers = new Set(history.map((entry) => entry.userId)).size;

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow={dayjs().format("dddd, D [de] MMMM")}
        title="Hola, equipo. Todo listo para el próximo servicio."
        description="Organiza el repertorio, prepara cada instrumento y mantén al equipo en la misma página."
        action={<Link href={nextSetlist ? `/stage/${nextSetlist.id}` : "/setlists/new"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-[var(--app-glow)] hover:bg-brand-hover"><Sparkles className="size-4" /> {nextSetlist ? "Abrir modo escenario" : "Crear setlist"}</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<BookOpenText />} value={String(songs.length)} label="Canciones activas" detail={`${songs.filter((song) => song.status === "pending").length} pendientes de sincronizar`} />
        <MetricCard icon={<ListMusic />} value={String(setlists.length)} label="Setlists compartidos" detail={nextSetlist ? "El más reciente está disponible" : "Crea el primer setlist"} />
        <MetricCard icon={<Users />} value={String(recentUsers)} label="Usuarios recientes" detail="Identificados por dispositivo" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        {nextSetlist ? <Card className="overflow-hidden">
          <div className="border-b border-app-border p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><Badge tone={nextSetlist.status === "ready" ? "success" : "warning"}>{nextSetlist.status === "ready" ? <CloudCheck className="size-3.5" /> : <Clock3 className="size-3.5" />} {nextSetlist.status === "ready" ? "Setlist listo" : "Borrador"}</Badge><span className="text-xs font-medium text-app-secondary">{nextSetlist.items.length} canciones</span></div>
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
              const song = songMap.get(item.songId);
              if (!song) return null;
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
        </Card> : <Card className="flex min-h-96 flex-col items-center justify-center p-8 text-center"><ListMusic className="size-12 text-app-secondary" /><h2 className="mt-5 font-display text-2xl font-bold">Aún no hay setlists</h2><p className="mt-2 max-w-sm text-sm text-app-secondary">Crea uno y aparecerá aquí para todos los usuarios.</p><Link href="/setlists/new" className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">Crear setlist</Link></Card>}

        <div className="space-y-6">
          <Card className="relative overflow-hidden bg-brand p-6 text-white">
            <div className="absolute -right-12 -top-12 size-44 rounded-full border-[28px] border-white/10" />
            <div className="relative">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15"><Music className="size-5" /></span>
              <p className="mt-8 text-sm font-semibold text-white/75">Canción sugerida para revisar</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{songs[0]?.title ?? "Tu biblioteca está lista"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">{songs[0] ? "Abre la canción para revisar acordes, notas y secciones." : "Agrega la primera canción al espacio compartido."}</p>
              <Link href={songs[0] ? `/songs/${songs[0].id}` : "/songs/new"} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-ink">{songs[0] ? "Revisar arreglo" : "Nueva canción"} <ArrowRight className="size-4" /></Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Actividad reciente</h2><span className="size-2 rounded-full bg-app-success" /></div>
            <div className="mt-5 space-y-4">
              {history.length ? history.map((entry) => <Activity key={entry.id} initials={entry.userId.slice(0, 2).toUpperCase()} text={`${historyAction(entry.action)} ${entry.title}`} time={dayjs(entry.changedAt).fromNow()} />) : <p className="text-sm text-app-secondary">Los cambios sincronizados aparecerán aquí.</p>}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function historyAction(action: "create" | "update" | "archive" | "delete") {
  if (action === "create") return "Creó";
  if (action === "archive") return "Archivó";
  if (action === "delete") return "Eliminó";
  return "Actualizó";
}

function MetricCard({ icon, value, label, detail }: { icon: React.ReactNode; value: string; label: string; detail: string }) {
  return <Card className="flex items-center gap-4 p-4 sm:p-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink [&_svg]:size-5">{icon}</span><div><p className="font-display text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-app-secondary">{detail}</p></div></Card>;
}

function Activity({ initials, text, time }: { initials: string; text: string; time: string }) {
  return <div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-[10px] font-extrabold">{initials}</span><div className="min-w-0"><p className="text-sm font-medium leading-5">{text}</p><p className="mt-0.5 text-xs text-app-secondary">{time}</p></div></div>;
}
