import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CloudOff, Database } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-10">
        <div className="flex items-center gap-3"><Image src="/icon.svg" alt="" width={44} height={44} className="size-11 rounded-2xl" /><div><p className="font-display text-xl font-bold">WorshipNotes</p><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Modo offline</p></div></div>
        <span className="mt-10 flex size-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300"><CloudOff className="size-6" /></span>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">No hay conexión, pero tu música sigue aquí.</h1>
        <p className="mt-4 leading-7 text-slate-400">Puedes consultar las canciones y setlists que ya están guardados en este dispositivo. Los cambios se sincronizarán al volver a estar online.</p>
        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-slate-950 p-4"><Database className="size-5 text-emerald-300" /><div><p className="text-sm font-bold">Datos locales disponibles</p><p className="mt-0.5 text-xs text-slate-500">Biblioteca y próximo setlist</p></div></div>
        <Link href="/songs" className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-bold hover:bg-indigo-400">Abrir biblioteca <ArrowRight className="size-4" /></Link>
      </section>
    </main>
  );
}
