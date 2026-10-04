"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowUpDown, BookOpenText, Check, ChevronRight, CircleDot, Grid2X2, List, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui/primitives";
import { dayjs } from "@/lib/dayjs";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { listSongs } from "@/lib/indexed-db";
import { searchSongs } from "@/lib/song-search";

type ViewMode = "list" | "grid";

export function SongLibrary() {
  const songs = useLiveQuery(() => listSongs(), [], []);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("Todas");
  const [view, setView] = useState<ViewMode>("list");
  const deferredSearch = useDeferredValue(search);
  const tags = ["Todas", "Adoración", "Celebración", "Congregacional", "Bendición"];
  const hits = searchSongs(songs, deferredSearch).filter(({ song }) => tag === "Todas" || song.tags.includes(tag));
  const filteredSongs = hits.map(({ song }) => song);
  const contexts = new Map(hits.map(({ song, context }) => [song.id, context]));

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="Biblioteca" title="Canciones" description={`${songs.length} canciones disponibles ${isFirebaseConfigured ? "para todo el equipo" : "en este dispositivo"}.`} action={<Link href="/songs/new" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover sm:w-auto"><Plus className="size-4" /> Nueva canción</Link>} />

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-app-surface-muted px-3.5">
            <Search className="size-4 text-app-secondary" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-app-secondary" placeholder="Título, artista, sección o letra..." aria-label="Buscar canciones por título, artista, sección o letra" />
            {search ? <button onClick={() => setSearch("")} className="text-xs font-bold text-brand">Limpiar</button> : null}
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {tags.map((item) => <button key={item} onClick={() => setTag(item)} className={cx("min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold transition", tag === item ? "bg-brand-soft text-brand-ink" : "border border-app-border text-app-secondary hover:bg-app-surface-muted")}>{tag === item ? <Check className="mr-1 inline size-3.5" /> : null}{item}</button>)}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-app-border pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
            <Button variant="ghost" size="sm"><SlidersHorizontal className="size-4" /> Filtros</Button>
            <div className="flex rounded-xl bg-app-surface-muted p-1">
              <button onClick={() => setView("list")} className={cx("flex size-8 items-center justify-center rounded-lg", view === "list" ? "bg-app-surface text-brand shadow-sm" : "text-app-secondary")} aria-label="Vista de lista"><List className="size-4" /></button>
              <button onClick={() => setView("grid")} className={cx("flex size-8 items-center justify-center rounded-lg", view === "grid" ? "bg-app-surface text-brand shadow-sm" : "text-app-secondary")} aria-label="Vista de cuadrícula"><Grid2X2 className="size-4" /></button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-app-secondary"><span><strong className="text-app-text">{filteredSongs.length}</strong> resultados</span><button className="inline-flex items-center gap-2 font-semibold hover:text-brand"><ArrowUpDown className="size-4" /> Actualizadas recientemente</button></div>

      {filteredSongs.length === 0 ? <EmptyLibrary /> : view === "list" ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_100px_120px_44px] gap-4 border-b border-app-border bg-app-surface-muted/60 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-app-secondary md:grid"><span>Canción</span><span>Tono / tempo</span><span>Duración</span><span>Actualización</span><span /></div>
          <div className="divide-y divide-app-border">
            {filteredSongs.map((song) => (
              <a href={`/songs/${encodeURIComponent(song.id)}`} key={song.id} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition hover:bg-app-surface-muted/55 sm:gap-4 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_110px_100px_120px_44px]">
                <div className="flex min-w-0 items-center gap-3.5"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><BookOpenText className="size-5" /></span><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><strong className="block min-w-0 truncate text-sm sm:text-base">{song.title}</strong>{song.status === "pending" ? <CircleDot className="size-3.5 shrink-0 text-app-warning" /> : null}</div><p className="truncate text-xs text-app-secondary sm:text-sm">{song.artist}</p>{contexts.get(song.id) ? <p className="truncate text-xs font-medium text-brand">{contexts.get(song.id)}</p> : null}<div className="mt-1.5 flex gap-1.5 md:hidden">{song.tags.slice(0, 2).map((item) => <Badge key={item}>{item}</Badge>)}</div></div></div>
                <div className="hidden text-sm md:block"><strong>{song.originalKey}</strong><span className="ml-2 text-app-secondary">{song.tempo} bpm</span></div>
                <div className="hidden text-sm text-app-secondary md:block">{song.duration}</div>
                <div className="hidden text-xs text-app-secondary md:block">{dayjs(song.updatedAt).fromNow()}</div>
                <span className="flex size-9 items-center justify-center rounded-lg text-app-secondary group-hover:bg-app-surface group-hover:text-brand"><ChevronRight className="size-4" /></span>
              </a>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSongs.map((song) => <a href={`/songs/${encodeURIComponent(song.id)}`} key={song.id}><Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:border-brand/40"><div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><BookOpenText className="size-5" /></span><MoreHorizontal className="size-5 text-app-secondary" /></div><h2 className="mt-5 font-display text-xl font-bold">{song.title}</h2><p className="mt-1 text-sm text-app-secondary">{song.artist}</p>{contexts.get(song.id) ? <p className="mt-1 truncate text-xs font-medium text-brand">{contexts.get(song.id)}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{song.tags.map((item) => <Badge key={item}>{item}</Badge>)}</div><div className="mt-5 flex items-center gap-4 border-t border-app-border pt-4 text-xs font-semibold text-app-secondary"><span>{song.originalKey}</span><span>{song.tempo} bpm</span><span>{song.duration}</span></div></Card></a>)}
        </div>
      )}
    </div>
  );
}

function EmptyLibrary() {
  return <Card className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><Search className="size-6" /></span><h2 className="mt-5 font-display text-xl font-bold">No encontramos canciones</h2><p className="mt-2 max-w-sm text-sm text-app-secondary">Prueba otra búsqueda o limpia los filtros para volver a ver toda la biblioteca.</p></Card>;
}
