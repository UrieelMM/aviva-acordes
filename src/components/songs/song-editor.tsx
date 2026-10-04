"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  Archive,
  BadgeHelp,
  BookOpen,
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCopy,
  Columns3,
  Copy,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  Guitar,
  Import,
  ListMusic,
  LoaderCircle,
  Menu,
  MessageSquareWarning,
  Minus,
  Music2,
  PanelRight,
  Plus,
  Redo2,
  Replace,
  RotateCcw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { SongEditorTutorial } from "@/components/songs/song-editor-tutorial";
import { SongTextImportDialog } from "@/components/songs/song-text-import-dialog";
import { Button, Card, ConfirmModal, cx } from "@/components/ui/primitives";
import {
  chordProToPlainLyrics,
  createChordProTemplate,
  extractSections,
  formatChordProSource,
  getChordProDirectiveValue,
  MAX_CHORDPRO_SOURCE_LENGTH,
  parseChordProMetadata,
  sanitizeChordSheetHtml,
  updateChordProDirective,
  validateChordPro,
} from "@/lib/chordpro";
import {
  archiveSong,
  deleteSong,
  duplicateSong,
  getSongRecord,
  saveSong,
  type SongInput,
  type SongRecord,
} from "@/lib/indexed-db";
import { formatSignedSemitones, formatTransposeInterval, transformChordPro, transposeKey } from "@/lib/music";
import { downloadSongPdf, downloadTextFile } from "@/lib/song-pdf";
import type { Notation } from "@/types/domain";

const insertOptions = [
  { group: "Contenido", label: "Acorde", description: "Inserta un acorde en el cursor", value: "[C]|", icon: Guitar },
  { group: "Contenido", label: "Progresión I–V–vi–IV", description: "Base rápida en Do mayor", value: "[C]  [G]  [Am]  [F]|", icon: Music2 },
  { group: "Contenido", label: "Comentario", description: "Indicación visible para el equipo", value: "{comment: Nota para el equipo}|", icon: MessageSquareWarning },
  { group: "Secciones", label: "Intro", description: "Bloque de introducción", value: "{start_of_intro: Intro}\n|\n{end_of_intro}", icon: Guitar },
  { group: "Secciones", label: "Verso", description: "Bloque de estrofa", value: "{start_of_verse: Verso}\n|\n{end_of_verse}", icon: FileText },
  { group: "Secciones", label: "Pre-coro", description: "Transición hacia el coro", value: "{start_of_prechorus: Pre-coro}\n|\n{end_of_prechorus}", icon: ListMusic },
  { group: "Secciones", label: "Coro", description: "Bloque principal de la canción", value: "{start_of_chorus: Coro}\n|\n{end_of_chorus}", icon: Music2 },
  { group: "Secciones", label: "Puente", description: "Bloque de contraste", value: "{start_of_bridge: Puente}\n|\n{end_of_bridge}", icon: Braces },
  { group: "Avanzado", label: "Instrumental", description: "Pasaje sin letra", value: "{start_of_instrumental: Instrumental}\n|\n{end_of_instrumental}", icon: Guitar },
  { group: "Avanzado", label: "Solo", description: "Espacio para un solo", value: "{start_of_solo: Solo}\n|\n{end_of_solo}", icon: Guitar },
  { group: "Avanzado", label: "Outro", description: "Cierre de la canción", value: "{start_of_outro: Outro}\n|\n{end_of_outro}", icon: Music2 },
];

const DRAFT_KEY = "acorde:new-song-draft";
const TUTORIAL_KEY = "acorde:song-editor-tutorial-seen";
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type LayoutMode = "split" | "editor" | "preview";
type Draft = { source: string; tags: string; duration: string; savedAt?: string };
type ConfirmationRequest = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: React.ReactNode;
  resolve: (confirmed: boolean) => void;
};

export function SongEditor({ songId }: { songId?: string }) {
  const song = useLiveQuery(
    () => (songId ? getSongRecord(songId) : Promise.resolve(undefined)),
    [songId],
    songId ? null : undefined,
  );

  if (songId && song === null) return <EditorSkeleton />;
  if (songId && !song) return <MissingSong />;

  return <ChordProEditor key={song?.id ?? "new-song"} initialSong={song ?? undefined} />;
}

