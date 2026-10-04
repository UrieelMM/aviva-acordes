"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronUp, Clock3, LoaderCircle, MapPin, Minus, Music2, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, PageHeader } from "@/components/ui/primitives";
import { isOfflineShell } from "@/components/providers/offline-navigation";
import { getSetlistRecord, listSongs, saveSetlist, type SetlistRecord } from "@/lib/indexed-db";
import { formatSignedSemitones, formatTransposeInterval, transposeKey } from "@/lib/music";
import type { SetlistItem } from "@/types/domain";

export function SetlistBuilder({ setlistId }: { setlistId?: string }) {
  const existing = useLiveQuery(() => setlistId ? getSetlistRecord(setlistId) : Promise.resolve(undefined), [setlistId], setlistId ? null : undefined);
  const songs = useLiveQuery(() => listSongs(), [], []);
  if (setlistId && existing === null) return <Card className="flex min-h-96 items-center justify-center"><LoaderCircle className="size-7 animate-spin text-brand" /></Card>;
  if (setlistId && !existing) return <Card className="flex min-h-96 flex-col items-center justify-center p-8 text-center"><Music2 className="size-10 text-app-secondary" /><h1 className="mt-4 font-display text-2xl font-bold">Setlist no encontrado</h1><p className="mt-2 text-sm text-app-secondary">Puede haber sido eliminado o todavía no se ha sincronizado.</p></Card>;
  return <SetlistForm key={existing?.updatedAt ?? "new"} existing={existing ?? undefined} songs={songs} />;
}

