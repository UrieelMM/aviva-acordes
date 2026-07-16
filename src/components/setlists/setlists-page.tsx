import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ListMusic, MapPin, Plus, Sparkles } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { demoSetlists, getSong } from "@/data/demo";
import { dayjs } from "@/lib/dayjs";

export function SetlistsPage() {
  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader eyebrow="Planificación" title="Setlists" description="Prepara el orden, tono y notas de cada canción antes de subir al escenario." action={<Link href="/setlists/new" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover sm:w-auto"><Plus className="size-4" /> Nuevo setlist</Link>} />

      <section className="grid gap-5 xl:grid-cols-2">
        {demoSetlists.map((setlist, index) => {
          const totalMinutes = setlist.items.reduce((total, item) => {
            const [minutes, seconds] = getSong(item.songId).duration.split(":").map(Number);
            return total + minutes + seconds / 60;
          }, 0);
          return (
            <Card key={setlist.id} className="group overflow-hidden transition hover:border-brand/40">
              <div className="relative border-b border-app-border p-5 sm:p-6">
                {index === 0 ? <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-brand-soft/70" /> : null}
                <div className="relative flex items-start justify-between gap-4">
                  <div><Badge tone={setlist.status === "ready" ? "success" : "warning"}>{setlist.status === "ready" ? <CheckCircle2 className="size-3.5" /> : <Clock3 className="size-3.5" />}{setlist.status === "ready" ? "Listo" : "Borrador"}</Badge><h2 className="mt-4 font-display text-2xl font-bold tracking-tight">{setlist.name}</h2><p className="mt-2 text-sm text-app-secondary">Dirige {setlist.leader}</p></div>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><ListMusic className="size-5" /></span>
                </div>
                <div className="relative mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-app-secondary"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {dayjs(setlist.date).format("D MMM YYYY")}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" /> {setlist.time}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {setlist.venue}</span></div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex -space-x-2">{setlist.items.slice(0, 4).map((item, itemIndex) => <span key={item.id} className="flex size-9 items-center justify-center rounded-full border-2 border-app-surface bg-app-surface-muted text-[10px] font-extrabold text-app-secondary">{String(itemIndex + 1).padStart(2, "0")}</span>)}<span className="ml-3 self-center text-sm font-semibold text-app-secondary">{setlist.items.length} canciones · {Math.round(totalMinutes)} min</span></div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link href={`/setlists/${setlist.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-app-border text-sm font-bold hover:bg-app-surface-muted">Editar setlist <ArrowRight className="size-4" /></Link><Link href={`/stage/${setlist.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-hover"><Sparkles className="size-4" /> Modo escenario</Link></div>
              </div>
            </Card>
          );
        })}

        <Link href="/setlists/new" className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-app-border p-8 text-center transition hover:border-brand hover:bg-brand-soft/30"><span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><Plus className="size-6" /></span><h2 className="mt-5 font-display text-xl font-bold">Planear un nuevo servicio</h2><p className="mt-2 max-w-sm text-sm leading-6 text-app-secondary">Selecciona canciones, ajusta tonos y comparte el orden con todo el equipo.</p></Link>
      </section>
    </div>
  );
}
