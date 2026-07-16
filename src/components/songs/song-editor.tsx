"use client";

import { ChordProParser, HtmlDivFormatter } from "chordsheetjs";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  Archive,
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  Guitar,
  Import,
  ListMusic,
  LoaderCircle,
  Menu,
  MessageSquareWarning,
  Music2,
  PanelRight,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, cx } from "@/components/ui/primitives";
import {
  createChordProTemplate,
  extractSections,
  parseChordProMetadata,
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

const insertOptions = [
  { label: "Acorde", value: "[C]", icon: Guitar },
  { label: "Comentario", value: "{comment: Nota para el equipo}", icon: MessageSquareWarning },
  { label: "Verso", value: "{start_of_verse: Verso}\n\n{end_of_verse}", icon: FileText },
  { label: "Coro", value: "{start_of_chorus: Coro}\n\n{end_of_chorus}", icon: Music2 },
  { label: "Pre-coro", value: "{start_of_prechorus: Pre-coro}\n\n{end_of_prechorus}", icon: ListMusic },
  { label: "Puente", value: "{start_of_bridge: Puente}\n\n{end_of_bridge}", icon: Braces },
  { label: "Instrumental", value: "{start_of_instrumental: Instrumental}\n\n{end_of_instrumental}", icon: Guitar },
];

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
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(initialSong?.chordProSource ?? createChordProTemplate());
  const [tags, setTags] = useState(initialSong?.tags.join(", ") ?? "");
  const [duration, setDuration] = useState(initialSong?.duration ?? "0:00");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview" | "inspector">("editor");
  const [insertMenu, setInsertMenu] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(initialSong?.updatedAt ?? null);
  const [previewScale, setPreviewScale] = useState(100);
  const metadata = parseChordProMetadata(source);
  const diagnostics = validateChordPro(source);
  const lines = source.split("\n");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  let previewHtml = "";
  try {
    previewHtml = new HtmlDivFormatter().format(new ChordProParser().parse(source));
  } catch {
    previewHtml = "";
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(async () => {
      if (initialSong) {
        const saved = await saveSong(buildSongInput(source, tags, duration, initialSong), initialSong.id);
        setLastSaved(saved.updatedAt);
        setDirty(false);
      } else {
        window.localStorage.setItem("acorde:new-song-draft", JSON.stringify({ source, tags, duration }));
      }
    }, 1_200);
    return () => window.clearTimeout(timer);
  }, [dirty, duration, initialSong, source, tags]);

  function updateSource(nextSource: string) {
    setSource(nextSource);
    setDirty(true);
  }

  function updateDirective(name: string, value: string) {
    updateSource(updateChordProDirective(source, name, value));
  }

  async function handleSave() {
    if (errors.length) {
      toast.error("Corrige los errores antes de guardar", { description: `${errors.length} diagnóstico${errors.length === 1 ? "" : "s"} bloquean el guardado.` });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSong(buildSongInput(source, tags, duration, initialSong), initialSong?.id);
      setLastSaved(saved.updatedAt);
      setDirty(false);
      window.localStorage.removeItem("acorde:new-song-draft");
      toast.success(initialSong ? "Cambios guardados" : "Canción creada", { description: "Disponible en tu biblioteca y sin conexión." });
      router.replace(`/songs/${saved.id}`);
    } finally {
      setSaving(false);
    }
  }

  function insertAtCursor(value: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? source.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${source.slice(0, start)}${value}${source.slice(end)}`;
    updateSource(next);
    setInsertMenu(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + value.length, start + value.length);
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

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateSource(String(reader.result ?? ""));
      toast.success("Archivo ChordPro importado", { description: file.name });
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function exportChordPro() {
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(metadata.title)}.cho`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function restoreDraft() {
    const rawDraft = window.localStorage.getItem("acorde:new-song-draft");
    if (!rawDraft) {
      toast("No hay un borrador pendiente");
      return;
    }
    const draft = JSON.parse(rawDraft) as { source: string; tags: string; duration: string };
    setSource(draft.source);
    setTags(draft.tags);
    setDuration(draft.duration);
    setDirty(true);
    toast.success("Borrador restaurado");
  }

  async function handleDuplicate() {
    if (!initialSong) return;
    const copy = await duplicateSong(initialSong.id);
    toast.success("Copia creada");
    router.push(`/songs/${copy.id}/edit`);
  }

  async function handleDelete() {
    if (!initialSong) return;
    await deleteSong(initialSong.id);
    toast.success("Canción eliminada");
    router.replace("/songs");
  }

  function handleCancel() {
    if (dirty && !window.confirm("Hay cambios pendientes. ¿Quieres cerrar el editor?")) return;
    if (!initialSong) window.localStorage.removeItem("acorde:new-song-draft");
    router.replace(initialSong ? `/songs/${initialSong.id}` : "/songs");
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/55 sm:p-3 lg:p-4">
      <div role="dialog" aria-modal="true" aria-label={initialSong ? `Editar ${metadata.title}` : "Crear canción"} className="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg shadow-2xl sm:rounded-2xl sm:border sm:border-app-border">
        <header className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-app-border bg-app-surface px-3 sm:px-5">
          <button onClick={handleCancel} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted hover:text-app-text" aria-label="Cancelar y cerrar"><X className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="truncate font-display text-base font-bold sm:text-lg">{metadata.title}</p><span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-ink sm:inline">ChordPro</span></div>
            <p className="mt-0.5 truncate text-[11px] text-app-secondary">{initialSong ? `Editando · ${metadata.artist || "Sin artista"}` : "Nueva canción · borrador local"}</p>
          </div>
          <div className="hidden items-center gap-2 text-[11px] font-semibold text-app-secondary md:flex">
            {errors.length ? <span className="flex items-center gap-1.5 text-app-danger"><AlertCircle className="size-3.5" /> {errors.length} errores</span> : dirty ? <span>Guardado pendiente</span> : <span className="flex items-center gap-1.5 text-app-success"><Check className="size-3.5" /> {lastSaved ? "Guardado" : "Listo"}</span>}
          </div>
          {initialSong ? <Button variant="secondary" size="icon" onClick={() => setDeleteOpen(true)} aria-label="Eliminar canción"><Trash2 className="size-4" /></Button> : null}
          <Button variant="secondary" onClick={handleCancel} className="hidden sm:inline-flex">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Guardando" : initialSong ? "Guardar" : "Crear canción"}
          </Button>
        </header>

        <Card className="m-0 flex min-h-0 flex-1 flex-col overflow-visible rounded-none border-0 shadow-none sm:m-3 sm:mt-3 sm:rounded-xl sm:border lg:m-4 lg:mt-4">
        <div className="flex min-h-12 items-center gap-1 border-b border-app-border px-2 sm:px-3">
          <ToolbarMenu label="Archivo" icon={<FileText />}>
            <MenuAction icon={<FilePlus2 />} label="Nueva canción" onClick={() => router.push("/songs/new")} />
            <MenuAction icon={<FolderOpen />} label="Restaurar borrador" onClick={restoreDraft} />
            <MenuAction icon={<Import />} label="Importar .cho" onClick={() => fileInputRef.current?.click()} />
            <MenuAction icon={<Download />} label="Exportar .cho" onClick={exportChordPro} />
          </ToolbarMenu>
          <ToolbarMenu label="Editar" icon={<Menu />}>
            <MenuAction icon={<Undo2 />} label="Deshacer" onClick={() => document.execCommand("undo")} />
            <MenuAction icon={<Redo2 />} label="Rehacer" onClick={() => document.execCommand("redo")} />
            {initialSong ? <MenuAction icon={<Copy />} label="Crear una copia" onClick={handleDuplicate} /> : null}
            {initialSong ? <MenuAction icon={<Archive />} label="Archivar" onClick={() => archiveSong(initialSong.id).then(() => { toast.success("Canción archivada"); router.replace("/songs"); })} /> : null}
          </ToolbarMenu>
          <div className="relative">
            <button onClick={() => setInsertMenu((open) => !open)} className="flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold text-app-secondary hover:bg-app-surface-muted hover:text-app-text"><Braces className="size-4" /> Insertar <ChevronDown className="size-3" /></button>
            {insertMenu ? <div className="absolute left-0 top-11 z-30 w-56 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-2xl">{insertOptions.map((option) => <MenuAction key={option.label} icon={<option.icon />} label={option.label} onClick={() => insertAtCursor(option.value)} />)}</div> : null}
          </div>
          <button onClick={() => setMobileTab("preview")} className="hidden min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold text-app-secondary hover:bg-app-surface-muted sm:flex"><Eye className="size-4" /> Preview</button>
          <div className="ml-auto flex items-center gap-2 pr-1 text-[11px] font-semibold text-app-secondary md:hidden">
            {errors.length ? <span className="flex items-center gap-1.5 text-app-danger"><AlertCircle className="size-3.5" /> {errors.length} errores</span> : dirty ? <span>Guardado pendiente</span> : <span className="flex items-center gap-1.5 text-app-success"><Check className="size-3.5" /> {lastSaved ? "Guardado" : "Listo"}</span>}
          </div>
          <input ref={fileInputRef} type="file" accept=".cho,.chordpro,.pro,.crd,.txt,text/plain" className="hidden" onChange={handleImport} />
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)_300px]">
          <section className={cx("min-h-0 min-w-0 flex-col border-app-border lg:flex lg:border-r", mobileTab !== "editor" ? "hidden lg:flex" : "flex")}>
            <div className="flex h-12 items-center justify-between border-b border-app-border px-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><FileText className="size-4 text-brand" /> Fuente ChordPro</div><span className="text-[11px] text-app-secondary">UTF-8 · {lines.length} líneas</span></div>
            <div className="relative flex min-h-0 flex-1 overflow-hidden bg-slate-950">
              <div ref={gutterRef} className="w-12 shrink-0 overflow-hidden border-r border-slate-800 bg-slate-950 py-4 text-right font-mono text-xs leading-7 text-slate-600 select-none" aria-hidden="true">
                {lines.map((_, index) => <div className="pr-3" key={index}>{index + 1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                value={source}
                onChange={(event) => updateSource(event.target.value)}
                onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); void handleSave(); }
                  if (event.key === "Tab") { event.preventDefault(); insertAtCursor("  "); }
                }}
                spellCheck={false}
                className="min-w-0 flex-1 resize-none overflow-auto bg-slate-950 px-4 py-4 font-mono text-[13px] leading-7 text-slate-200 outline-none selection:bg-indigo-400/30 sm:px-5 sm:text-sm"
                aria-label="Fuente ChordPro"
              />
            </div>
          </section>

          <section className={cx("min-h-0 min-w-0 flex-col border-app-border lg:flex lg:border-r", mobileTab !== "preview" ? "hidden lg:flex" : "flex")}>
            <div className="flex h-12 items-center justify-between border-b border-app-border px-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><Eye className="size-4 text-brand" /> Vista previa</div><div className="flex items-center gap-1"><button onClick={() => setPreviewScale((scale) => Math.max(70, scale - 10))} className="flex size-8 items-center justify-center rounded-lg text-app-secondary hover:bg-app-surface-muted">−</button><span className="w-10 text-center text-[11px] font-bold text-app-secondary">{previewScale}%</span><button onClick={() => setPreviewScale((scale) => Math.min(140, scale + 10))} className="flex size-8 items-center justify-center rounded-lg text-app-secondary hover:bg-app-surface-muted">+</button></div></div>
            <div className="subtle-grid min-h-0 flex-1 overflow-auto p-4 sm:p-6">
              {errors.length ? <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><div className="flex items-center gap-2 font-bold"><AlertCircle className="size-5" /> No se puede generar el preview</div><p className="mt-2 text-sm">Corrige los errores de sintaxis señalados en el inspector.</p></div> : <article className="mx-auto min-h-full max-w-2xl rounded-xl border border-app-border bg-app-surface p-6 shadow-xl shadow-slate-950/5 sm:p-8" style={{ zoom: previewScale / 100 }}><header className="mb-7 border-b border-app-border pb-5"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">{metadata.artist || "Sin artista"}</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">{metadata.title}</h2><p className="mt-2 text-xs font-semibold text-app-secondary">Tono {metadata.key} · {metadata.tempo} bpm · {metadata.timeSignature}</p></header><div className="chord-sheet text-[15px] leading-8" dangerouslySetInnerHTML={{ __html: previewHtml }} /></article>}
            </div>
          </section>

          <aside className={cx("min-h-0 min-w-0 flex-col lg:flex", mobileTab !== "inspector" ? "hidden lg:flex" : "flex")}>
            <div className="flex h-12 items-center gap-2 border-b border-app-border px-4 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><PanelRight className="size-4 text-brand" /> Inspector</div>
            <div className="min-h-0 flex-1 overflow-auto">
              <InspectorSection title="Metadatos">
                <DirectiveField label="Título" value={metadata.title} onChange={(value) => updateDirective("title", value)} />
                <DirectiveField label="Artista" value={metadata.artist} onChange={(value) => updateDirective("artist", value)} />
                <div className="grid grid-cols-2 gap-2"><DirectiveField label="Tono" value={metadata.key} onChange={(value) => updateDirective("key", value)} /><DirectiveField label="Tempo" value={String(metadata.tempo)} onChange={(value) => updateDirective("tempo", value)} /></div>
                <div className="grid grid-cols-2 gap-2"><DirectiveField label="Compás" value={metadata.timeSignature} onChange={(value) => updateDirective("time", value)} /><DirectiveField label="Duración" value={duration} onChange={(value) => { setDuration(value); setDirty(true); }} /></div>
                <DirectiveField label="Etiquetas" value={tags} onChange={(value) => { setTags(value); setDirty(true); }} placeholder="Adoración, rápida" />
              </InspectorSection>
              <InspectorSection title={`Diagnósticos · ${diagnostics.length}`}>
                {diagnostics.length ? <div className="space-y-2">{diagnostics.map((diagnostic, index) => <button key={`${diagnostic.line}-${index}`} onClick={() => goToLine(diagnostic.line)} className={cx("w-full rounded-xl border p-3 text-left", diagnostic.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800")}><span className="text-[10px] font-extrabold uppercase tracking-wider">Línea {diagnostic.line} · {diagnostic.severity === "error" ? "Error" : "Aviso"}</span><p className="mt-1 text-xs leading-5">{diagnostic.message}</p></button>)}</div> : <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><div className="flex items-center gap-2 text-xs font-bold"><Check className="size-4" /> Documento válido</div><p className="mt-1 text-[11px] leading-5">La sintaxis ChordPro no presenta problemas.</p></div>}
              </InspectorSection>
              <InspectorSection title="Ayuda rápida"><div className="space-y-2 font-mono text-[11px] text-app-secondary"><p><strong className="text-brand">[C]</strong> acorde antes de la sílaba</p><p><strong className="text-brand">&#123;comment: Intro&#125;</strong> etiqueta</p><p><strong className="text-brand">&#123;start_of_chorus&#125;</strong> inicia coro</p></div></InspectorSection>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-3 border-t border-app-border p-1 lg:hidden"><MobileTab active={mobileTab === "editor"} onClick={() => setMobileTab("editor")} icon={<FileText />} label="Editor" /><MobileTab active={mobileTab === "preview"} onClick={() => setMobileTab("preview")} icon={<Eye />} label="Preview" /><MobileTab active={mobileTab === "inspector"} onClick={() => setMobileTab("inspector")} icon={<Settings2 />} label="Inspector" /></div>
        </Card>
      </div>

      {deleteOpen ? <ConfirmDelete title={metadata.title} onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} /> : null}
    </div>
  );
}

function ToolbarMenu({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="relative"><button onClick={() => setOpen((value) => !value)} className="flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold text-app-secondary hover:bg-app-surface-muted hover:text-app-text"><span className="[&_svg]:size-4">{icon}</span>{label}<ChevronDown className="size-3" /></button>{open ? <><button className="fixed inset-0 z-20 cursor-default" aria-label={`Cerrar menú ${label}`} onClick={() => setOpen(false)} /><div className="absolute left-0 top-11 z-30 w-56 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-2xl" onClick={() => setOpen(false)}>{children}</div></> : null}</div>;
}

function MenuAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-app-text hover:bg-app-surface-muted"><span className="text-app-secondary [&_svg]:size-4">{icon}</span>{label}</button>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b border-app-border p-4"><h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-app-secondary">{title}</h3><div className="space-y-3">{children}</div></section>; }

function DirectiveField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-app-secondary">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-9 w-full rounded-lg border border-app-border bg-app-surface-muted px-2.5 text-xs outline-none focus:border-brand" /></label>; }

function MobileTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={cx("flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold", active ? "bg-brand-soft text-brand-ink" : "text-app-secondary")}><span className="[&_svg]:size-4">{icon}</span>{label}</button>; }

function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-6 shadow-2xl"><span className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="size-5" /></span><h2 id="delete-title" className="mt-5 font-display text-xl font-bold">¿Eliminar “{title}”?</h2><p className="mt-2 text-sm leading-6 text-app-secondary">La canción desaparecerá de la biblioteca y la eliminación quedará pendiente de sincronización. Esta acción no modifica otras canciones.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button variant="danger" onClick={onConfirm}><Trash2 className="size-4" /> Eliminar</Button></div></div></div>;
}

function EditorSkeleton() { return <Card className="flex min-h-[620px] items-center justify-center"><LoaderCircle className="size-7 animate-spin text-brand" /></Card>; }
function MissingSong() { return <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><CircleHelp className="size-10 text-app-secondary" /><h1 className="mt-4 font-display text-2xl font-bold">Canción no encontrada</h1><p className="mt-2 text-sm text-app-secondary">Puede haber sido eliminada o todavía no está disponible en este dispositivo.</p></Card>; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cancion"; }

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
