"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { AudioLines, BookOpen, Drum, Edit3, Guitar, KeyboardMusic, Minus, MoreHorizontal, Music, Plus, RotateCcw, StickyNote, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui/primitives";
import { getSongRecord, type SongRecord } from "@/lib/indexed-db";
import { transformChordPro, transposeKey } from "@/lib/music";
import { playReferenceTone } from "@/lib/tone";
import { useUiStore } from "@/stores/ui-store";
import type { InstrumentView } from "@/types/domain";

const instruments: Array<{ id: InstrumentView; label: string; icon: typeof Music }> = [
  { id: "general", label: "General", icon: BookOpen },
  { id: "guitar", label: "Guitarra", icon: Guitar },
  { id: "piano", label: "Piano", icon: KeyboardMusic },
  { id: "bass", label: "Bajo", icon: AudioLines },
  { id: "drums", label: "Batería", icon: Drum },
];

export function SongViewer({ songId }: { songId: string }) {
  const song = useLiveQuery(() => getSongRecord(songId), [songId], null);

  if (song === null) return <Card className="min-h-[520px] animate-pulse bg-app-surface-muted"><span className="sr-only">Cargando canción</span></Card>;
  if (!song) return <Card className="flex min-h-[420px] items-center justify-center p-8 text-center"><div><h1 className="font-display text-2xl font-bold">Canción no encontrada</h1><p className="mt-2 text-sm text-app-secondary">Puede haber sido eliminada o aún no está disponible offline.</p></div></Card>;

  return <SongViewerContent song={song} />;
}

