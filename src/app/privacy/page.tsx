import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Política de privacidad | WorshipNotes" },
  description: "Política de privacidad y tratamiento de datos de WorshipNotes.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-10 text-app-text sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-xl shadow-black/5">
        <header className="border-b border-app-border bg-brand-soft/50 p-6 sm:p-10">
          <Link href="/" className="text-sm font-extrabold text-brand hover:underline">WorshipNotes</Link>
          <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl">Política de privacidad</h1>
          <p className="mt-3 text-sm text-app-secondary">Última actualización: 29 de octubre de 2026</p>
        </header>

        <div className="space-y-8 p-6 text-sm leading-7 text-app-secondary sm:p-10">
          <PolicySection title="1. Responsable y alcance">
            <p>WorshipNotes es una herramienta privada para administrar canciones y setlists de equipos musicales. El administrador del espacio de trabajo es responsable de los datos que registra y de autorizar a las personas que pueden acceder.</p>
          </PolicySection>

          <PolicySection title="2. Datos que tratamos">
            <p>Podemos tratar nombre, correo de acceso, identificador de usuario, número de WhatsApp, constancia de consentimiento para recibir avisos, canciones, setlists y datos técnicos de sincronización. Para los mensajes guardamos además el identificador, fecha, destinatario y estado de envío, entrega, lectura o error.</p>
          </PolicySection>

          <PolicySection title="3. Finalidades">
            <p>Usamos la información para autenticar usuarios, sincronizar el contenido compartido, operar la aplicación, enviar avisos de creación o actualización de setlists, mostrar el historial de entrega, prevenir duplicados y resolver errores.</p>
          </PolicySection>

          <PolicySection title="4. WhatsApp y consentimiento">
            <p>Los avisos se envían individualmente mediante WhatsApp Business Platform usando plantillas aprobadas por Meta. Un número sólo se incluye cuando el administrador registra que su titular autorizó recibir estos avisos. El consentimiento puede retirarse en cualquier momento desactivando los avisos o eliminando el número en Configuración.</p>
          </PolicySection>

          <PolicySection title="5. Proveedores y transferencias">
            <p>WorshipNotes utiliza Firebase de Google para autenticación, base de datos y automatizaciones, y Meta Platforms para entregar mensajes por WhatsApp. Estos proveedores pueden procesar información en otros países conforme a sus propias condiciones y medidas de seguridad. No vendemos los datos personales.</p>
          </PolicySection>

          <PolicySection title="6. Conservación y seguridad">
            <p>Los datos se conservan mientras el espacio de trabajo los necesite. Al eliminar un integrante se deja de usar su número para nuevos avisos; los registros históricos de entrega pueden conservarse por seguridad, auditoría y solución de incidencias. Aplicamos controles de acceso autenticado y evitamos exponer credenciales privadas en el navegador.</p>
          </PolicySection>

          <PolicySection title="7. Derechos y contacto">
            <p>Para solicitar acceso, corrección, eliminación u oposición al tratamiento, o para reportar un problema de privacidad, escribe a <a className="font-bold text-brand hover:underline" href="mailto:michi.code.yt@gmail.com">michi.code.yt@gmail.com</a>. La solicitud deberá permitir identificar la cuenta o el número involucrado.</p>
          </PolicySection>

          <PolicySection title="8. Cambios a esta política">
            <p>Podemos actualizar esta política cuando cambien las funciones o los proveedores de WorshipNotes. La fecha publicada al inicio indica la versión vigente.</p>
          </PolicySection>
        </div>
      </article>
    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-app-text">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
