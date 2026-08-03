"use client";

import {
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Guitar,
  Keyboard,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, cx } from "@/components/ui/primitives";

const tutorialSteps = [
  {
    eyebrow: "Paso 1 de 6",
    title: "Empieza por los datos básicos",
    description: "El inspector mantiene sincronizados el título, artista, tono, tempo y compás con las directivas ChordPro. Puedes editar desde el formulario o directamente en el texto.",
    icon: Sparkles,
    example: "{title: Tu canción}\n{artist: Tu equipo}\n{key: G}\n{tempo: 76}\n{time: 4/4}",
    tips: ["El título es obligatorio para guardar.", "Usa tonos como C, F#, Bb o Am.", "El tempo válido está entre 20 y 300 bpm."],
  },
  {
    eyebrow: "Paso 2 de 6",
    title: "Pon el acorde justo antes de la sílaba",
    description: "Escribe el acorde entre corchetes. Así conservará su posición al cambiar el tamaño, la notación o la tonalidad.",
    icon: Guitar,
    example: "[G]Grande es tu [D/F#]fidelidad\n[Em7]Nunca me [Cadd9]dejarás",
    tips: ["Se admiten menores, séptimas, extensiones y slash chords.", "Usa el botón Insertar → Acorde para no escribir los corchetes.", "Los acordes desconocidos se conservan sin romper la letra."],
  },
  {
    eyebrow: "Paso 3 de 6",
    title: "Ordena la canción por secciones",
    description: "Cada bloque se abre y se cierra. Las secciones permiten navegar el arreglo y asociar notas por instrumento más adelante.",
    icon: Braces,
    example: "{start_of_chorus: Coro}\n[C]Santo, [G]santo eres Tú\n{end_of_chorus}",
    tips: ["Inserta versos, coros, pre-coros, puentes e instrumentales desde la barra.", "No olvides la directiva de cierre.", "El inspector te lleva a la línea exacta si detecta un bloque incompleto."],
  },
  {
    eyebrow: "Paso 4 de 6",
    title: "Revisa mientras escribes",
    description: "La vista previa se actualiza al instante. Los errores bloquean el guardado; los avisos solo recomiendan una mejora.",
    icon: CheckCircle2,
    example: "Error → corrígelo antes de guardar\nAviso → puedes guardar y revisarlo después",
    tips: ["En teléfono, cambia entre Editor, Vista e Inspector abajo.", "Pulsa un diagnóstico para seleccionar su línea.", "Ajusta el zoom de la vista previa entre 70% y 140%."],
  },
  {
    eyebrow: "Paso 5 de 6",
    title: "Prueba opciones avanzadas sin riesgo",
    description: "Puedes escuchar visualmente otra tonalidad, elegir sostenidos o bemoles y cambiar entre C–D–E y Do–Re–Mi sin tocar el documento original.",
    icon: SlidersHorizontal,
    example: "+2 · Subiste 2 semitonos (1 tono)\nOriginal G → vista A",
    tips: ["Restablecer vuelve a 0 semitonos.", "Aplicar como original siempre pide confirmación.", "El editor conserva un borrador local y guarda automáticamente las ediciones existentes."],
  },
  {
    eyebrow: "Paso 6 de 6",
    title: "Convierte una cifra existente",
    description: "En Archivo → Convertir cifra a ChordPro puedes obtener metadatos, acordes y letra desde una URL autorizada. El importador alinea los acordes y crea las secciones.",
    icon: ClipboardPaste,
    example: "[Verso]\nC            G\nTexto que puedes administrar\n\n→ [C]Texto que [G]puedes administrar",
    tips: ["La cifra obtenida queda editable antes de importarla.", "Admite acordes americanos y latinos.", "Revisa la vista previa y confirma que tienes permiso antes de importar."],
  },
];

export function SongEditorTutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setStep((current) => Math.min(tutorialSteps.length - 1, current + 1));
      if (event.key === "ArrowLeft") setStep((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  const current = tutorialSteps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
      <button className="absolute inset-0 cursor-pointer" aria-label="Cerrar tutorial" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="relative max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/10 bg-app-surface shadow-2xl">
        <div className="relative overflow-hidden border-b border-app-border bg-[radial-gradient(circle_at_top_right,var(--app-primary-soft),transparent_45%)] p-6 sm:p-8">
          <button onClick={onClose} className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted" aria-label="Cerrar tutorial"><X className="size-5" /></button>
          <div className="flex items-start gap-4 pr-10">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-[var(--app-glow)]"><Icon className="size-6" /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">{current.eyebrow}</p>
              <h2 id="tutorial-title" className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{current.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-app-secondary sm:text-base">{current.description}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-app-secondary">Ejemplo</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 font-mono text-[13px] leading-7 text-slate-200"><code>{current.example}</code></pre>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-app-secondary">Qué conviene recordar</p>
            <ul className="space-y-3">
              {current.tips.map((tip) => <li key={tip} className="flex gap-2.5 text-sm leading-6 text-app-secondary"><CheckCircle2 className="mt-1 size-4 shrink-0 text-app-success" /><span>{tip}</span></li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-app-border bg-app-surface-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2" aria-label={`Paso ${step + 1} de ${tutorialSteps.length}`}>
            {tutorialSteps.map((item, index) => <button key={item.title} onClick={() => setStep(index)} className={cx("h-2 rounded-full transition-all", step === index ? "w-8 bg-brand" : "w-2 bg-app-border hover:bg-app-secondary")} aria-label={`Ir al paso ${index + 1}`} />)}
          </div>
          <div className="flex gap-2">
            {step > 0 ? <Button variant="secondary" onClick={() => setStep((currentStep) => currentStep - 1)}><ChevronLeft className="size-4" /> Anterior</Button> : null}
            {step < tutorialSteps.length - 1 ? <Button onClick={() => setStep((currentStep) => currentStep + 1)}>Siguiente <ChevronRight className="size-4" /></Button> : <Button onClick={onClose}>Empezar a editar <Sparkles className="size-4" /></Button>}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-app-border px-6 py-3 text-[11px] text-app-secondary sm:px-8"><Keyboard className="size-3.5" /> También puedes navegar con ← → y cerrar con Esc.</div>
      </section>
    </div>
  );
}
