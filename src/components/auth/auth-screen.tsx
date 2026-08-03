"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LibraryBig,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Music2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getFirebaseAuthErrorMessage,
  useFirebaseAuth,
} from "@/components/providers/firebase-auth-provider";
import { cx } from "@/components/ui/primitives";

type AuthMode = "login" | "register";

export function AuthScreen() {
  const auth = useFirebaseAuth();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState<"form" | "google" | "reset" | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) router.replace("/");
  }, [auth.loading, auth.user, router]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmation("");
  };

  const completeAccess = (title: string, description: string) => {
    toast.success(title, { description });
    router.replace("/");
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.configured || working) return;

    if (!email.trim() || !email.includes("@")) {
      toast.error("Revisa tu correo", { description: "Escribe una dirección de correo válida." });
      emailRef.current?.focus();
      return;
    }
    if (password.length < 8) {
      toast.error("Contraseña muy corta", { description: "Usa al menos 8 caracteres." });
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      toast.error("Escribe tu nombre", { description: "Así podrá reconocerte el resto del equipo." });
      return;
    }
    if (mode === "register" && password !== confirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setWorking("form");
    try {
      if (mode === "register") {
        await auth.signUp(name, email, password);
        completeAccess("Cuenta creada", "Ya puedes trabajar con la biblioteca compartida.");
      } else {
        await auth.signIn(email, password);
        completeAccess("Sesión iniciada", "Bienvenido de nuevo a Acorde.");
      }
    } catch (error) {
      toast.error(mode === "register" ? "No se pudo crear la cuenta" : "No se pudo iniciar sesión", {
        description: getFirebaseAuthErrorMessage(error),
      });
    } finally {
      setWorking(null);
    }
  };

  const handleGoogle = async () => {
    if (!auth.configured || working) return;
    setWorking("google");
    try {
      await auth.signInWithGoogle();
      completeAccess("Acceso con Google listo", "Tu sesión quedó conectada a la biblioteca del equipo.");
    } catch (error) {
      toast.error("No se pudo entrar con Google", { description: getFirebaseAuthErrorMessage(error) });
    } finally {
      setWorking(null);
    }
  };

  const handleReset = async () => {
    if (!auth.configured || working) return;
    if (!email.trim() || !email.includes("@")) {
      toast.error("Primero escribe tu correo", { description: "Lo usaremos para enviarte el enlace de recuperación." });
      emailRef.current?.focus();
      return;
    }
    setWorking("reset");
    try {
      await auth.resetPassword(email);
      toast.success("Correo de recuperación enviado", { description: "Revisa también la carpeta de spam." });
    } catch (error) {
      toast.error("No se pudo enviar el correo", { description: getFirebaseAuthErrorMessage(error) });
    } finally {
      setWorking(null);
    }
  };

  if (auth.loading || auth.user) return <AuthLoading />;

  return (
    <main className="auth-screen relative min-h-dvh overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(99,102,241,0.28),transparent_30rem),radial-gradient(circle_at_85%_90%,rgba(14,165,233,0.15),transparent_28rem)]" />
      <div className="relative mx-auto grid min-h-dvh max-w-[1600px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col xl:p-14" aria-label="Presentación de Acorde">
          <AuthBrand />
          <div className="my-auto max-w-2xl py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1.5 text-xs font-bold text-indigo-100">
              <Sparkles className="size-3.5" /> El repertorio de todos, en un solo lugar
            </span>
            <h1 className="mt-7 max-w-xl font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
              Cada canción lista para cuando el equipo la necesita.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
              Crea arreglos, organiza setlists y conserva el historial de cambios en una biblioteca compartida y disponible sin conexión.
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <Feature icon={<LibraryBig />} value="Una" label="biblioteca común" />
              <Feature icon={<UsersRound />} value="Todo" label="el equipo conectado" />
              <Feature icon={<ShieldCheck />} value="Siempre" label="guardado local" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex size-8 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-300/10 text-indigo-300"><Check className="size-4" /></span>
            Firebase Auth protege el acceso; Firestore mantiene la información compartida.
          </div>
        </section>

        <section className="relative flex min-h-dvh items-center justify-center bg-app-bg px-4 py-8 text-app-text sm:px-8 lg:bg-app-bg/96 lg:px-12">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,var(--app-glow),transparent_70%)] lg:hidden" />
          <div className="relative w-full max-w-[29rem]">
            <div className="mb-8 lg:hidden"><AuthBrand compact /></div>
            <div className="rounded-[1.75rem] border border-app-border bg-app-surface p-5 shadow-[0_32px_80px_-35px_rgba(15,23,42,0.38)] sm:p-8">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Espacio del equipo</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
                  {mode === "login" ? "Qué bueno verte" : "Crea tu acceso"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-app-secondary">
                  {mode === "login" ? "Entra para continuar donde lo dejaste." : "Tu cuenta accederá a la misma biblioteca compartida."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 rounded-xl bg-app-surface-muted p-1" aria-label="Tipo de acceso">
                <ModeButton active={mode === "login"} onClick={() => changeMode("login")}>Iniciar sesión</ModeButton>
                <ModeButton active={mode === "register"} onClick={() => changeMode("register")}>Registrarme</ModeButton>
              </div>

              {!auth.configured ? <ConfigNotice missingKeys={auth.missingKeys} /> : null}

              <button
                type="button"
                onClick={handleGoogle}
                disabled={!auth.configured || working !== null}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 text-sm font-bold shadow-sm transition hover:border-brand/40 hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-55"
              >
                {working === "google" ? <LoaderCircle className="size-5 animate-spin" /> : <GoogleIcon />}
                Continuar con Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-app-secondary">
                <span className="h-px flex-1 bg-app-border" /> o con tu correo <span className="h-px flex-1 bg-app-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" ? (
                  <AuthField icon={<UserRound />} label="Nombre" htmlFor="auth-name">
                    <input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Tu nombre" className={inputClass} disabled={working !== null} />
                  </AuthField>
                ) : null}
                <AuthField icon={<Mail />} label="Correo electrónico" htmlFor="auth-email">
                  <input ref={emailRef} id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="nombre@equipo.com" className={inputClass} disabled={working !== null} />
                </AuthField>
                <AuthField icon={<LockKeyhole />} label="Contraseña" htmlFor="auth-password" action={mode === "login" ? <button type="button" onClick={handleReset} disabled={working !== null} className="font-bold text-brand hover:underline disabled:opacity-50">¿La olvidaste?</button> : undefined}>
                  <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"} className={`${inputClass} pr-11`} disabled={working !== null} />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute bottom-0 right-0 flex size-12 items-center justify-center text-app-secondary hover:text-app-text" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </AuthField>
                {mode === "register" ? (
                  <AuthField icon={<ShieldCheck />} label="Confirmar contraseña" htmlFor="auth-confirmation">
                    <input id="auth-confirmation" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Repítela" className={inputClass} disabled={working !== null} />
                  </AuthField>
                ) : null}

                <button type="submit" disabled={!auth.configured || working !== null} className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-[var(--app-glow)] transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55">
                  {working === "form" ? <LoaderCircle className="size-5 animate-spin" /> : <>{mode === "login" ? "Entrar a Acorde" : "Crear mi cuenta"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
                </button>
              </form>
            </div>
            <p className="mt-5 px-4 text-center text-xs leading-5 text-app-secondary">
              Al continuar aceptas usar este espacio como biblioteca compartida de tu equipo. Nunca guardamos tu contraseña en la app.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass = "min-h-12 w-full rounded-xl border border-app-border bg-app-surface-muted pl-10 pr-3 text-sm font-medium text-app-text outline-none transition placeholder:text-app-secondary/70 focus:border-brand focus:bg-app-surface disabled:opacity-60";

function AuthBrand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><span className={cx("flex items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-xl shadow-indigo-950/30", compact ? "size-11" : "size-12")}><Music2 className="size-6" /></span><span><strong className={cx("block font-display font-bold leading-none", compact ? "text-xl text-app-text" : "text-2xl")}>Acorde</strong><span className={cx("mt-1 block text-[10px] font-bold uppercase tracking-[0.19em]", compact ? "text-app-secondary" : "text-slate-400")}>Worship workspace</span></span></div>;
}

function Feature({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur"><span className="text-indigo-300 [&>svg]:size-5">{icon}</span><strong className="mt-5 block text-lg">{value}</strong><span className="mt-0.5 block text-xs leading-5 text-slate-400">{label}</span></div>;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cx("min-h-10 rounded-lg px-3 text-xs font-bold transition", active ? "bg-app-surface text-app-text shadow-sm" : "text-app-secondary hover:text-app-text")} aria-pressed={active}>{children}</button>;
}

function AuthField({ icon, label, htmlFor, action, children }: { icon: React.ReactNode; label: string; htmlFor: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-bold"><label htmlFor={htmlFor}>{label}</label>{action}</span><span className="relative block"><span className="pointer-events-none absolute bottom-0 left-0 flex size-12 items-center justify-center text-app-secondary [&>svg]:size-4">{icon}</span>{children}</span></div>;
}

function ConfigNotice({ missingKeys }: { missingKeys: string[] }) {
  const names: Record<string, string> = { apiKey: "API_KEY", authDomain: "AUTH_DOMAIN", projectId: "PROJECT_ID", storageBucket: "STORAGE_BUCKET", messagingSenderId: "MESSAGING_SENDER_ID", appId: "APP_ID" };
  return <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs leading-5 text-app-text"><strong className="block text-amber-700 dark:text-amber-300">Firebase aún no está configurado</strong><span className="mt-1 block text-app-secondary">Completa <code className="font-mono font-bold">.env.local</code> y reinicia la app. Faltan: {missingKeys.map((key) => names[key] ?? key).join(", ")}.</span></div>;
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"/></svg>;
}

function AuthLoading() {
  return <main className="auth-screen flex min-h-dvh items-center justify-center bg-app-bg text-app-text"><div className="text-center" role="status"><LoaderCircle className="mx-auto size-7 animate-spin text-brand" /><p className="mt-3 text-sm font-bold">Preparando tu espacio…</p></div></main>;
}
