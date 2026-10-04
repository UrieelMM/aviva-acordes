"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Drum, Gauge, Guitar, KeyboardMusic, ListMusic, LoaderCircle, Maximize2, MicVocal, Minimize2, Minus, Pause, Play, Plus, Settings2, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { sanitizeChordSheetHtml } from "@/lib/chordpro";
import { getSetlistRecord, listSongs, type SetlistRecord, type SongRecord } from "@/lib/indexed-db";
import { formatTransposeInterval, transformChordPro, transposeKey } from "@/lib/music";
import { getSingerSections } from "@/lib/stage-lyrics";
import type { InstrumentView, Notation, SongSection } from "@/types/domain";
import { cx } from "@/components/ui/primitives";

const stageInstruments: Array<{ id: InstrumentView; label: string; icon: typeof Guitar }> = [
  { id: "general", label: "General", icon: ListMusic },
  { id: "guitar", label: "Guitarra", icon: Guitar },
  { id: "piano", label: "Piano", icon: KeyboardMusic },
  { id: "drums", label: "Batería", icon: Drum },
];

export function StageView({ setlistId }: { setlistId: string }) {
  const setlist = useLiveQuery(() => getSetlistRecord(setlistId), [setlistId], null);
  const songs = useLiveQuery(() => listSongs(), [], []);
  if (setlist === null) return <main className="stage-gradient flex h-dvh items-center justify-center"><LoaderCircle className="size-8 animate-spin text-indigo-300" /></main>;
  if (!setlist) return <main className="stage-gradient flex h-dvh flex-col items-center justify-center p-8 text-center text-slate-100"><ListMusic className="size-12 text-slate-500" /><h1 className="mt-4 text-2xl font-bold">Setlist no encontrado</h1><Link href="/setlists" className="mt-5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold">Volver a setlists</Link></main>;
  const availableItems = setlist.items.filter((item) => songs.some((song) => song.id === item.songId));
  if (!availableItems.length) return <main className="stage-gradient flex h-dvh flex-col items-center justify-center p-8 text-center text-slate-100"><ListMusic className="size-12 text-slate-500" /><h1 className="mt-4 text-2xl font-bold">Este setlist no tiene canciones disponibles</h1><Link href={`/setlists/${setlist.id}`} className="mt-5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold">Editar setlist</Link></main>;
  return <StageContent key={setlist.id} setlist={{ ...setlist, items: availableItems }} songs={songs} />;
}

