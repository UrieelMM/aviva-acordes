export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16">
      <section className="glass-panel w-full rounded-[2rem] p-8 text-center shadow-[0_30px_80px_rgba(120,53,15,0.12)]">
        <p className="section-title text-sm font-semibold text-accent-strong">Modo sin conexión</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          La app sigue disponible aunque no haya internet.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Puedes continuar consultando canciones en caché y trabajar con datos guardados en IndexedDB.
        </p>
      </section>
    </main>
  );
}
