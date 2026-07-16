"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Drum, Gauge, Guitar, KeyboardMusic, ListMusic, Maximize2, Minus, Pause, Play, Plus, Settings2, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSetlist, getSong } from "@/data/demo";
import { transformChordPro, transposeKey } from "@/lib/music";
import type { InstrumentView, Notation } from "@/types/domain";
import { cx } from "@/components/ui/primitives";

const stageInstruments: Array<{ id: InstrumentView; label: string; icon: typeof Guitar }> = [
  { id: "general", label: "General", icon: ListMusic },
  { id: "guitar", label: "Guitarra", icon: Guitar },
  { id: "piano", label: "Piano", icon: KeyboardMusic },
  { id: "drums", label: "Batería", icon: Drum },
];

export function StageView({ setlistId }: { setlistId: string }) {
  const setlist = getSetlist(setlistId);
  const [songIndex, setSongIndex] = useState(0);
  const [instrument, setInstrument] = useState<InstrumentView>("general");
  const [notation, setNotation] = useState<Notation>("latin");
  const [fontSize, setFontSize] = useState(20);
  const [speed, setSpeed] = useState(35);
  const [running, setRunning] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const item = setlist.items[songIndex];
  const song = getSong(item.songId);
  const shift = instrument === "guitar" ? item.transposeSemitones - item.capo : item.transposeSemitones;
  const source = transformChordPro(song.chordProSource, shift, notation, song.originalKey.includes("b"));
  const html = new HtmlDivFormatter().format(new ChordProParser().parse(source));
  const targetKey = transposeKey(song.originalKey, item.transposeSemitones, song.originalKey.includes("b"));

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const target = scrollRef.current;
      if (!target) return;
      target.scrollTop += Math.max(1, speed / 22);
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 2) setRunning(false);
    }, 40);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  const selectSong = (index: number) => {
    setSongIndex(index);
    setRunning(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <main className="stage-gradient flex h-dvh flex-col overflow-hidden text-slate-100">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-3 backdrop-blur-xl sm:h-[4.5rem] sm:px-5">
        <Link href={`/setlists/${setlist.id}`} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Salir del modo escenario"><X className="size-5" /></Link>
        <div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-300">{setlist.name}</p><p className="mt-0.5 truncate text-sm font-semibold text-slate-300">{songIndex + 1} de {setlist.items.length} · {song.title}</p></div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:block">Disponible offline</span>
          <button onClick={() => setControlsOpen((value) => !value)} className={cx("flex size-10 items-center justify-center rounded-xl", controlsOpen ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-800")} aria-label="Mostrar controles"><Settings2 className="size-5" /></button>
          <button onClick={() => document.documentElement.requestFullscreen?.()} className="hidden size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 sm:flex" aria-label="Pantalla completa"><Maximize2 className="size-5" /></button>
        </div>
      </header>

      {controlsOpen ? <div className="shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-3 sm:px-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex overflow-x-auto rounded-xl bg-slate-950 p-1">{stageInstruments.map((entry) => <button key={entry.id} onClick={() => setInstrument(entry.id)} className={cx("flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold", instrument === entry.id ? "bg-indigo-500 text-white" : "text-slate-400")}><entry.icon className="size-4" /> <span className="hidden sm:inline">{entry.label}</span></button>)}</div>
        <div className="flex min-h-11 items-center rounded-xl bg-slate-950"><button onClick={() => setFontSize((value) => Math.max(14, value - 2))} className="flex size-10 items-center justify-center text-slate-400"><Minus className="size-4" /></button><span className="flex items-center gap-1.5 px-1 text-xs font-bold"><Type className="size-4" /> {fontSize}</span><button onClick={() => setFontSize((value) => Math.min(32, value + 2))} className="flex size-10 items-center justify-center text-slate-400"><Plus className="size-4" /></button></div>
        <div className="flex min-h-11 items-center rounded-xl bg-slate-950 p-1"><button onClick={() => setNotation("latin")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "latin" ? "bg-slate-700 text-white" : "text-slate-400")}>Do Re Mi</button><button onClick={() => setNotation("english")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "english" ? "bg-slate-700 text-white" : "text-slate-400")}>C D E</button></div>
        <div className="ml-auto flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-slate-950 px-3 sm:max-w-xs"><Gauge className="size-4 shrink-0 text-indigo-300" /><input type="range" min="0" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="min-w-20 flex-1 accent-indigo-500" aria-label="Velocidad de autoscroll" /><span className="w-7 text-right text-xs font-bold text-slate-300">{speed}</span></div>
        <button onClick={() => setRunning((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white hover:bg-indigo-400">{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pausar" : "Autoscroll"}</button>
      </div></div> : null}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto scroll-smooth px-4 pb-32 pt-8 sm:px-8 sm:pt-12">
          <article className="mx-auto max-w-4xl">
            <header className="mb-10 border-b border-slate-800 pb-7"><div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-indigo-300"><span>Suena en {targetKey}</span>{instrument === "guitar" && item.capo > 0 ? <><span className="text-slate-600">·</span><span>Capo {item.capo}</span></> : null}<span className="text-slate-600">·</span><span>{song.tempo} bpm</span></div><h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">{song.title}</h1><p className="mt-2 text-sm text-slate-400 sm:text-base">{song.artist}</p>{item.note ? <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm font-semibold text-amber-200">{item.note}</p> : null}</header>
            {instrument === "drums" ? <div className="space-y-4">{song.sections.map((section, index) => <div key={section.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><span className="text-xs font-bold uppercase tracking-wider text-indigo-300">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-2 text-2xl font-bold">{section.label}</h2><p className="mt-2 text-slate-400">{song.notes.find((note) => note.sectionId === section.id && note.instrument === "drums")?.content ?? "Mantener dinámica y seguir al líder."}</p></div>)}</div> : <div className="chord-sheet stage-chords whitespace-normal text-slate-200 [&_.chord]:!text-indigo-300 [&_.label]:!bg-indigo-400/10 [&_.label]:!text-indigo-200" style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: html }} />}
          </article>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:inset-x-6 sm:bottom-5">
          <button disabled={songIndex === 0} onClick={() => selectSong(songIndex - 1)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 text-sm font-bold text-slate-200 backdrop-blur disabled:opacity-30 sm:px-4"><ChevronLeft className="size-5" /><span className="hidden sm:inline">Anterior</span></button>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 backdrop-blur"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-extrabold">{songIndex + 1}</span><span className="hidden min-w-0 sm:block"><strong className="block truncate text-xs">{song.title}</strong><span className="block truncate text-[10px] text-slate-400">{songIndex + 1} de {setlist.items.length}</span></span></div>
          <button disabled={songIndex === setlist.items.length - 1} onClick={() => selectSong(songIndex + 1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-indigo-500 px-3 text-sm font-bold text-white disabled:opacity-30 sm:px-4"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="size-5" /></button>
        </div>
      </div>
    </main>
  );
}