function StageContent({ setlist, songs }: { setlist: SetlistRecord; songs: SongRecord[] }) {
  const [songIndex, setSongIndex] = useState(0);
  const [instrument, setInstrument] = useState<InstrumentView>("general");
  const [notation, setNotation] = useState<Notation>("latin");
  const [fontSize, setFontSize] = useState(20);
  const [speed, setSpeed] = useState(35);
  const [running, setRunning] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [singer, setSinger] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const item = setlist.items[Math.min(songIndex, setlist.items.length - 1)];
  const song = songs.find((entry) => entry.id === item.songId)!;
  const shift = instrument === "guitar" ? item.transposeSemitones - item.capo : item.transposeSemitones;
  const source = transformChordPro(song.chordProSource, shift, notation, song.originalKey.includes("b"));
  const html = sanitizeChordSheetHtml(new HtmlDivFormatter().format(new ChordProParser().parse(source)));
  const targetKey = transposeKey(song.originalKey, item.transposeSemitones, song.originalKey.includes("b"));
  const singerSections = getSingerSections(song.chordProSource);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
    if (index < 0 || index >= setlist.items.length) return;
    setSongIndex(index);
    setRunning(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen();
      else toast.error("Este navegador no permite pantalla completa desde la página.");
    } catch {
      toast.error("El navegador no permitió abrir pantalla completa.");
    }
  };

  const jumpToSection = (section: SongSection, index: number) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let target: Element | null | undefined;
    const occurrence = song.sections.slice(0, index).filter((entry) => entry.label === section.label).length;
    if (singer) {
      const matching = singerSections.filter((entry) => entry.label === section.label);
      const sourceIndex = matching[occurrence]?.sourceIndex;
      if (sourceIndex !== undefined) target = scroller.querySelector(`[data-stage-section="${sourceIndex}"]`);
    } else if (instrument === "drums") target = scroller.querySelector(`[data-stage-section="${index}"]`);
    else {
      const matching = [...scroller.querySelectorAll(".paragraph .label")].filter((label) => label.textContent?.trim() === section.label);
      target = matching[occurrence]?.closest(".paragraph");
    }
    if (!target && index === 0) target = scroller.querySelector(singer ? "[data-stage-section]" : ".paragraph");
    if (target) scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12, behavior: "smooth" });
  };

  return (
    <main ref={stageRef} className="stage-gradient relative flex h-dvh flex-col overflow-hidden text-slate-100">
      {controlsOpen ? <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-3 backdrop-blur-xl sm:h-16 sm:px-5">
        <Link href={`/setlists/${setlist.id}`} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Salir del modo escenario"><X className="size-5" /></Link>
        <div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-300">{setlist.name}</p><p className="mt-0.5 truncate text-sm font-semibold text-slate-300">{songIndex + 1} de {setlist.items.length} · {song.title}</p></div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setControlsOpen(false)} className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 text-white" aria-label="Ocultar controles" title="Ocultar controles"><Settings2 className="size-5" /></button>
          <button onClick={() => void toggleFullscreen()} className="flex size-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800" aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}</button>
        </div>
      </header> : <div className="pointer-events-none absolute left-2 top-2 z-30 flex gap-1">
        <button onClick={() => setControlsOpen(true)} className="pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90" aria-label="Mostrar controles" title="Mostrar controles"><Settings2 className="size-4" /></button>
        <button onClick={() => setSinger((value) => !value)} className={cx("pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90", singer && "text-indigo-300")} aria-label={singer ? "Mostrar acordes" : "Modo cantante"} title="Modo cantante"><MicVocal className="size-4" /></button>
        <button onClick={() => void toggleFullscreen()} className="pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90" aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
      </div>}

      {controlsOpen ? <div className="shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 sm:px-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <div className="flex overflow-x-auto rounded-xl bg-slate-950 p-1">{stageInstruments.map((entry) => <button key={entry.id} onClick={() => setInstrument(entry.id)} className={cx("flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold", instrument === entry.id ? "bg-indigo-500 text-white" : "text-slate-400")}><entry.icon className="size-4" /> <span className="hidden sm:inline">{entry.label}</span></button>)}</div>
        <button onClick={() => setSinger((value) => !value)} className={cx("flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold", singer ? "bg-indigo-500 text-white" : "bg-slate-950 text-slate-300")} aria-pressed={singer}><MicVocal className="size-4" /> Cantante</button>
        <div className="flex min-h-11 items-center rounded-xl bg-slate-950"><button onClick={() => setFontSize((value) => Math.max(14, value - 2))} className="flex size-10 items-center justify-center text-slate-400"><Minus className="size-4" /></button><span className="flex items-center gap-1.5 px-1 text-xs font-bold"><Type className="size-4" /> {fontSize}</span><button onClick={() => setFontSize((value) => Math.min(32, value + 2))} className="flex size-10 items-center justify-center text-slate-400"><Plus className="size-4" /></button></div>
        {!singer ? <div className="flex min-h-11 items-center rounded-xl bg-slate-950 p-1"><button onClick={() => setNotation("latin")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "latin" ? "bg-slate-700 text-white" : "text-slate-400")}>Do Re Mi</button><button onClick={() => setNotation("english")} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "english" ? "bg-slate-700 text-white" : "text-slate-400")}>C D E</button></div> : null}
        <div className="ml-auto flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-slate-950 px-3 sm:max-w-xs"><Gauge className="size-4 shrink-0 text-indigo-300" /><input type="range" min="0" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="min-w-20 flex-1 accent-indigo-500" aria-label="Velocidad de autoscroll" /><span className="w-7 text-right text-xs font-bold text-slate-300">{speed}</span></div>
        <button onClick={() => setRunning((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white hover:bg-indigo-400">{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pausar" : "Autoscroll"}</button>
      </div></div> : null}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className={cx("h-full overflow-y-auto scroll-smooth px-4 sm:px-8", controlsOpen ? "pb-24 pt-5 sm:pt-7" : "pb-14 pt-14")}>
          <article className="mx-auto max-w-4xl">
            <header className="mb-5 border-b border-slate-800 pb-4"><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-300"><span>{singer ? "Solo letra" : `Suena en ${targetKey}`}</span>{!singer && instrument === "guitar" && item.capo > 0 ? <span>· Capo {item.capo}</span> : null}{!singer ? <span>· {song.tempo} bpm</span> : null}</div>{!singer ? <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatTransposeInterval(item.transposeSemitones)} · original {song.originalKey}</p> : null}<h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{song.title}</h1><p className="mt-1 text-xs text-slate-400">{song.artist}</p>{item.note ? <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-xs font-semibold text-amber-200">{item.note}</p> : null}</header>
            {singer ? <div className="space-y-4" style={{ fontSize: `${fontSize}px`, lineHeight: 1.32 }}>{singerSections.map((section, index) => <section key={index} data-stage-section={section.sourceIndex} className="scroll-mt-3"><h2 className="mb-1 text-[0.65em] font-extrabold uppercase tracking-wider text-indigo-300">{section.label}</h2><p className="whitespace-pre-wrap">{section.lines.join("\n")}</p></section>)}</div> : instrument === "drums" ? <div className="space-y-3">{song.sections.map((section, index) => <div key={section.id} data-stage-section={index} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><span className="text-xs font-bold uppercase tracking-wider text-indigo-300">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-1 text-xl font-bold">{section.label}</h2><p className="mt-1 text-sm text-slate-400">{song.notes.find((note) => note.sectionId === section.id && note.instrument === "drums")?.content ?? "Mantener dinámica y seguir al líder."}</p></div>)}</div> : <div className="chord-sheet stage-chords text-slate-200 [&_.chord]:!text-indigo-300 [&_.label]:!bg-indigo-400/10 [&_.label]:!text-indigo-200" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: html }} />}
          </article>
        </div>

        {!controlsOpen && song.sections.length ? <nav aria-label="Ir a sección" className="absolute right-[5px] top-1/2 z-20 flex max-h-[70vh] -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-xl bg-slate-950/80 p-1 shadow-xl backdrop-blur-sm">{song.sections.map((section, index) => <button key={section.id} onClick={() => jumpToSection(section, index)} className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-[10px] font-extrabold text-indigo-200 hover:bg-indigo-500 hover:text-white" aria-label={`Ir a ${section.label}`} title={section.label}>{section.type === "chorus" ? "C" : section.type === "verse" ? `V${song.sections.slice(0, index + 1).filter((entry) => entry.type === "verse").length}` : section.type === "bridge" ? "P" : section.type === "prechorus" ? "PC" : section.type === "intro" ? "I" : "F"}</button>)}</nav> : null}
        {controlsOpen ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" /> : null}
        {controlsOpen ? <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:inset-x-6 sm:bottom-5">
          <button disabled={songIndex === 0} onClick={() => selectSong(songIndex - 1)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 text-sm font-bold text-slate-200 backdrop-blur disabled:opacity-30 sm:px-4"><ChevronLeft className="size-5" /><span className="hidden sm:inline">Anterior</span></button>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 backdrop-blur"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-extrabold">{songIndex + 1}</span><span className="hidden min-w-0 sm:block"><strong className="block truncate text-xs">{song.title}</strong><span className="block truncate text-[10px] text-slate-400">{songIndex + 1} de {setlist.items.length}</span></span></div>
          <button disabled={songIndex === setlist.items.length - 1} onClick={() => selectSong(songIndex + 1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-indigo-500 px-3 text-sm font-bold text-white disabled:opacity-30 sm:px-4"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="size-5" /></button>
        </div> : <div className="absolute bottom-2 left-2 z-20 flex gap-1"><button onClick={() => selectSong(songIndex - 1)} disabled={songIndex === 0} className="flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90 disabled:opacity-30" aria-label="Canción anterior"><ChevronLeft className="size-4" /></button><button onClick={() => selectSong(songIndex + 1)} disabled={songIndex === setlist.items.length - 1} className="flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90 disabled:opacity-30" aria-label="Canción siguiente"><ChevronRight className="size-4" /></button></div>}
      </div>
    </main>
  );
}