function SongViewerContent({ song }: { song: SongRecord }) {
  const notation = useUiStore((state) => state.notation);
  const setNotation = useUiStore((state) => state.setNotation);
  const instrument = useUiStore((state) => state.instrument);
  const setInstrument = useUiStore((state) => state.setInstrument);
  const [transpose, setTranspose] = useState(0);
  const [capo, setCapo] = useState(0);
  const displayShift = instrument === "guitar" ? transpose - capo : transpose;
  const transformed = transformChordPro(song.chordProSource, displayShift, notation, song.originalKey.includes("b"));
  const html = new HtmlDivFormatter().format(new ChordProParser().parse(transformed));
  const targetKey = transposeKey(song.originalKey, transpose, song.originalKey.includes("b"));
  const formsKey = transposeKey(song.originalKey, displayShift, song.originalKey.includes("b"));
  const visibleNotes = song.notes.filter((note) => note.instrument === "general" || note.instrument === instrument);

  return (
    <div className="space-y-6">
      <PageHeader backHref="/songs" eyebrow="Canción" title={song.title} description={song.artist} action={<div className="flex gap-2"><Button variant="secondary" size="icon"><MoreHorizontal className="size-4" /></Button><Link href={`/songs/${song.id}/edit`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"><Edit3 className="size-4" /> Editar</Link></div>} />

      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-app-border p-2 sm:px-4">
          {instruments.map((item) => <button key={item.id} onClick={() => setInstrument(item.id)} className={cx("flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold transition", instrument === item.id ? "bg-brand-soft text-brand-ink" : "text-app-secondary hover:bg-app-surface-muted")}><item.icon className="size-4" /> {item.label}</button>)}
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">Suena en {targetKey}</Badge>{instrument === "guitar" && capo > 0 ? <Badge>Formas en {formsKey}</Badge> : null}{instrument === "guitar" && capo > 0 ? <Badge tone="warning">Capo {capo}</Badge> : null}<span className="text-xs text-app-secondary">{song.tempo} bpm · {song.timeSignature} · {song.duration}</span></div>
          <ControlGroup label="Transponer"><button onClick={() => setTranspose((value) => Math.max(-11, value - 1))}><Minus /></button><strong>{transpose > 0 ? `+${transpose}` : transpose}</strong><button onClick={() => setTranspose((value) => Math.min(11, value + 1))}><Plus /></button></ControlGroup>
          {instrument === "guitar" ? <ControlGroup label="Capo"><button onClick={() => setCapo((value) => Math.max(0, value - 1))}><Minus /></button><strong>{capo}</strong><button onClick={() => setCapo((value) => Math.min(11, value + 1))}><Plus /></button></ControlGroup> : null}
          <div className="flex min-h-10 rounded-xl bg-app-surface-muted p-1"><button onClick={() => setNotation("latin")} className={cx("rounded-lg px-3 text-xs font-extrabold", notation === "latin" && "bg-app-surface text-brand shadow-sm")}>Do Re Mi</button><button onClick={() => setNotation("english")} className={cx("rounded-lg px-3 text-xs font-extrabold", notation === "english" && "bg-app-surface text-brand shadow-sm")}>C D E</button></div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-brand">{instrument === "general" ? "Vista general" : `Vista de ${instruments.find((item) => item.id === instrument)?.label}`}</p><p className="mt-1 text-xs text-app-secondary">Las transformaciones son visuales; el original está intacto.</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setTranspose(0); setCapo(0); }} aria-label="Restablecer"><RotateCcw className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => playReferenceTone().then(() => toast.success("Referencia tonal reproducida"))} aria-label="Reproducir tono"><Volume2 className="size-4" /></Button></div></div>
          <article className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-12">
            <header className="mb-9 border-b border-app-border pb-6"><h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{song.title}</h2><p className="mt-2 text-app-secondary">{song.artist}</p></header>
            {instrument === "drums" ? <DrumArrangement /> : <div className="chord-sheet text-base leading-9 sm:text-lg sm:leading-10" dangerouslySetInnerHTML={{ __html: html }} />}
          </article>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><StickyNote className="size-4 text-brand" /> Notas del arreglo</h2><button className="text-xs font-bold text-brand">+ Agregar</button></div><div className="mt-5 space-y-3">{visibleNotes.length ? visibleNotes.map((note) => <div key={note.id} className="rounded-xl bg-app-surface-muted p-3.5"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" /><p className="text-[11px] font-extrabold uppercase tracking-wider text-app-secondary">{song.sections.find((section) => section.id === note.sectionId)?.label ?? "General"}</p></div><p className="mt-2 text-sm leading-6">{note.content}</p></div>) : <p className="rounded-xl border border-dashed border-app-border p-5 text-center text-sm text-app-secondary">No hay notas para esta vista.</p>}</div></Card>
          <Card className="p-5"><h2 className="font-display text-lg font-bold">Detalles</h2><dl className="mt-4 space-y-3 text-sm"><Detail label="Tonalidad original" value={song.originalKey} /><Detail label="Tempo" value={`${song.tempo} bpm`} /><Detail label="Compás" value={song.timeSignature} /><Detail label="Etiquetas" value={song.tags.join(", ")} /></dl></Card>
        </aside>
      </div>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex min-h-10 items-center rounded-xl border border-app-border bg-app-surface"><span className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-app-secondary">{label}</span><div className="flex h-full items-center border-l border-app-border [&_button]:flex [&_button]:size-9 [&_button]:items-center [&_button]:justify-center [&_button]:text-app-secondary [&_button_svg]:size-3.5"><>{children}</></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4"><dt className="text-app-secondary">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>; }

function DrumArrangement() {
  return <div className="space-y-4">{[["Intro", "4 compases · Cross stick, entrada suave"], ["Verso 1", "Hi-hat cerrado · Kick en 1 y 3"], ["Coro", "Abrir hi-hat · Snare completo"], ["Puente", "Build con toms · segunda vuelta full"]].map(([section, note], index) => <div key={section} className="flex gap-4 rounded-2xl border border-app-border p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand-ink">{index + 1}</span><div><h3 className="font-bold">{section}</h3><p className="mt-1 text-sm text-app-secondary">{note}</p></div></div>)}</div>;
}