function ChordProEditor({ initialSong }: { initialSong?: SongRecord }) {
  const navigate = (href: string, replace = false) => {
    if (replace) window.location.replace(href);
    else window.location.assign(href);
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<{ undo: string[]; redo: string[]; typing: boolean }>({ undo: [], redo: [], typing: false });
  const typingTimerRef = useRef<number | null>(null);
  const revisionRef = useRef(0);
  const autoSaveErrorShownRef = useRef(false);
  const [source, setSource] = useState(initialSong?.chordProSource ?? createChordProTemplate());
  const [tags, setTags] = useState(initialSong?.tags.join(", ") ?? "");
  const [duration, setDuration] = useState(initialSong?.duration ?? "0:00");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview" | "inspector">("editor");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [textImportOpen, setTextImportOpen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState(initialSong?.updatedAt ?? null);
  const [previewScale, setPreviewScale] = useState(100);
  const [previewTranspose, setPreviewTranspose] = useState(0);
  const [previewNotation, setPreviewNotation] = useState<Notation>("english");
  const [preferFlats, setPreferFlats] = useState(initialSong?.originalKey.includes("b") ?? false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const metadata = parseChordProMetadata(source);
  const rawMetadata = {
    title: getChordProDirectiveValue(source, "title"),
    artist: getChordProDirectiveValue(source, "artist"),
    key: getChordProDirectiveValue(source, "key"),
    tempo: getChordProDirectiveValue(source, "tempo"),
    time: getChordProDirectiveValue(source, "time"),
  };
  const diagnostics = [...validateChordPro(source), ...validateDuration(duration)];
  const lines = source.split("\n");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const previewKey = transposeKey(metadata.key, previewTranspose, preferFlats);
  const transformedPreview = transformChordPro(source, previewTranspose, previewNotation, preferFlats);

  function requestConfirmation(options: Omit<ConfirmationRequest, "resolve">) {
    return new Promise<boolean>((resolve) => setConfirmation({ ...options, resolve }));
  }

  function settleConfirmation(confirmed: boolean) {
    const current = confirmation;
    setConfirmation(null);
    current?.resolve(confirmed);
  }

  let previewHtml = "";
  let previewError = false;
  try {
    previewHtml = sanitizeChordSheetHtml(new HtmlDivFormatter().format(new ChordProParser().parse(transformedPreview)));
  } catch {
    previewError = true;
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (typingTimerRef.current !== null) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialSong) return;
    const timer = window.setTimeout(() => {
      try {
        setDraftAvailable(Boolean(window.localStorage.getItem(DRAFT_KEY)));
        if (!window.localStorage.getItem(TUTORIAL_KEY)) setTutorialOpen(true);
      } catch {
        // Private browsing or a full storage quota must not block the editor.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSong]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !saving) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty, saving]);

  useEffect(() => {
    if (!dirty) return;
    const revision = revisionRef.current;
    const timer = window.setTimeout(async () => {
      if (!initialSong) {
        try {
          const draft: Draft = { source, tags, duration, savedAt: new Date().toISOString() };
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
        return;
      }

      if (errors.length) {
        setSaveStatus("pending");
        return;
      }

      setSaveStatus("saving");
      try {
        const saved = await saveSong(buildSongInput(source, tags, duration, initialSong), initialSong.id);
        setLastSaved(saved.updatedAt);
        autoSaveErrorShownRef.current = false;
        if (revisionRef.current === revision) {
          setDirty(false);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("error");
        if (!autoSaveErrorShownRef.current) {
          autoSaveErrorShownRef.current = true;
          toast.error("No se pudo autoguardar", { description: "Tus cambios siguen en el editor. Intenta guardar manualmente." });
        }
      }
    }, 1_200);
    return () => window.clearTimeout(timer);
  }, [dirty, duration, errors.length, initialSong, source, tags]);

  function markChanged() {
    revisionRef.current += 1;
    setDirty(true);
    setSaveStatus("pending");
  }

  function updateSource(nextSource: string, options?: { forceHistory?: boolean; typing?: boolean }) {
    if (nextSource === source) return;
    let shouldRecord = true;
    if (options?.typing) {
      shouldRecord = !historyRef.current.typing;
      historyRef.current.typing = true;
      if (typingTimerRef.current !== null) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => {
        historyRef.current.typing = false;
      }, 700);
    } else {
      historyRef.current.typing = false;
    }
    if (options?.forceHistory) shouldRecord = true;
    if (shouldRecord) {
      historyRef.current.undo.push(source);
      historyRef.current.undo = historyRef.current.undo.slice(-80);
    }
    historyRef.current.redo = [];
    setSource(nextSource);
    markChanged();
    setHistoryState({ canUndo: historyRef.current.undo.length > 0, canRedo: false });
  }

  function updateDirective(name: string, value: string) {
    updateSource(updateChordProDirective(source, name, value), { typing: true });
  }

  function updateAuxiliaryField(setter: (value: string) => void, value: string) {
    setter(value);
    markChanged();
  }

  function undo() {
    const previous = historyRef.current.undo.pop();
    if (previous === undefined) return;
    historyRef.current.redo.push(source);
    historyRef.current.typing = false;
    setSource(previous);
    markChanged();
    setHistoryState({ canUndo: historyRef.current.undo.length > 0, canRedo: true });
  }

  function redo() {
    const next = historyRef.current.redo.pop();
    if (next === undefined) return;
    historyRef.current.undo.push(source);
    historyRef.current.typing = false;
    setSource(next);
    markChanged();
    setHistoryState({ canUndo: true, canRedo: historyRef.current.redo.length > 0 });
  }

  async function handleSave() {
    if (errors.length) {
      toast.error("Corrige los errores antes de guardar", { description: `${errors.length} diagnóstico${errors.length === 1 ? "" : "s"} bloquean el guardado.` });
      return;
    }
    setSaving(true);
    setSaveStatus("saving");
    try {
      const saved = await saveSong(buildSongInput(source, tags, duration, initialSong), initialSong?.id);
      setLastSaved(saved.updatedAt);
      setDirty(false);
      setSaveStatus("saved");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // The song was saved successfully even if draft cleanup is unavailable.
      }
      toast.success(initialSong ? "Cambios guardados" : "Canción creada", { description: "Disponible en tu biblioteca y sin conexión." });
      if (!initialSong) navigate(`/songs/${saved.id}`, true);
    } catch {
      setSaveStatus("error");
      toast.error("No se pudo guardar", { description: "Tus cambios no se perdieron. Revisa el almacenamiento del dispositivo e inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  function insertAtCursor(value: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? source.length;
    const end = textarea?.selectionEnd ?? start;
    const markerIndex = value.indexOf("|");
    const insertedValue = value.replace("|", "");
    const next = `${source.slice(0, start)}${insertedValue}${source.slice(end)}`;
    updateSource(next, { forceHistory: true });
    const cursor = start + (markerIndex >= 0 ? markerIndex : insertedValue.length);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  function goToLine(line: number) {
    const index = lines.slice(0, line - 1).reduce((total, current) => total + current.length + 1, 0);
    setMobileTab("editor");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(index, index + (lines[line - 1]?.length ?? 0));
    });
  }

  function readChordProFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const importedSource = String(reader.result ?? "").replaceAll("\r\n", "\n");
      if (!importedSource.trim()) {
        toast.error("El archivo está vacío");
        return;
      }
      updateSource(importedSource, { forceHistory: true });
      toast.success("Archivo ChordPro importado", { description: file.name });
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo", { description: "Verifica que sea un archivo de texto válido." });
    reader.readAsText(file);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (file.size > MAX_CHORDPRO_SOURCE_LENGTH) {
      toast.error("El archivo es demasiado grande", { description: `El máximo permitido es ${Math.round(MAX_CHORDPRO_SOURCE_LENGTH / 1000)} KB.` });
      return;
    }
    if (dirty && !(await requestConfirmation({
      title: "¿Reemplazar el contenido actual?",
      description: "Importar reemplazará el texto actual del editor. Tus cambios se pueden recuperar con Deshacer si continúas.",
      confirmLabel: "Importar archivo",
      icon: <Import className="size-5" />,
    }))) return;
    readChordProFile(file);
  }

  async function importConvertedText(importedSource: string) {
    if (dirty && !(await requestConfirmation({
      title: "¿Reemplazar el contenido actual?",
      description: "La cifra convertida reemplazará el texto actual del editor. Esta acción se puede recuperar con Deshacer.",
      confirmLabel: "Importar cifra",
      icon: <WandSparkles className="size-5" />,
    }))) return false;
    updateSource(importedSource, { forceHistory: true });
    setMobileTab("editor");
    setLayoutMode("split");
    return true;
  }

  function exportChordPro() {
    downloadTextFile(source, `${slugify(metadata.title)}.cho`);
    toast.success("ChordPro descargado", { description: "Conserva acordes, secciones y metadatos para volver a editarlo." });
  }

  function exportPlainLyrics() {
    downloadTextFile(chordProToPlainLyrics(transformedPreview), `${slugify(metadata.title)}-letra.txt`);
    toast.success("Letra descargada", { description: "El archivo no incluye acordes ni directivas ChordPro." });
  }

  async function exportPdf() {
    if (errors.length || previewError) {
      toast.error("No se puede crear el PDF", { description: "Corrige los errores indicados en el inspector e inténtalo de nuevo." });
      return;
    }
    setPdfExporting(true);
    try {
      await downloadSongPdf({
        source: transformedPreview,
        title: metadata.title,
        artist: metadata.artist,
        key: previewKey,
        tempo: metadata.tempo,
        timeSignature: metadata.timeSignature,
        duration,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        transposeDescription: previewTranspose ? `${formatTransposeInterval(previewTranspose)} desde ${metadata.key}` : undefined,
      });
      toast.success("PDF descargado", { description: `Incluye la vista actual en tono ${previewKey}.` });
    } catch {
      toast.error("No se pudo generar el PDF", { description: "La canción no se modificó. Intenta de nuevo en unos segundos." });
    } finally {
      setPdfExporting(false);
    }
  }

  async function copyChordPro() {
    try {
      await navigator.clipboard.writeText(source);
      toast.success("ChordPro copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar", { description: "Tu navegador no permitió acceder al portapapeles." });
    }
  }

  function selectAllSource() {
    setLayoutMode("editor");
    setMobileTab("editor");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, source.length);
    });
  }

  function cleanFormatting() {
    const formatted = formatChordProSource(source);
    if (formatted === source) {
      toast("El formato ya está limpio");
      return;
    }
    updateSource(formatted, { forceHistory: true });
    toast.success("Formato limpiado", { description: "Se eliminaron espacios finales y saltos vacíos excesivos." });
  }

  function changeLayout(mode: LayoutMode) {
    setLayoutMode(mode);
    if (mode === "editor") setMobileTab("editor");
    if (mode === "preview") setMobileTab("preview");
  }

  function findNext(query: string, caseSensitive: boolean, wholeWord: boolean) {
    const pattern = buildSearchRegex(query, caseSensitive, wholeWord, "g");
    if (!pattern) return false;
    const textarea = textareaRef.current;
    pattern.lastIndex = textarea?.selectionEnd ?? 0;
    let match = pattern.exec(source);
    if (!match) {
      pattern.lastIndex = 0;
      match = pattern.exec(source);
    }
    if (!match) return false;
    changeLayout("editor");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(match.index, match.index + match[0].length);
    });
    return true;
  }

  function replaceAll(query: string, replacement: string, caseSensitive: boolean, wholeWord: boolean) {
    const pattern = buildSearchRegex(query, caseSensitive, wholeWord, "g");
    if (!pattern) return 0;
    const matches = [...source.matchAll(pattern)].length;
    if (!matches) return 0;
    updateSource(source.replace(pattern, () => replacement), { forceHistory: true });
    return matches;
  }

  function restoreDraft() {
    try {
      const rawDraft = window.localStorage.getItem(DRAFT_KEY);
      if (!rawDraft) {
        setDraftAvailable(false);
        toast("No hay un borrador pendiente");
        return;
      }
      const draft = JSON.parse(rawDraft) as Partial<Draft>;
      if (typeof draft.source !== "string" || typeof draft.tags !== "string" || typeof draft.duration !== "string") throw new Error("Invalid draft");
      updateSource(draft.source, { forceHistory: true });
      setTags(draft.tags);
      setDuration(draft.duration);
      setDraftAvailable(false);
      toast.success("Borrador restaurado", { description: draft.savedAt ? `Guardado ${new Date(draft.savedAt).toLocaleString("es-MX")}` : undefined });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
      setDraftAvailable(false);
      toast.error("El borrador no se pudo recuperar", { description: "Parecía incompleto o dañado y fue descartado." });
    }
  }

  function discardDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The visible draft can still be dismissed when storage is unavailable.
    }
    setDraftAvailable(false);
    toast("Borrador anterior descartado");
  }

  async function handleDuplicate() {
    if (!initialSong) return;
    try {
      const copy = await duplicateSong(initialSong.id);
      toast.success("Copia creada");
      navigate(`/songs/${copy.id}/edit`);
    } catch {
      toast.error("No se pudo crear la copia");
    }
  }

  async function confirmDelete() {
    if (!initialSong) return;
    if (await requestConfirmation({
      title: `¿Eliminar “${metadata.title}”?`,
      description: "La canción desaparecerá de la biblioteca y la eliminación quedará pendiente de sincronización. Esta acción no modifica otras canciones.",
      confirmLabel: "Eliminar canción",
      danger: true,
      icon: <Trash2 className="size-5" />,
    })) await handleDelete();
  }

  async function handleDelete() {
    if (!initialSong) return;
    try {
      await deleteSong(initialSong.id);
      toast.success("Canción eliminada");
      navigate("/songs", true);
    } catch {
      toast.error("No se pudo eliminar la canción");
    }
  }

  async function handleArchive() {
    if (!initialSong) return;
    try {
      await archiveSong(initialSong.id);
      toast.success("Canción archivada");
      navigate("/songs", true);
    } catch {
      toast.error("No se pudo archivar la canción");
    }
  }

  async function handleCancel() {
    if (dirty && !(await requestConfirmation({
      title: initialSong ? "¿Cerrar sin guardar?" : "¿Salir del editor?",
      description: initialSong ? "Hay cambios que todavía no se guardan. Si cierras ahora, perderás esos cambios." : "Conservaremos el borrador en este dispositivo para que puedas retomarlo después.",
      confirmLabel: initialSong ? "Cerrar sin guardar" : "Salir y guardar borrador",
      danger: Boolean(initialSong),
      icon: <X className="size-5" />,
    }))) return;
    if (!initialSong && dirty) {
      try {
        const draft: Draft = { source, tags, duration, savedAt: new Date().toISOString() };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        toast.error("No fue posible conservar el borrador", { description: "El almacenamiento local no está disponible." });
        return;
      }
    }
    navigate(initialSong ? `/songs/${initialSong.id}` : "/songs", true);
  }

  async function handleNewSong() {
    if (dirty && !(await requestConfirmation({
      title: "¿Crear otra canción?",
      description: "Se reemplazará el contenido actual. El borrador local se conservará antes de abrir la nueva canción.",
      confirmLabel: "Crear otra canción",
      icon: <FilePlus2 className="size-5" />,
    }))) return;
    if (initialSong) {
      navigate("/songs/new");
      return;
    }
    setSource(createChordProTemplate());
    setTags("");
    setDuration("0:00");
    setPreviewTranspose(0);
    setDirty(false);
    setSaveStatus("idle");
    historyRef.current = { undo: [], redo: [], typing: false };
    setHistoryState({ canUndo: false, canRedo: false });
    discardDraft();
  }

  function applyTransposeAsOriginal() {
    if (!previewTranspose) return;
    const targetKey = transposeKey(metadata.key, previewTranspose, preferFlats);
    const transposedSource = transformChordPro(source, previewTranspose, "english", preferFlats);
    updateSource(updateChordProDirective(transposedSource, "key", targetKey), { forceHistory: true });
    setPreviewTranspose(0);
    toast.success("Nuevo tono original aplicado", { description: `La canción ahora está en ${targetKey}. Puedes deshacer este cambio.` });
  }

  async function confirmTranspose() {
    if (!previewTranspose) return;
    if (await requestConfirmation({
      title: `¿Cambiar el tono original a ${previewKey}?`,
      description: <>Se reescribirán los acordes y la directiva de tonalidad de <strong className="text-app-text">{metadata.key}</strong> a <strong className="text-app-text">{previewKey}</strong>. {formatTransposeInterval(previewTranspose)}.</>,
      confirmLabel: "Aplicar cambio",
      icon: <SlidersHorizontal className="size-5" />,
    })) applyTransposeAsOriginal();
  }

  function closeTutorial() {
    setTutorialOpen(false);
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "true");
    } catch {
      // Tutorial state is optional.
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/55 sm:p-3 lg:p-4">
      <div role="dialog" aria-modal="true" aria-label={initialSong ? `Editar ${metadata.title}` : "Crear canción"} className="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg shadow-2xl sm:rounded-2xl sm:border sm:border-app-border">
        <header className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-app-border bg-[linear-gradient(110deg,var(--app-surface),color-mix(in_srgb,var(--app-primary-soft)_45%,var(--app-surface)))] px-3 sm:px-5">
          <button onClick={handleCancel} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted hover:text-app-text" aria-label="Cancelar y cerrar"><X className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="truncate font-display text-base font-bold sm:text-lg">{metadata.title}</p><span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-ink sm:inline">ChordPro</span></div>
            <p className="mt-0.5 truncate text-[11px] text-app-secondary">{initialSong ? `Editando · ${metadata.artist || "Sin artista"}` : "Nueva canción · se conserva como borrador local"}</p>
          </div>
          <div className="hidden md:block"><EditorSaveStatus errors={errors.length} dirty={dirty} status={saveStatus} isNew={!initialSong} lastSaved={lastSaved} /></div>
          <Button variant="secondary" size="icon" onClick={() => setTutorialOpen(true)} aria-label="Abrir tutorial"><BadgeHelp className="size-4" /></Button>
          {initialSong ? <Button variant="secondary" size="icon" onClick={() => void confirmDelete()} aria-label="Eliminar canción"><Trash2 className="size-4" /></Button> : null}
          <span className="hidden sm:block"><Button variant="secondary" onClick={handleCancel}>Cerrar</Button></span>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="sm:hidden">{saving ? "Guardando" : initialSong ? "Guardar" : "Crear"}</span>
            <span className="hidden sm:inline">{saving ? "Guardando" : initialSong ? "Guardar cambios" : "Crear canción"}</span>
          </Button>
        </header>

        {draftAvailable && !initialSong ? <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 sm:px-6"><FolderOpen className="size-4 shrink-0" /><p className="min-w-0 flex-1 text-xs font-semibold">Encontramos un borrador anterior en este dispositivo.</p><button onClick={restoreDraft} className="text-xs font-extrabold underline underline-offset-2">Restaurar</button><button onClick={discardDraft} className="text-xs font-bold text-amber-800/75">Descartar</button></div> : null}

        <Card className="m-0 flex min-h-0 flex-1 flex-col overflow-visible rounded-none border-0 shadow-none sm:m-3 sm:mt-3 sm:rounded-xl sm:border lg:m-4 lg:mt-4">
        <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-app-border px-2 sm:px-3 [&>*]:shrink-0">
          <ToolbarMenu label="Archivo" icon={<FileText />}>
            <MenuLabel>Documento</MenuLabel>
            <MenuAction icon={<FilePlus2 />} label="Nueva canción" description="Abre un documento limpio" onClick={handleNewSong} />
            <MenuAction icon={<FolderOpen />} label="Restaurar borrador" description="Recupera cambios locales pendientes" onClick={restoreDraft} />
            <MenuAction icon={<Import />} label="Importar ChordPro" description="Admite .cho, .pro, .crd y .txt" onClick={() => fileInputRef.current?.click()} />
            <MenuAction icon={<WandSparkles />} label="Convertir cifra a ChordPro" description="Obtén metadatos, acordes y letra desde una URL" onClick={() => setTextImportOpen(true)} />
            <MenuDivider />
            <MenuLabel>Descargar</MenuLabel>
            <MenuAction icon={pdfExporting ? <LoaderCircle className="animate-spin" /> : <FileDown />} label="Canción en PDF" description={`Vista lista para imprimir · tono ${previewKey}`} onClick={() => void exportPdf()} disabled={pdfExporting} />
            <MenuAction icon={<Download />} label="Archivo ChordPro (.cho)" description="Editable y compatible con otras apps" onClick={exportChordPro} />
            <MenuAction icon={<FileText />} label="Letra sin acordes (.txt)" description="Texto limpio para compartir" onClick={exportPlainLyrics} />
          </ToolbarMenu>
          <ToolbarMenu label="Editar" icon={<Menu />}>
            <MenuLabel>Historial</MenuLabel>
            <MenuAction icon={<Undo2 />} label="Deshacer" shortcut="⌘Z" onClick={undo} disabled={!historyState.canUndo} />
            <MenuAction icon={<Redo2 />} label="Rehacer" shortcut="⇧⌘Z" onClick={redo} disabled={!historyState.canRedo} />
            <MenuDivider />
            <MenuLabel>Texto</MenuLabel>
            <MenuAction icon={<Search />} label="Buscar y reemplazar" shortcut="⌘F" description="Localiza texto, acordes o directivas" onClick={() => setFindReplaceOpen(true)} />
            <MenuAction icon={<ClipboardCopy />} label="Seleccionar todo" shortcut="⌘A" onClick={selectAllSource} />
            <MenuAction icon={<Braces />} label="Limpiar formato" description="Corrige espacios y líneas vacías" onClick={cleanFormatting} />
            <MenuAction icon={<Copy />} label="Copiar ChordPro" description="Copia la fuente al portapapeles" onClick={() => void copyChordPro()} />
            {initialSong ? <><MenuDivider /><MenuLabel>Canción</MenuLabel><MenuAction icon={<Copy />} label="Crear una copia" description="Duplica sin modificar el original" onClick={() => void handleDuplicate()} /><MenuAction icon={<Archive />} label="Archivar" description="Oculta la canción de la biblioteca" onClick={() => void handleArchive()} /></> : null}
          </ToolbarMenu>
          <ToolbarMenu label="Insertar" icon={<Braces />}>
            {insertOptions.map((option, index) => <div key={option.label}>{index === 0 || insertOptions[index - 1].group !== option.group ? <><MenuDivider first={index === 0} /><MenuLabel>{option.group}</MenuLabel></> : null}<MenuAction icon={<option.icon />} label={option.label} description={option.description} onClick={() => insertAtCursor(option.value)} /></div>)}
          </ToolbarMenu>
          <ToolbarMenu label="Vista" icon={<Eye />}>
            <MenuLabel>Espacio de trabajo</MenuLabel>
            <MenuAction icon={<Columns3 />} label="Vista dividida" description="Editor, vista previa e inspector" active={layoutMode === "split"} onClick={() => changeLayout("split")} />
            <MenuAction icon={<FileText />} label="Enfocar editor" description="Usa todo el espacio para escribir" active={layoutMode === "editor"} onClick={() => changeLayout("editor")} />
            <MenuAction icon={<Eye />} label="Enfocar vista previa" description="Lectura limpia de la canción" active={layoutMode === "preview"} onClick={() => changeLayout("preview")} />
            <MenuDivider />
            <MenuLabel>Editor</MenuLabel>
            <MenuAction icon={<ListMusic />} label="Números de línea" description={showLineNumbers ? "Ocultar la columna izquierda" : "Mostrar la columna izquierda"} active={showLineNumbers} onClick={() => setShowLineNumbers((value) => !value)} />
            <MenuAction icon={<FileText />} label="Ajustar líneas largas" description={wrapLines ? "No dividir líneas visualmente" : "Evita desplazamiento horizontal"} active={wrapLines} onClick={() => setWrapLines((value) => !value)} />
            <MenuDivider />
            <MenuLabel>Vista previa</MenuLabel>
            <MenuAction icon={<Minus />} label="Alejar" shortcut={`${Math.max(70, previewScale - 10)}%`} onClick={() => setPreviewScale((scale) => Math.max(70, scale - 10))} disabled={previewScale <= 70} />
            <MenuAction icon={<RotateCcw />} label="Tamaño real" shortcut="100%" active={previewScale === 100} onClick={() => setPreviewScale(100)} />
            <MenuAction icon={<Plus />} label="Acercar" shortcut={`${Math.min(140, previewScale + 10)}%`} onClick={() => setPreviewScale((scale) => Math.min(140, scale + 10))} disabled={previewScale >= 140} />
            <MenuAction icon={<Music2 />} label="Notación latina" description="Do, Re, Mi…" active={previewNotation === "latin"} onClick={() => setPreviewNotation("latin")} />
            <MenuAction icon={<Guitar />} label="Notación inglesa" description="C, D, E…" active={previewNotation === "english"} onClick={() => setPreviewNotation("english")} />
          </ToolbarMenu>
          <button onClick={() => setTutorialOpen(true)} className="hidden min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold text-app-secondary hover:bg-app-surface-muted hover:text-app-text sm:flex"><BookOpen className="size-4" /> Tutorial</button>
          <div className="ml-auto flex items-center gap-2 pr-1 text-[11px] font-semibold text-app-secondary md:hidden">
            <EditorSaveStatus errors={errors.length} dirty={dirty} status={saveStatus} isNew={!initialSong} lastSaved={lastSaved} />
          </div>
          <input ref={fileInputRef} type="file" accept=".cho,.chordpro,.pro,.crd,.txt,text/plain" className="hidden" onChange={handleImport} />
        </div>

        <div className={cx("grid min-h-0 flex-1", layoutMode === "split" && "lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)_300px]", layoutMode !== "split" && "lg:grid-cols-1")}>
          <section className={cx("min-h-0 min-w-0 flex-col border-app-border", mobileTab !== "editor" ? "hidden" : "flex", layoutMode === "preview" ? "lg:hidden" : "lg:flex", layoutMode === "split" && "lg:border-r")}>
            <div className="flex h-12 items-center justify-between border-b border-app-border px-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><FileText className="size-4 text-brand" /> Fuente ChordPro</div><span className="text-[11px] text-app-secondary">UTF-8 · {lines.length} líneas · {source.length.toLocaleString("es-MX")} caracteres</span></div>
            <div className="relative flex min-h-0 flex-1 overflow-hidden bg-slate-950">
              <div ref={gutterRef} className={cx("shrink-0 overflow-hidden border-r border-slate-800 bg-slate-950 py-4 text-right font-mono text-xs leading-7 text-slate-600 select-none", showLineNumbers ? "w-12" : "hidden")} aria-hidden="true">
                {lines.map((_, index) => <div className="pr-3" key={index}>{index + 1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                value={source}
                onChange={(event) => updateSource(event.target.value, { typing: true })}
                onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); void handleSave(); }
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") { event.preventDefault(); setFindReplaceOpen(true); }
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
                  if (event.key === "Tab") { event.preventDefault(); insertAtCursor("  "); }
                }}
                spellCheck={false}
                wrap={wrapLines ? "soft" : "off"}
                className="min-w-0 flex-1 resize-none overflow-auto bg-slate-950 px-4 py-4 font-mono text-[13px] leading-7 text-slate-200 outline-none selection:bg-indigo-400/30 sm:px-5 sm:text-sm"
                aria-label="Fuente ChordPro"
              />
            </div>
          </section>

          <section className={cx("min-h-0 min-w-0 flex-col border-app-border", mobileTab !== "preview" ? "hidden" : "flex", layoutMode === "editor" ? "lg:hidden" : "lg:flex", layoutMode === "split" && "lg:border-r")}>
            <div className="flex h-12 items-center justify-between border-b border-app-border px-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><Eye className="size-4 text-brand" /> Vista previa</div><div className="flex items-center gap-1"><button onClick={() => setPreviewScale((scale) => Math.max(70, scale - 10))} className="flex size-8 items-center justify-center rounded-lg text-app-secondary hover:bg-app-surface-muted">−</button><span className="w-10 text-center text-[11px] font-bold text-app-secondary">{previewScale}%</span><button onClick={() => setPreviewScale((scale) => Math.min(140, scale + 10))} className="flex size-8 items-center justify-center rounded-lg text-app-secondary hover:bg-app-surface-muted">+</button></div></div>
            <div className="subtle-grid min-h-0 flex-1 overflow-auto p-4 sm:p-6">
              {errors.length || previewError ? <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><div className="flex items-center gap-2 font-bold"><AlertCircle className="size-5" /> No se puede generar la vista</div><p className="mt-2 text-sm">{previewError ? "El formato no pudo interpretarse. Revisa las directivas y los bloques." : "Corrige los errores señalados en el inspector."}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => { changeLayout("split"); setMobileTab("inspector"); }}>Ver diagnósticos</Button></div> : <article className="mx-auto min-h-full max-w-2xl rounded-xl border border-app-border bg-app-surface p-6 shadow-xl shadow-slate-950/5 sm:p-8" style={{ zoom: previewScale / 100 }}><header className="mb-7 border-b border-app-border pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">{metadata.artist || "Sin artista"}</p>{previewTranspose !== 0 ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-extrabold text-brand-ink">Vista transpuesta {formatSignedSemitones(previewTranspose)}</span> : null}</div><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">{metadata.title}</h2><p className="mt-2 text-xs font-semibold text-app-secondary">Tono {previewKey} · {metadata.tempo} bpm · {metadata.timeSignature}</p>{previewTranspose !== 0 ? <p className="mt-2 text-[11px] font-semibold text-brand">{formatTransposeInterval(previewTranspose)} · el original sigue en {metadata.key}</p> : null}</header><div className="chord-sheet text-[15px] leading-8" dangerouslySetInnerHTML={{ __html: previewHtml }} /></article>}
            </div>
          </section>

          <aside className={cx("min-h-0 min-w-0 flex-col", mobileTab !== "inspector" ? "hidden" : "flex", layoutMode === "split" ? "lg:flex" : "lg:hidden")}>
            <div className="flex h-12 items-center gap-2 border-b border-app-border px-4 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><PanelRight className="size-4 text-brand" /> Inspector</div>
            <div className="min-h-0 flex-1 overflow-auto">
              <InspectorSection title="Metadatos">
                <DirectiveField label="Título" value={rawMetadata.title} onChange={(value) => updateDirective("title", value)} required placeholder="Nombre de la canción" />
                <DirectiveField label="Artista" value={rawMetadata.artist} onChange={(value) => updateDirective("artist", value)} placeholder="Autor o intérprete" />
                <div className="grid grid-cols-2 gap-2"><DirectiveField label="Tono original" value={rawMetadata.key} onChange={(value) => updateDirective("key", value)} placeholder="C, F#, Bb…" /><DirectiveField label="Tempo (bpm)" value={rawMetadata.tempo} onChange={(value) => updateDirective("tempo", value)} inputMode="numeric" placeholder="72" /></div>
                <div className="grid grid-cols-2 gap-2"><DirectiveField label="Compás" value={rawMetadata.time} onChange={(value) => updateDirective("time", value)} placeholder="4/4" /><DirectiveField label="Duración" value={duration} onChange={(value) => updateAuxiliaryField(setDuration, value)} inputMode="numeric" placeholder="4:30" /></div>
                <DirectiveField label="Etiquetas" value={tags} onChange={(value) => updateAuxiliaryField(setTags, value)} placeholder="Adoración, rápida" hint="Separa cada etiqueta con una coma." />
              </InspectorSection>
              <InspectorSection title="Transposición avanzada">
                <div className="rounded-2xl border border-app-border bg-app-surface-muted/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-app-secondary">Vista temporal</p><p className="mt-1 font-display text-xl font-bold">{metadata.key} <span className="text-app-secondary">→</span> <span className="text-brand">{previewKey}</span></p></div>
                    <button onClick={() => setPreviewTranspose(0)} disabled={previewTranspose === 0} className="flex size-9 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-secondary disabled:opacity-40" aria-label="Restablecer transposición"><RotateCcw className="size-4" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center overflow-hidden rounded-xl border border-app-border bg-app-surface">
                    <button onClick={() => setPreviewTranspose((value) => Math.max(-11, value - 1))} disabled={previewTranspose <= -11} className="flex size-10 items-center justify-center text-app-secondary hover:bg-app-surface-muted disabled:opacity-35" aria-label="Bajar un semitono"><Minus className="size-4" /></button>
                    <strong className="border-x border-app-border text-center text-sm">{formatSignedSemitones(previewTranspose)}</strong>
                    <button onClick={() => setPreviewTranspose((value) => Math.min(11, value + 1))} disabled={previewTranspose >= 11} className="flex size-10 items-center justify-center text-app-secondary hover:bg-app-surface-muted disabled:opacity-35" aria-label="Subir un semitono"><Plus className="size-4" /></button>
                  </div>
                  <p className="mt-2 min-h-8 text-center text-[11px] font-semibold leading-4 text-brand">{formatTransposeInterval(previewTranspose)}</p>
                </div>
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">Alteraciones preferidas</span><select value={preferFlats ? "flat" : "sharp"} onChange={(event) => setPreferFlats(event.target.value === "flat")} className="min-h-9 w-full rounded-lg border border-app-border bg-app-surface-muted px-2.5 text-xs outline-none focus:border-brand"><option value="sharp">Sostenidos · C#</option><option value="flat">Bemoles · Db</option></select></label>
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">Notación en la vista</span><select value={previewNotation} onChange={(event) => setPreviewNotation(event.target.value as Notation)} className="min-h-9 w-full rounded-lg border border-app-border bg-app-surface-muted px-2.5 text-xs outline-none focus:border-brand"><option value="english">Inglesa · C D E</option><option value="latin">Latina · Do Re Mi</option></select></label>
                <Button variant="secondary" size="sm" className="w-full" disabled={previewTranspose === 0} onClick={() => void confirmTranspose()}><SlidersHorizontal className="size-4" /> Aplicar como tono original</Button>
                <p className="text-[10px] leading-4 text-app-secondary">La vista es no destructiva. Solo el botón anterior reescribe los acordes, después de confirmar.</p>
              </InspectorSection>
              <InspectorSection title={`Diagnósticos · ${diagnostics.length}`}>
                {diagnostics.length ? <div className="space-y-2">{diagnostics.map((diagnostic, index) => <button key={`${diagnostic.line}-${index}`} onClick={() => goToLine(diagnostic.line)} className={cx("w-full rounded-xl border p-3 text-left", diagnostic.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800")}><span className="text-[10px] font-extrabold uppercase tracking-wider">Línea {diagnostic.line} · {diagnostic.severity === "error" ? "Error" : "Aviso"}</span><p className="mt-1 text-xs leading-5">{diagnostic.message}</p></button>)}</div> : <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><div className="flex items-center gap-2 text-xs font-bold"><Check className="size-4" /> Documento válido</div><p className="mt-1 text-[11px] leading-5">La sintaxis ChordPro no presenta problemas.</p></div>}
              </InspectorSection>
              <InspectorSection title="Ayuda rápida"><div className="space-y-3 text-[11px] text-app-secondary"><HelpExample code="[C]Acorde" description="Ponlo antes de la sílaba." /><HelpExample code="{comment: Intro}" description="Añade una indicación visible." /><HelpExample code="{start_of_chorus}" description="Abre una sección; ciérrala con end_of_chorus." /><HelpExample code="⌘/Ctrl + S" description="Guarda sin salir del editor." /><button onClick={() => setTutorialOpen(true)} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-app-surface font-bold text-brand hover:bg-brand-soft"><BookOpen className="size-4" /> Abrir tutorial completo</button></div></InspectorSection>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-app-border bg-app-surface-muted/50 px-3 py-1.5 text-[10px] text-app-secondary lg:px-4"><span>{source.length < MAX_CHORDPRO_SOURCE_LENGTH ? `${Math.round((source.length / MAX_CHORDPRO_SOURCE_LENGTH) * 100)}% del límite de documento` : "Límite de documento excedido"}</span><span className="hidden sm:inline">Tab inserta espacios · ⌘/Ctrl + S guarda · ⌘/Ctrl + Z deshace</span></div>
        <div className="grid grid-cols-3 border-t border-app-border p-1 lg:hidden"><MobileTab active={mobileTab === "editor"} onClick={() => setMobileTab("editor")} icon={<FileText />} label="Editor" /><MobileTab active={mobileTab === "preview"} onClick={() => setMobileTab("preview")} icon={<Eye />} label="Vista" /><MobileTab active={mobileTab === "inspector"} onClick={() => setMobileTab("inspector")} icon={<Settings2 />} label="Inspector" /></div>
        </Card>
      </div>

      {confirmation ? <ConfirmModal title={confirmation.title} description={confirmation.description} confirmLabel={confirmation.confirmLabel} cancelLabel={confirmation.cancelLabel} danger={confirmation.danger} icon={confirmation.icon} onCancel={() => settleConfirmation(false)} onConfirm={() => settleConfirmation(true)} /> : null}
      {findReplaceOpen ? <FindReplaceDialog source={source} onClose={() => setFindReplaceOpen(false)} onFind={findNext} onReplaceAll={replaceAll} /> : null}
      {textImportOpen ? <SongTextImportDialog onClose={() => setTextImportOpen(false)} onImport={importConvertedText} /> : null}
      <SongEditorTutorial open={tutorialOpen} onClose={closeTutorial} />
    </div>
  );
}

function ToolbarMenu({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(304, window.innerWidth - 16);
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: rect.bottom + 6 });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const closeOnResize = () => setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [open]);

  return <div><button ref={triggerRef} onClick={toggleMenu} aria-expanded={open} aria-haspopup="menu" className={cx("flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold hover:bg-app-surface-muted hover:text-app-text", open ? "bg-app-surface-muted text-app-text" : "text-app-secondary")}><span className="[&_svg]:size-4">{icon}</span>{label}<ChevronDown className={cx("size-3 transition-transform", open && "rotate-180")} /></button>{open ? createPortal(<><button className="fixed inset-0 z-[80] cursor-pointer" aria-label={`Cerrar menú ${label}`} onClick={() => setOpen(false)} /><div role="menu" aria-label={label} className="fixed z-[81] max-h-[min(70vh,540px)] w-[min(304px,calc(100vw-16px))] overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-2 shadow-2xl shadow-slate-950/20" style={position} onClick={() => setOpen(false)}>{children}</div></>, document.body) : null}</div>;
}

function MenuAction({ icon, label, description, shortcut, active, onClick, disabled }: { icon: React.ReactNode; label: string; description?: string; shortcut?: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button role="menuitem" onClick={onClick} disabled={disabled} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs text-app-text hover:bg-app-surface-muted disabled:pointer-events-none disabled:opacity-40"><span className={cx("shrink-0 [&_svg]:size-4", active ? "text-brand" : "text-app-secondary")}>{icon}</span><span className="min-w-0 flex-1"><span className="block font-bold">{label}</span>{description ? <span className="mt-0.5 block text-[10px] leading-4 text-app-secondary">{description}</span> : null}</span>{shortcut ? <kbd className="shrink-0 rounded-md border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[9px] font-semibold text-app-secondary">{shortcut}</kbd> : active ? <Check className="size-4 shrink-0 text-brand" /> : null}</button>;
}

function MenuLabel({ children }: { children: React.ReactNode }) { return <p className="px-3 pb-1 pt-1.5 text-[9px] font-extrabold uppercase tracking-[0.17em] text-app-secondary">{children}</p>; }
function MenuDivider({ first = false }: { first?: boolean }) { return first ? null : <div className="my-1 border-t border-app-border" />; }

function FindReplaceDialog({ source, onClose, onFind, onReplaceAll }: { source: string; onClose: () => void; onFind: (query: string, caseSensitive: boolean, wholeWord: boolean) => boolean; onReplaceAll: (query: string, replacement: string, caseSensitive: boolean, wholeWord: boolean) => number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const pattern = buildSearchRegex(query, caseSensitive, wholeWord, "g");
  const matches = pattern ? [...source.matchAll(pattern)].length : 0;

  useEffect(() => { inputRef.current?.focus(); }, []);

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="find-title" className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><Replace className="size-5" /></span><h2 id="find-title" className="mt-4 font-display text-xl font-bold">Buscar y reemplazar</h2><p className="mt-1 text-xs leading-5 text-app-secondary">Busca en toda la fuente ChordPro, incluidos acordes y directivas.</p></div><button onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted" aria-label="Cerrar"><X className="size-4" /></button></div><div className="mt-5 space-y-3"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">Buscar</span><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-secondary" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface-muted pl-10 pr-16 text-sm outline-none focus:border-brand focus:bg-app-surface" placeholder="Texto, [C] o {comment…}" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-app-secondary">{matches} {matches === 1 ? "resultado" : "resultados"}</span></div></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">Reemplazar con</span><input value={replacement} onChange={(event) => setReplacement(event.target.value)} className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 text-sm outline-none focus:border-brand focus:bg-app-surface" placeholder="Nuevo texto; puede quedar vacío" /></label><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} className="size-4 accent-indigo-600" /> Distinguir mayúsculas</label><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={wholeWord} onChange={(event) => setWholeWord(event.target.checked)} className="size-4 accent-indigo-600" /> Palabra completa</label></div></div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="secondary" disabled={!query || !matches} onClick={() => { const found = onFind(query, caseSensitive, wholeWord); if (found) onClose(); else toast("No se encontraron coincidencias"); }}><Search className="size-4" /> Buscar siguiente</Button><Button disabled={!query || !matches} onClick={() => { const count = onReplaceAll(query, replacement, caseSensitive, wholeWord); if (count) toast.success(`${count} ${count === 1 ? "coincidencia reemplazada" : "coincidencias reemplazadas"}`); }}><Replace className="size-4" /> Reemplazar todo</Button></div></div></div>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b border-app-border p-4"><h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-app-secondary">{title}</h3><div className="space-y-3">{children}</div></section>; }

function DirectiveField({ label, value, onChange, placeholder, hint, required, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string; required?: boolean; inputMode?: React.ComponentProps<"input">["inputMode"] }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">{label}{required ? <span className="ml-1 text-app-danger">*</span> : null}</span><input value={value} required={required} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-9 w-full rounded-lg border border-app-border bg-app-surface-muted px-2.5 text-xs outline-none placeholder:text-app-secondary/70 focus:border-brand focus:bg-app-surface" />{hint ? <span className="mt-1 block text-[10px] leading-4 text-app-secondary">{hint}</span> : null}</label>;
}

function HelpExample({ code, description }: { code: string; description: string }) {
  return <div><code className="rounded-md bg-brand-soft px-1.5 py-1 font-mono font-bold text-brand-ink">{code}</code><p className="mt-1.5 leading-4">{description}</p></div>;
}

function EditorSaveStatus({ errors, dirty, status, isNew, lastSaved }: { errors: number; dirty: boolean; status: SaveStatus; isNew: boolean; lastSaved: string | null }) {
  if (errors) return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-app-danger" role="status"><AlertCircle className="size-3.5" /> {errors} {errors === 1 ? "error" : "errores"}</span>;
  if (status === "error") return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-app-danger" role="status"><AlertCircle className="size-3.5" /> Sin guardar</span>;
  if (status === "saving") return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-app-secondary" role="status"><LoaderCircle className="size-3.5 animate-spin" /> Autoguardando</span>;
  if (dirty && isNew && status === "saved") return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-app-success" role="status"><Check className="size-3.5" /> Borrador local</span>;
  if (dirty) return <span className="text-[11px] font-semibold text-app-secondary" role="status">Cambios pendientes</span>;
  return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-app-success" role="status" title={lastSaved ? new Date(lastSaved).toLocaleString("es-MX") : undefined}><Check className="size-3.5" /> {lastSaved ? "Guardado" : "Listo"}</span>;
}

function MobileTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={cx("flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold", active ? "bg-brand-soft text-brand-ink" : "text-app-secondary")}><span className="[&_svg]:size-4">{icon}</span>{label}</button>; }

function EditorSkeleton() { return <Card className="flex min-h-[620px] items-center justify-center"><LoaderCircle className="size-7 animate-spin text-brand" /></Card>; }
function MissingSong() { return <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><CircleHelp className="size-10 text-app-secondary" /><h1 className="mt-4 font-display text-2xl font-bold">Canción no encontrada</h1><p className="mt-2 text-sm text-app-secondary">Puede haber sido eliminada o todavía no está disponible en este dispositivo.</p></Card>; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cancion"; }

function buildSearchRegex(query: string, caseSensitive: boolean, wholeWord: boolean, flags = "") {
  if (!query) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = wholeWord ? `\\b(?:${escaped})\\b` : escaped;
  return new RegExp(expression, `${flags}${caseSensitive ? "" : "i"}`);
}

function buildSongInput(source: string, tags: string, duration: string, initialSong?: SongRecord): SongInput {
  const metadata = parseChordProMetadata(source);
  return {
    title: metadata.title,
    artist: metadata.artist || "Sin artista",
    originalKey: metadata.key,
    tempo: metadata.tempo,
    timeSignature: metadata.timeSignature,
    duration,
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    chordProSource: source,
    sections: extractSections(source),
    notes: initialSong?.notes ?? [],
  };
}

function validateDuration(duration: string) {
  if (/^\d{1,3}:[0-5]\d$/.test(duration)) return [];
  return [{ line: 1, severity: "error" as const, message: "La duración debe usar el formato minutos:segundos, por ejemplo 4:30." }];
}