function SetlistForm({ existing, songs }: { existing?: SetlistRecord; songs: Awaited<ReturnType<typeof listSongs>> }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "Nuevo setlist");
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(existing?.time ?? "11:00");
  const [venue, setVenue] = useState(existing?.venue ?? "Auditorio principal");
  const [leader, setLeader] = useState(existing?.leader ?? "");
  const [status, setStatus] = useState<"draft" | "ready">(existing?.status ?? "draft");
  const [items, setItems] = useState<SetlistItem[]>(existing?.items ?? []);
  const [pickerOpen, setPickerOpen] = useState(!existing);
  const [saving, setSaving] = useState(false);
  const songMap = new Map(songs.map((song) => [song.id, song]));

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const updateItem = (id: string, patch: Partial<SetlistItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addSong = (songId: string) => {
    setItems((current) => [...current, { id: crypto.randomUUID(), songId, transposeSemitones: 0, capo: 0 }]);
    toast.success("Canción agregada al setlist");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Escribe un nombre para el setlist");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSetlist({ name: name.trim(), date, time, venue: venue.trim(), leader: leader.trim(), items, status }, existing?.id);
      toast.success(existing ? "Setlist actualizado" : "Setlist creado", { description: "Se guardó offline y se sincronizará con todo el equipo." });
      if (!existing) {
        const href = `/setlists/${saved.id}`;
        if (!navigator.onLine || isOfflineShell()) window.location.replace(href);
        else router.replace(href);
      }
    } catch {
      toast.error("No se pudo guardar el setlist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader backHref="/setlists" eyebrow={existing ? "Editar setlist" : "Nuevo setlist"} title={existing ? existing.name : "Planear servicio"} description="El tono, capo y notas se guardan para este evento sin modificar la canción base." action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void handleSave()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} {saving ? "Guardando" : "Guardar"}</Button>{existing ? <Link href={`/stage/${existing.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"><Sparkles className="size-4" /> Escenario</Link> : null}</div>} />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_0.7fr_1fr]">
          <Label icon={<Music2 />} text="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} /></Label>
          <Label icon={<CalendarDays />} text="Fecha"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Label>
          <Label icon={<Clock3 />} text="Hora"><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Label>
          <Label icon={<MapPin />} text="Lugar"><input value={venue} onChange={(event) => setVenue(event.target.value)} /></Label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><Label icon={<Music2 />} text="Líder"><input value={leader} onChange={(event) => setLeader(event.target.value)} placeholder="Nombre del líder" /></Label><label><span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-app-secondary">Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "ready")} className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 text-sm outline-none"><option value="draft">Borrador</option><option value="ready">Listo</option></select></label></div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Orden de canciones</h2><p className="mt-1 text-sm text-app-secondary">{items.length} canciones en este setlist</p></div><Button onClick={() => setPickerOpen((value) => !value)}><Plus className="size-4" /> Agregar</Button></div>
          {items.length ? items.map((item, index) => {
            const song = songMap.get(item.songId);
            if (!song) return <Card key={item.id} className="p-4 text-sm text-app-secondary">Canción no disponible <button onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} className="ml-2 font-bold text-app-danger">Quitar</button></Card>;
            const targetKey = transposeKey(song.originalKey, item.transposeSemitones, song.originalKey.includes("b"));
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative grid items-center gap-3 p-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] sm:p-4">
                  <div className="hidden flex-col sm:flex"><button onClick={() => moveItem(index, -1)} className="text-app-secondary hover:text-brand" aria-label="Subir canción"><ChevronUp className="size-4" /></button><button onClick={() => moveItem(index, 1)} className="text-app-secondary hover:text-brand" aria-label="Bajar canción"><ChevronDown className="size-4" /></button></div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-sm font-extrabold text-brand-ink">{index + 1}</span>
                  <div className="min-w-0"><h3 className="truncate font-bold">{song.title}</h3><p className="truncate text-xs text-app-secondary">{song.artist} · Original {song.originalKey} · Suena en {targetKey}</p><p className="mt-1 truncate text-[11px] font-semibold text-brand">{formatTransposeInterval(item.transposeSemitones)}</p></div>
                  <div className="col-span-3 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap">
                    <MiniStepper label="Semit." value={formatSignedSemitones(item.transposeSemitones)} minus={() => updateItem(item.id, { transposeSemitones: Math.max(-11, item.transposeSemitones - 1) })} plus={() => updateItem(item.id, { transposeSemitones: Math.min(11, item.transposeSemitones + 1) })} />
                    <MiniStepper label="Capo" value={String(item.capo)} minus={() => updateItem(item.id, { capo: Math.max(0, item.capo - 1) })} plus={() => updateItem(item.id, { capo: Math.min(11, item.capo + 1) })} />
                  </div>
                  <button onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-app-secondary hover:bg-red-50 hover:text-red-600 sm:static" aria-label="Quitar canción"><Trash2 className="size-4" /></button>
                </div>
                <div className="border-t border-app-border bg-app-surface-muted/50 px-4 py-3"><input value={item.note ?? ""} onChange={(event) => updateItem(item.id, { note: event.target.value })} className="w-full bg-transparent text-xs outline-none placeholder:text-app-secondary" placeholder="Nota para esta canción, por ejemplo: repetir coro final..." /></div>
              </Card>
            );
          }) : <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-8 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><Music2 className="size-5" /></span><h3 className="mt-4 font-display text-lg font-bold">El setlist está vacío</h3><p className="mt-2 text-sm text-app-secondary">Agrega canciones desde la biblioteca de la derecha.</p></Card>}
        </div>

        <aside className={pickerOpen ? "block" : "hidden xl:block"}>
          <Card className="sticky top-24 overflow-hidden">
            <div className="border-b border-app-border p-4"><h2 className="font-display text-lg font-bold">Biblioteca</h2><label className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-app-surface-muted px-3"><Search className="size-4 text-app-secondary" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar canción..." /></label></div>
            <div className="max-h-[620px] divide-y divide-app-border overflow-auto">{songs.map((song) => <div key={song.id} className="flex items-center gap-3 p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-brand"><Music2 className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{song.title}</p><p className="truncate text-xs text-app-secondary">{song.artist} · {song.originalKey}</p></div><button onClick={() => addSong(song.id)} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-app-border text-brand hover:bg-brand-soft" aria-label={`Agregar ${song.title}`}><Plus className="size-4" /></button></div>)}</div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Label({ icon, text, children }: { icon: React.ReactNode; text: string; children: React.ReactNode }) {
  return <label><span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-app-secondary"><span className="[&_svg]:size-3.5">{icon}</span>{text}</span><span className="flex min-h-11 rounded-xl border border-app-border bg-app-surface-muted px-3 [&_input]:w-full [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none">{children}</span></label>;
}

function MiniStepper({ label, value, minus, plus }: { label: string; value: string; minus: () => void; plus: () => void }) {
  return <div className="flex min-h-9 items-center rounded-lg border border-app-border bg-app-surface text-xs"><span className="px-2 font-semibold text-app-secondary">{label}</span><button onClick={minus} className="flex size-8 items-center justify-center border-l border-app-border text-app-secondary"><Minus className="size-3" /></button><strong className="min-w-7 text-center">{value}</strong><button onClick={plus} className="flex size-8 items-center justify-center text-app-secondary"><Plus className="size-3" /></button></div>;
}
