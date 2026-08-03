"use client";

import { ClipboardPaste, Link2, LoaderCircle, ShieldCheck, Sparkles, WandSparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, cx } from "@/components/ui/primitives";
import { convertChordTextToChordPro } from "@/lib/chord-text-import";

type PublicSongMetadata = {
  title?: string;
  artist?: string;
  key?: string;
  chordText?: string;
  source?: string;
  url?: string;
  error?: string;
};

export function SongTextImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (source: string) => boolean | Promise<boolean>;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("72");
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [rawText, setRawText] = useState("");
  const [hasRights, setHasRights] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const result = useMemo(() => rawText.trim() ? convertChordTextToChordPro(rawText, {
    title: title || "Nueva canción",
    artist,
    key,
    tempo: Number(tempo),
    timeSignature,
    sourceUrl: url,
  }) : null, [artist, key, rawText, tempo, timeSignature, title, url]);

  const fetchMetadata = async () => {
    if (!url.trim()) {
      toast.error("Pega primero la URL de la canción");
      return;
    }
    setLoadingMetadata(true);
    try {
      const response = await fetch("/api/song-import/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json() as PublicSongMetadata;
      if (!response.ok) throw new Error(data.error || "No se pudieron leer los datos públicos.");
      setTitle(data.title || title);
      setArtist(data.artist || artist);
      setKey(data.key || key);
      setUrl(data.url || url);
      if (data.chordText?.trim()) setRawText(data.chordText);
      const songDescription = `${data.title || "Canción"}${data.artist ? ` · ${data.artist}` : ""}${data.key ? ` · tono ${data.key}` : ""}`;
      if (data.chordText?.trim()) {
        toast.success("Canción encontrada", { description: `${songDescription} · acordes y letra cargados` });
      } else {
        toast.warning("Solo se encontraron los metadatos", { description: `${songDescription}. Pega la cifra manualmente para continuar.` });
      }
      textRef.current?.focus();
    } catch (error) {
      toast.error("No se pudo analizar la URL", { description: error instanceof Error ? error.message : "Completa los datos manualmente." });
    } finally {
      setLoadingMetadata(false);
    }
  };

  const applyImport = async () => {
    if (!rawText.trim()) {
      toast.error("Pega la cifra antes de importar");
      textRef.current?.focus();
      return;
    }
    if (!hasRights) {
      toast.error("Confirma que puedes usar este contenido");
      return;
    }
    if (!result) return;
    if (!(await onImport(result.source))) return;
    toast.success("Cifra convertida a ChordPro", {
      description: `${result.mergedChordLines} líneas alineadas · ${result.detectedSections} secciones detectadas.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="song-import-title" className="mx-auto my-auto w-full max-w-5xl overflow-hidden rounded-[1.6rem] border border-app-border bg-app-surface shadow-2xl">
        <header className="flex items-start gap-4 border-b border-app-border bg-[linear-gradient(120deg,var(--app-surface),color-mix(in_srgb,var(--app-primary-soft)_55%,var(--app-surface)))] p-5 sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-[var(--app-glow)]"><WandSparkles className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand">Importador inteligente</p><h2 id="song-import-title" className="mt-1 font-display text-2xl font-bold">Convertir cifra a ChordPro</h2><p className="mt-1 text-xs leading-5 text-app-secondary">Obtén la cifra desde una URL y conviértela sin perder la posición de los acordes.</p></div>
          <button onClick={onClose} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted" aria-label="Cerrar importador"><X className="size-5" /></button>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5 p-5 sm:p-6">
            <section>
              <StepTitle number="1" title="URL de la canción" description="Obtiene título, artista, tono, acordes y letra para preparar la conversión." />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1"><span className="sr-only">URL de la canción</span><Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-secondary" /><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.cifraclub.com/artista/cancion/" className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface-muted pl-10 pr-3 text-xs outline-none focus:border-brand focus:bg-app-surface" /></label>
                <Button variant="secondary" onClick={() => void fetchMetadata()} disabled={loadingMetadata}>{loadingMetadata ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Obtener canción</Button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-app-secondary">Admite enlaces HTTPS de Cifra Club y LaCuerda. Si el sitio bloquea la lectura, completa los campos manualmente.</p>
            </section>

            <section>
              <StepTitle number="2" title="Datos de la canción" description="Puedes corregirlos antes de convertir." />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ImportField label="Título" value={title} onChange={setTitle} placeholder="Nombre de la canción" />
                <ImportField label="Artista" value={artist} onChange={setArtist} placeholder="Autor o intérprete" />
                <div className="grid grid-cols-3 gap-2 sm:col-span-2"><ImportField label="Tono" value={key} onChange={setKey} placeholder="C, Bm…" /><ImportField label="Tempo" value={tempo} onChange={setTempo} placeholder="72" inputMode="numeric" /><ImportField label="Compás" value={timeSignature} onChange={setTimeSignature} placeholder="4/4" /></div>
              </div>
            </section>

            <section>
              <StepTitle number="3" title="Revisa la cifra" description="Se completa desde la URL; también puedes editarla o pegar otra cifra autorizada." />
              <label className="mt-3 block"><span className="sr-only">Texto de la cifra</span><textarea ref={textRef} value={rawText} onChange={(event) => setRawText(event.target.value)} rows={13} spellCheck={false} placeholder={`[Verso]\nC             G\nEscribe aquí una línea autorizada\n\n[Coro]\nF             G\nY el conversor colocará los acordes`} className="w-full resize-y rounded-2xl border border-app-border bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand" /></label>
            </section>
          </div>

          <aside className="border-t border-app-border bg-app-surface-muted/55 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="sticky top-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-brand">Vista previa</p><h3 className="mt-1 font-display text-lg font-bold">Resultado ChordPro</h3></div>{result ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800">Listo</span> : null}</div>
              {result ? (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2"><Stat value={result.detectedSections} label="secciones" /><Stat value={result.mergedChordLines} label="alineadas" /><Stat value={result.standaloneChordLines} label="instrumentales" /></div>
                  <pre className="mt-3 max-h-[24rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-app-border bg-app-surface p-4 font-mono text-[11px] leading-5 text-app-text">{result.source}</pre>
                </>
              ) : <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface p-6 text-center"><ClipboardPaste className="size-8 text-app-secondary" /><p className="mt-3 text-sm font-bold">Obtén o pega una cifra para verla aquí</p><p className="mt-1 max-w-xs text-xs leading-5 text-app-secondary">La URL puede completar acordes y letra; la conversión a ChordPro ocurre en tu navegador.</p></div>}

              <label className={cx("mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition", hasRights ? "border-emerald-300 bg-emerald-50" : "border-app-border bg-app-surface")}><input type="checkbox" checked={hasRights} onChange={(event) => setHasRights(event.target.checked)} className="mt-0.5 size-4 accent-emerald-600" /><span className="text-[11px] leading-5 text-app-secondary"><strong className="block text-app-text">Tengo permiso para usar este contenido</strong>Confirmo que es propio, autorizado, de dominio público o que mi organización cuenta con la licencia necesaria.</span></label>

              <div className="mt-4 rounded-xl bg-brand-soft p-3 text-[11px] leading-5 text-brand-ink"><ShieldCheck className="mr-1 inline size-4 align-text-bottom" /> Acorde extrae la cifra únicamente para convertirla en el editor. Revisa el resultado antes de importarlo.</div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => void applyImport()} disabled={!rawText.trim() || !hasRights}><WandSparkles className="size-4" /> Importar al editor</Button></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-extrabold text-brand-ink">{number}</span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-[11px] leading-4 text-app-secondary">{description}</p></div></div>;
}

function ImportField({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: React.ComponentProps<"input">["inputMode"] }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-app-secondary">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="min-h-10 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 text-xs outline-none focus:border-brand focus:bg-app-surface" /></label>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-app-border bg-app-surface p-2.5 text-center"><strong className="block text-base text-brand">{value}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-app-secondary">{label}</span></div>;
}
