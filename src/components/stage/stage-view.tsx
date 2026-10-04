"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Gauge, ListMusic, LoaderCircle, Maximize2, MicVocal, Minimize2, Minus, Pause, Play, Plus, Settings2, Type, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { sanitizeChordSheetHtml } from "@/lib/chordpro";
import { getSetlistRecord, listSongs, type SetlistRecord, type SongRecord } from "@/lib/indexed-db";
import { formatSignedSemitones, formatTransposeInterval, transformChordPro, transposeKey } from "@/lib/music";
import { addStageSectionLabels, getSingerSections, getStageJumpSections } from "@/lib/stage-lyrics";
import type { Notation } from "@/types/domain";
import { cx } from "@/components/ui/primitives";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";

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
  const pwaInstall = usePwaInstall();
  const [songIndex, setSongIndex] = useState(0);
  const [transposeOverrides, setTransposeOverrides] = useState<Record<string, number>>({});
  const [notation, setNotation] = useState<Notation>("english");
  const [fontSize, setFontSize] = useState(20);
  const [speed, setSpeed] = useState(35);
  const [running, setRunning] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [jumpMenuHidden, setJumpMenuHidden] = useState(false);
  const [singer, setSinger] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [highlightCycle, setHighlightCycle] = useState(0);
  const [highlightBounds, setHighlightBounds] = useState<{ top: number; height: number } | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const jumpScrollTargetRef = useRef<number | null>(null);
  const jumpScrollTimerRef = useRef<number | null>(null);
  const item = setlist.items[Math.min(songIndex, setlist.items.length - 1)];
  const song = songs.find((entry) => entry.id === item.songId)!;
  const transpose = transposeOverrides[item.id] ?? item.transposeSemitones;
  const source = transformChordPro(song.chordProSource, transpose, notation, song.originalKey.includes("b"));
  const targetKey = transposeKey(song.originalKey, transpose, song.originalKey.includes("b"));
  const singerSections = getSingerSections(song.chordProSource);
  const jumpSections = getStageJumpSections(song.chordProSource, song.sections);
  const html = sanitizeChordSheetHtml(new HtmlDivFormatter().format(new ChordProParser().parse(addStageSectionLabels(source, jumpSections))));

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!running) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    let frame = 0;
    let lastTime: number | null = null;
    let position = scroller.scrollTop;
    const advance = (now: number) => {
      if (lastTime !== null) {
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        position = Math.min(maxScroll, Math.max(position, scroller.scrollTop) + speed * 1.1 * Math.min(now - lastTime, 100) / 1000);
        scroller.scrollTop = position;
        if (position >= maxScroll - 1) {
          setRunning(false);
          return;
        }
      }
      lastTime = now;
      frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [running, speed]);

  useEffect(() => {
    if (!jumpMenuHidden) return;
    const showMenuOnKeyboardScroll = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) setJumpMenuHidden(false);
    };
    window.addEventListener("keydown", showMenuOnKeyboardScroll);
    return () => window.removeEventListener("keydown", showMenuOnKeyboardScroll);
  }, [jumpMenuHidden]);

  useEffect(() => () => {
    if (jumpScrollTimerRef.current !== null) window.clearTimeout(jumpScrollTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    if (activeSection === null) return;
    const focusJumpSections = getStageJumpSections(song.chordProSource, song.sections);
    const focusSingerSections = getSingerSections(song.chordProSource);
    const scroller = scrollRef.current;
    const article = articleRef.current;
    const section = focusJumpSections[activeSection];
    if (!scroller || !article || !section) return;
    let target: Element | null | undefined;
    let lastTarget: Element | null | undefined;
    const occurrence = focusJumpSections.slice(0, activeSection).filter((entry) => entry.label === section.label).length;
    if (singer) {
      const matching = focusSingerSections.filter((entry) => entry.label === section.label);
      const sourceIndex = matching[occurrence]?.sourceIndex;
      if (sourceIndex !== undefined) target = scroller.querySelector(`[data-stage-section="${sourceIndex}"]`);
    } else {
      const markerSelector = section.origin === "comment" ? ".paragraph .comment" : section.origin === "directive" ? ".paragraph .label" : ".paragraph .label, .paragraph .comment";
      const matching = [...scroller.querySelectorAll(markerSelector)].filter((marker) => marker.textContent?.trim() === section.label);
      const markerOccurrence = focusJumpSections.slice(0, activeSection).filter((entry) => entry.label === section.label && (section.origin === "saved" || entry.origin === section.origin)).length;
      const marker = matching[markerOccurrence];
      target = marker?.classList.contains("label") ? marker.closest(".paragraph") : marker?.closest(".row");
      if (section.origin === "directive" && section.sourceType) {
        const directiveOccurrence = focusJumpSections.slice(0, activeSection).filter((entry) => entry.origin === "directive" && entry.sourceType === section.sourceType).length;
        target ??= scroller.querySelectorAll(`.paragraph.${section.sourceType}`)[directiveOccurrence];
      }
    }
    if (!target && activeSection === 0) target = scroller.querySelector(singer ? "[data-stage-section]" : ".paragraph");
    if (!target) {
      setHighlightBounds(null);
      return;
    }
    if (!singer) {
      const firstParagraph = target.closest(".paragraph");
      const sectionComments = new Set(focusJumpSections.filter((entry) => entry.origin === "comment").map((entry) => entry.label));
      const isSectionMarker = (row: Element) => {
        if (row.querySelector(".label")) return true;
        const comment = row.querySelector(".comment")?.textContent?.trim();
        return Boolean(comment && sectionComments.has(comment));
      };
      let paragraph = firstParagraph;
      let stopped = false;
      while (paragraph?.classList.contains("paragraph") && !stopped) {
        if (paragraph !== firstParagraph) {
          if (section.origin === "directive" && section.sourceType && !paragraph.classList.contains(section.sourceType)) break;
          if (section.origin === "comment" && paragraph.classList.length > 1) break;
        }
        const rows = [...paragraph.children].filter((child) => child.classList.contains("row"));
        const startRow = paragraph === firstParagraph && target.classList.contains("row") ? rows.indexOf(target) : 0;
        for (let rowIndex = Math.max(0, startRow); rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          if ((paragraph !== firstParagraph || rowIndex > startRow) && isSectionMarker(row)) { stopped = true; break; }
          lastTarget = row;
        }
        paragraph = paragraph.nextElementSibling;
      }
    }
    const firstBounds = target.getBoundingClientRect();
    const lastBounds = (lastTarget ?? target).getBoundingClientRect();
    const articleBounds = article.getBoundingClientRect();
    setHighlightBounds({ top: firstBounds.top - articleBounds.top - 8, height: lastBounds.bottom - firstBounds.top + 16 });
    const requestedTop = scroller.scrollTop + firstBounds.top - scroller.getBoundingClientRect().top - (controlsOpen ? 12 : 16);
    const targetTop = Math.max(0, Math.min(requestedTop, scroller.scrollHeight - scroller.clientHeight));
    if (jumpScrollTimerRef.current !== null) window.clearTimeout(jumpScrollTimerRef.current);
    jumpScrollTargetRef.current = Math.abs(scroller.scrollTop - targetTop) > 2 ? targetTop : null;
    if (jumpScrollTargetRef.current !== null) {
      jumpScrollTimerRef.current = window.setTimeout(() => { jumpScrollTargetRef.current = null; jumpScrollTimerRef.current = null; }, 1600);
      scroller.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  }, [activeSection, controlsOpen, highlightCycle, fontSize, html, singer, song.chordProSource, song.sections]);

  const clearSectionHighlight = () => {
    setActiveSection(null);
    setHighlightBounds(null);
    setJumpMenuHidden(false);
  };

  const selectSong = (index: number) => {
    if (index < 0 || index >= setlist.items.length) return;
    clearSectionHighlight();
    setSongIndex(index);
    setRunning(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled && stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen({ navigationUI: "hide" });
      } else {
        await showFullscreenFallback();
      }
    } catch {
      await showFullscreenFallback();
    }
  };

  const showFullscreenFallback = async () => {
    setControlsOpen(false);
    const standalone = window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      toast.info("Vista ampliada", { description: "Se ocultaron los controles para dar más espacio a la canción." });
    } else {
      toast.info("La pantalla completa depende del navegador", { description: "Instala WorshipNotes y ábrela desde su icono para usarla sin barras." });
      await pwaInstall.install();
    }
  };

  const jumpToSection = (index: number) => {
    setRunning(false);
    setJumpMenuHidden(true);
    setActiveSection(index);
    setHighlightCycle((value) => value + 1);
  };

  const showJumpMenuOutsideNav = (target: EventTarget | null) => {
    if (jumpMenuHidden && target instanceof Element && !target.closest("[data-stage-jump-nav]")) {
      jumpScrollTargetRef.current = null;
      setJumpMenuHidden(false);
    }
  };

  const showJumpMenuOnScroll = () => {
    if (jumpMenuHidden && jumpScrollTargetRef.current === null) setJumpMenuHidden(false);
  };

  const toggleSinger = () => {
    clearSectionHighlight();
    setSinger((value) => !value);
  };

  const changeTranspose = (semitones: number) => {
    clearSectionHighlight();
    setTransposeOverrides((current) => ({
      ...current,
      [item.id]: Math.max(-11, Math.min(11, (current[item.id] ?? item.transposeSemitones) + semitones)),
    }));
  };

  return (
    <main ref={stageRef} onPointerDownCapture={(event) => showJumpMenuOutsideNav(event.target)} onTouchStartCapture={(event) => showJumpMenuOutsideNav(event.target)} onWheelCapture={(event) => showJumpMenuOutsideNav(event.target)} className="stage-gradient relative flex h-dvh flex-col overflow-hidden text-slate-100">
      {controlsOpen ? <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-3 backdrop-blur-xl sm:h-16 sm:px-5">
        <Link href={`/setlists/${setlist.id}`} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Salir del modo escenario"><X className="size-5" /></Link>
        <div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-wider text-indigo-300">{setlist.name}</p><p className="mt-0.5 truncate text-sm font-semibold text-slate-300">{songIndex + 1} de {setlist.items.length} · {song.title}</p></div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setControlsOpen(false)} className="flex size-10 items-center justify-center rounded-xl bg-indigo-500 text-white" aria-label="Ocultar controles" title="Ocultar controles"><Settings2 className="size-5" /></button>
          <button onClick={() => void toggleFullscreen()} className="flex size-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800" aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}</button>
        </div>
      </header> : !jumpMenuHidden ? <div className="pointer-events-none absolute left-2 top-2 z-30 flex gap-1">
        <button onClick={() => setControlsOpen(true)} className="pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90" aria-label="Mostrar controles" title="Mostrar controles"><Settings2 className="size-4" /></button>
        <div className="pointer-events-auto flex h-9 items-center rounded-xl border border-slate-700 bg-slate-950/90"><button onClick={() => changeTranspose(-1)} disabled={transpose <= -11} className="flex size-8 items-center justify-center disabled:opacity-30" aria-label="Bajar un semitono"><Minus className="size-4" /></button><span className="min-w-8 text-center text-[11px] font-bold">{targetKey}</span><button onClick={() => changeTranspose(1)} disabled={transpose >= 11} className="flex size-8 items-center justify-center disabled:opacity-30" aria-label="Subir un semitono"><Plus className="size-4" /></button></div>
        <button onClick={toggleSinger} className={cx("pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90", singer && "text-indigo-300")} aria-label={singer ? "Mostrar acordes" : "Modo cantante"} title="Modo cantante"><MicVocal className="size-4" /></button>
        <button onClick={() => void toggleFullscreen()} className="pointer-events-auto flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/90" aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
      </div> : null}

      {controlsOpen ? <div className="shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 sm:px-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <button onClick={toggleSinger} className={cx("flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold", singer ? "bg-indigo-500 text-white" : "bg-slate-950 text-slate-300")} aria-pressed={singer}><MicVocal className="size-4" /> Cantante</button>
        <div className="flex min-h-11 items-center rounded-xl bg-slate-950"><button onClick={() => setFontSize((value) => Math.max(14, value - 2))} className="flex size-10 items-center justify-center text-slate-400"><Minus className="size-4" /></button><span className="flex items-center gap-1.5 px-1 text-xs font-bold"><Type className="size-4" /> {fontSize}</span><button onClick={() => setFontSize((value) => Math.min(32, value + 2))} className="flex size-10 items-center justify-center text-slate-400"><Plus className="size-4" /></button></div>
        <div className="flex min-h-11 items-center rounded-xl bg-slate-950"><span className="pl-3 text-xs font-bold text-slate-400">Tono</span><button onClick={() => changeTranspose(-1)} disabled={transpose <= -11} className="flex size-10 items-center justify-center text-slate-300 disabled:opacity-30" aria-label="Bajar un semitono"><Minus className="size-4" /></button><span className="min-w-12 text-center text-xs font-bold" aria-live="polite">{targetKey} <span className="text-slate-400">{formatSignedSemitones(transpose)}</span></span><button onClick={() => changeTranspose(1)} disabled={transpose >= 11} className="flex size-10 items-center justify-center text-slate-300 disabled:opacity-30" aria-label="Subir un semitono"><Plus className="size-4" /></button></div>
        {!singer ? <div className="flex min-h-11 items-center rounded-xl bg-slate-950 p-1"><button onClick={() => { clearSectionHighlight(); setNotation("latin"); }} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "latin" ? "bg-slate-700 text-white" : "text-slate-400")}>Do Re Mi</button><button onClick={() => { clearSectionHighlight(); setNotation("english"); }} className={cx("h-9 rounded-lg px-3 text-xs font-bold", notation === "english" ? "bg-slate-700 text-white" : "text-slate-400")}>C D E</button></div> : null}
        <div className="ml-auto flex min-h-11 flex-1 items-center gap-3 rounded-xl bg-slate-950 px-3 sm:max-w-xs"><Gauge className="size-4 shrink-0 text-indigo-300" /><input type="range" min="0" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="min-w-20 flex-1 accent-indigo-500" aria-label="Velocidad de autoscroll" /><span className="w-7 text-right text-xs font-bold text-slate-300">{speed}</span></div>
        <button onClick={() => setRunning((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white hover:bg-indigo-400">{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pausar" : "Autoscroll"}</button>
      </div></div> : null}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={showJumpMenuOnScroll} className={cx("h-full overflow-x-hidden overflow-y-auto", controlsOpen ? "px-4 pb-24 pt-5 sm:px-8 sm:pt-7" : "pb-14 pl-4 pr-14 pt-14 sm:pl-8 sm:pr-16")}>
          <article ref={articleRef} className="relative isolate mx-auto max-w-4xl break-words">
            {highlightBounds && activeSection !== null ? <div key={`${song.id}-${activeSection}-${highlightCycle}`} className="stage-section-highlight" style={{ top: highlightBounds.top, height: highlightBounds.height }} aria-hidden="true" /> : null}
            <header className="relative z-10 mb-5 border-b border-slate-800 pb-4"><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-300"><span>{singer ? "Solo letra" : `Suena en ${targetKey}`}</span>{!singer ? <span>· {song.tempo} bpm</span> : null}</div>{!singer ? <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatTransposeInterval(transpose)} · original {song.originalKey}</p> : null}<h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{song.title}</h1><p className="mt-1 text-xs text-slate-400">{song.artist}</p>{item.note ? <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-xs font-semibold text-amber-200">{item.note}</p> : null}</header>
            {singer ? (
              <div className="stage-singer relative z-10 space-y-5" style={{ fontSize: `${fontSize}px`, lineHeight: 1.32 }}>
                {singerSections.map((section, index) => <section key={index} data-stage-section={section.sourceIndex} className="scroll-mt-3"><h2 className="stage-singer-label">{section.label}</h2><p className="whitespace-pre-wrap">{section.lines.join("\n")}</p></section>)}
              </div>
            ) : <div className="chord-sheet stage-chords relative z-10 text-slate-200 [&_.chord]:!text-indigo-300" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: html }} />}
          </article>
        </div>

        {!controlsOpen && jumpSections.length ? <nav data-stage-jump-nav aria-label="Ir a sección" className="absolute right-[5px] top-1/2 z-20 flex max-h-[70vh] -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-xl bg-slate-950/80 p-1 shadow-xl backdrop-blur-sm">{jumpSections.map((section, index) => {
          const number = section.label.match(/\d+/)?.[0] ?? String(jumpSections.slice(0, index + 1).filter((entry) => entry.type === section.type).length);
          const shortcut = section.type === "verse" ? `V${number}` : section.type === "chorus" ? "C" : section.type === "bridge" ? "P" : section.type === "prechorus" ? "PC" : section.type === "intro" ? "I" : section.type === "outro" ? "F" : "M";
          return <button key={section.id} onClick={() => jumpToSection(index)} className={cx("flex size-9 shrink-0 items-center justify-center rounded-lg border text-[10px] font-extrabold transition", activeSection === index ? "border-indigo-200 bg-indigo-400 text-slate-950 ring-2 ring-white/65" : "border-slate-700 bg-slate-900/90 text-indigo-200 hover:bg-indigo-500 hover:text-white")} aria-label={`Ir a ${section.label}`} aria-pressed={activeSection === index} title={section.label}>{shortcut}</button>;
        })}</nav> : null}
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
