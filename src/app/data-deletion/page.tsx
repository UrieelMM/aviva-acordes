import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Eliminación de datos | WorshipNotes" },
  description: "Instrucciones para solicitar la eliminación de datos personales de WorshipNotes.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-10 text-app-text sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-xl shadow-black/5">
        <header className="border-b border-app-border bg-brand-soft/50 p-6 sm:p-10">
          <Link href="/" className="text-sm font-extrabold text-brand hover:underline">WorshipNotes</Link>
          <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl">Eliminación de datos</h1>
          <p className="mt-3 text-sm text-app-secondary">Instrucciones vigentes desde el 29 de octubre de 2026.</p>
        </header>

        <div className="space-y-7 p-6 text-sm leading-7 text-app-secondary sm:p-10">
          <p>Puedes solicitar la eliminación de los datos asociados a tu cuenta o número de WhatsApp escribiendo a <a className="font-bold text-brand hover:underline" href="mailto:michi.code.yt@gmail.com?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos%20de%20WorshipNotes">michi.code.yt@gmail.com</a>.</p>
          <section>
            <h2 className="font-display text-xl font-bold text-app-text">Información necesaria</h2>
            <p className="mt-2">Indica el nombre, correo o número de WhatsApp que permita identificar los datos, y especifica si deseas eliminar una parte concreta o toda la información asociada.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-app-text">Proceso</h2>
            <p className="mt-2">Confirmaremos la recepción, podremos solicitar información razonable para verificar la identidad y eliminaremos o anonimizaremos los datos que ya no debamos conservar. Los registros que deban mantenerse por seguridad, prevención de fraude o cumplimiento legal se conservarán sólo durante el plazo necesario.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-app-text">Desactivar avisos</h2>
            <p className="mt-2">Si únicamente deseas dejar de recibir mensajes de WhatsApp, solicita al administrador de tu equipo que desactive los avisos o elimine tu número en Configuración. Esto detiene los mensajes futuros sin necesidad de eliminar el resto del contenido compartido.</p>
          </section>
          <p><Link href="/privacy" className="font-bold text-brand hover:underline">Consulta también la Política de privacidad de WorshipNotes.</Link></p>
        </div>
      </article>
    </main>
  );
}
