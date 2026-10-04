"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudCheck,
  CloudOff,
  Command,
  Home,
  ListMusic,
  LoaderCircle,
  LogOut,
  Menu,
  Music2,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { InstallAlert } from "@/components/pwa/install-alert";
import { ManualSyncButton } from "@/components/sync/manual-sync-button";
import { useFirebaseSyncStatus } from "@/components/providers/firebase-sync-provider";
import { cx } from "@/components/ui/primitives";
import { listSetlists, listSongs, type SetlistRecord, type SongRecord } from "@/lib/indexed-db";
import { searchSongs } from "@/lib/song-search";
import { themeOptions } from "@/lib/themes";
import { useUiStore } from "@/stores/ui-store";
import type { ThemeName } from "@/types/domain";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/songs", label: "Canciones", icon: BookOpenText },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppShell({ children, pathnameOverride }: { children: ReactNode; pathnameOverride?: string }) {
  const routePathname = usePathname();
  const pathname = pathnameOverride ?? routePathname;
  const auth = useFirebaseAuth();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sync = useFirebaseSyncStatus();
  const songs = useLiveQuery(() => listSongs(), [], []) ?? [];
  const setlists = useLiveQuery(() => listSetlists(), [], []) ?? [];
  const selectedTheme = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];
  const accountName = auth.user?.displayName?.trim() || auth.user?.email?.split("@")[0] || "Usuario";
  const initials = getInitials(accountName);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openSearch = () => setSearchOpen(true);

  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [searchOpen]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await auth.logout();
      window.location.replace("/auth");
    } catch (error) {
      toast.error("No se pudo cerrar la sesión", { description: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    } finally {
      setLoggingOut(false);
      setAccountOpen(false);
    }
  };

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-app-border bg-app-surface transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[5.25rem]" : "w-64",
        )}
      >
        <Brand compact={collapsed} />
        <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="Navegación principal">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cx(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  active ? "bg-brand-soft text-brand-ink" : "text-app-secondary hover:bg-app-surface-muted hover:text-app-text",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-app-border p-3">
          {!collapsed ? (
            <div className="mb-3 rounded-xl bg-app-surface-muted p-3">
              <SyncSummary phase={sync.phase} pending={sync.pending} lastSyncedAt={sync.lastSyncedAt} />
            </div>
          ) : null}
          <button onClick={toggleSidebar} className="flex size-11 w-full items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted" aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}>
            {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <button className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-[min(84vw,20rem)] flex-col border-r border-app-border bg-app-surface transition-transform lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <Brand />
        <nav className="flex-1 space-y-2 px-4 py-5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cx("flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold", pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "bg-brand-soft text-brand-ink" : "text-app-secondary")}>
              <item.icon className="size-5" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-app-border p-4"><p className="mb-2 text-xs text-app-secondary">Descarga los últimos cambios del equipo para usarlos sin internet.</p><ManualSyncButton variant="drawer" /></div>
      </aside>

      <div className={cx("transition-[padding] duration-200", collapsed ? "lg:pl-[5.25rem]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-app-border bg-app-bg/90 px-4 backdrop-blur-xl sm:px-6 lg:h-[4.5rem] lg:px-8">
          <button className="flex size-10 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu className="size-5" /></button>
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <button type="button" onClick={openSearch} className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-left text-sm text-app-secondary transition hover:border-brand/40" aria-label="Buscar canciones o setlists">
              <Search className="size-4 shrink-0" />
              <span className="truncate">{searchQuery || "Buscar canciones o setlists..."}</span>
              <span className="ml-auto hidden items-center gap-1 rounded-md border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[11px] font-bold sm:flex"><Command className="size-3" /> K</span>
            </button>
            {searchOpen ? <GlobalSearch songs={songs} setlists={setlists} query={searchQuery} inputRef={searchInputRef} onQueryChange={setSearchQuery} onClose={closeSearch} /> : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label
              className="group relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-secondary shadow-sm transition hover:border-brand/40 hover:text-app-text md:h-10 md:w-auto md:justify-start md:gap-2 md:px-2.5"
              title={`Tema: ${selectedTheme.name}`}
            >
              <span
                className="flex size-6 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: selectedTheme.accent }}
              >
                <Palette className="size-3.5" />
              </span>
              <span className="hidden min-w-14 text-left text-xs font-bold md:block">{selectedTheme.shortName}</span>
              <ChevronDown className="hidden size-3.5 transition group-hover:text-brand md:block" />
              <select
                aria-label="Seleccionar tema de color"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeName)}
                className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
              >
                {themeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <ManualSyncButton />
            <div className="relative">
              <button
                className="flex h-10 items-center gap-2 rounded-full border border-brand/15 bg-brand-soft p-1 pr-1 text-brand-ink transition hover:border-brand/35 sm:pr-2.5"
                aria-label="Abrir menú de cuenta"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((current) => !current)}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">{initials}</span>
                <span className="hidden max-w-24 truncate text-xs font-bold sm:block">{accountName}</span>
                <ChevronDown className={cx("hidden size-3.5 transition sm:block", accountOpen && "rotate-180")} />
              </button>
              {accountOpen ? (
                <>
                  <button className="fixed inset-0 z-40 cursor-pointer" aria-label="Cerrar menú de cuenta" onClick={() => setAccountOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl shadow-slate-950/15">
                    <div className="border-b border-app-border p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">{initials}</span>
                        <div className="min-w-0"><strong className="block truncate text-sm">{accountName}</strong><span className="mt-0.5 block truncate text-xs text-app-secondary">{auth.user?.email ?? "Cuenta de Google"}</span></div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-app-surface-muted px-3 py-2 text-[11px] font-bold text-app-secondary"><ShieldCheck className="size-3.5 text-app-success" /> Sesión protegida con Firebase</div>
                    </div>
                    <div className="p-2">
                      <Link href="/settings" onClick={() => setAccountOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-app-secondary transition hover:bg-app-surface-muted hover:text-app-text"><UserRound className="size-4" /> Cuenta y ajustes</Link>
                      <button onClick={handleLogout} disabled={loggingOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-app-danger transition hover:bg-app-surface-muted disabled:opacity-60">{loggingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />} Cerrar sesión</button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="mobile-bottom-nav fixed inset-x-3 z-30 grid grid-cols-4 rounded-2xl border border-app-border bg-app-surface/95 p-1.5 shadow-2xl shadow-slate-950/15 backdrop-blur-xl lg:hidden" aria-label="Navegación móvil">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cx("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold", active ? "bg-brand-soft text-brand-ink" : "text-app-secondary")}>
              <item.icon className="size-4.5" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <InstallAlert />
    </div>
  );
}

function GlobalSearch({
  songs,
  setlists,
  query,
  inputRef,
  onQueryChange,
  onClose,
}: {
  songs: SongRecord[];
  setlists: SetlistRecord[];
  query: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onClose: () => void;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingSongs = searchSongs(songs, normalizedQuery).slice(0, 5);
  const matchingSetlists = setlists
    .filter((setlist) => matchesSearch(setlist.name, setlist.leader, setlist.venue, setlist.date, normalizedQuery))
    .slice(0, 5);
  const visibleSongs = normalizedQuery ? matchingSongs : searchSongs(songs.slice(0, 3), "");
  const visibleSetlists = normalizedQuery ? matchingSetlists : setlists.slice(0, 3);
  const hasResults = visibleSongs.length > 0 || visibleSetlists.length > 0;

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 cursor-pointer bg-transparent" aria-label="Cerrar buscador" onClick={onClose} />
      <div role="dialog" aria-label="Buscador global" className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl shadow-slate-950/20">
        <div className="border-b border-app-border p-3">
          <div className="flex items-center gap-2 rounded-xl bg-app-surface-muted px-3">
            <Search className="size-4 shrink-0 text-app-secondary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-app-secondary"
              placeholder="Busca título, artista, sección o letra..."
              aria-label="Buscar canciones y setlists"
              autoComplete="off"
            />
            <kbd className="hidden rounded-md border border-app-border bg-app-surface px-1.5 py-0.5 text-[10px] font-bold text-app-secondary sm:block">Esc</kbd>
          </div>
        </div>

        <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-2">
          {!normalizedQuery ? <p className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-secondary">Últimos elementos</p> : null}
          {visibleSongs.length ? (
            <SearchResultGroup title="Canciones" icon={<BookOpenText className="size-4" />}>
              {visibleSongs.map(({ song, context }) => (
                <Link key={song.id} href={`/songs/${encodeURIComponent(song.id)}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-app-surface-muted">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink"><Music2 className="size-4" /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{song.title}</strong><span className="mt-0.5 block truncate text-xs text-app-secondary">{song.artist} · {song.originalKey}</span>{context ? <span className="block truncate text-xs font-medium text-brand">{context}</span> : null}</span>
                  <span className="text-[10px] font-bold text-app-secondary">Canción</span>
                </Link>
              ))}
            </SearchResultGroup>
          ) : null}
          {visibleSetlists.length ? (
            <SearchResultGroup title="Setlists" icon={<ListMusic className="size-4" />}>
              {visibleSetlists.map((setlist) => (
                <Link key={setlist.id} href={`/setlists/${setlist.id}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-app-surface-muted">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink"><ListMusic className="size-4" /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{setlist.name}</strong><span className="mt-0.5 block truncate text-xs text-app-secondary">{setlist.venue || "Sin lugar"} · {setlist.items.length} canciones</span></span>
                  <span className="text-[10px] font-bold text-app-secondary">Setlist</span>
                </Link>
              ))}
            </SearchResultGroup>
          ) : null}
          {!hasResults ? <div className="px-3 py-8 text-center"><Search className="mx-auto size-6 text-app-secondary" /><p className="mt-3 text-sm font-bold">No encontramos coincidencias</p><p className="mt-1 text-xs text-app-secondary">Prueba con una palabra de la letra, sección, artista o título.</p></div> : null}
        </div>
        <div className="border-t border-app-border bg-app-surface-muted/50 px-3 py-2 text-[10px] font-semibold text-app-secondary">El índice se actualiza automáticamente al guardar cambios.</div>
      </div>
    </>
  );
}

function SearchResultGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="mb-2 last:mb-0" aria-label={title}><div className="flex items-center gap-2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-secondary"><span className="text-brand">{icon}</span>{title}</div>{children}</section>;
}

function matchesSearch(...values: string[]) {
  const query = values.at(-1) ?? "";
  if (!query) return true;
  return values.slice(0, -1).some((value) => value.toLocaleLowerCase().includes(query));
}

function SyncSummary({ phase, pending, lastSyncedAt }: { phase: ReturnType<typeof useFirebaseSyncStatus>["phase"]; pending: number; lastSyncedAt?: string }) {
  const content = phase === "disabled"
    ? { icon: <Cloud className="size-4 text-app-secondary" />, label: "Firebase sin configurar", detail: "Los datos están solo en este dispositivo" }
    : phase === "signed-out"
      ? { icon: <CloudOff className="size-4 text-app-secondary" />, label: "Sesión no iniciada", detail: "Inicia sesión para sincronizar" }
    : phase === "offline"
      ? { icon: <CloudOff className="size-4 text-app-warning" />, label: "Trabajo sin conexión", detail: `${pending} cambio${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"}` }
      : phase === "error"
        ? { icon: <CloudOff className="size-4 text-app-danger" />, label: "Error de sincronización", detail: "Tus cambios siguen guardados localmente" }
        : phase === "synced"
          ? { icon: <CloudCheck className="size-4 text-app-success" />, label: "Todo sincronizado", detail: lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : "Firebase conectado" }
          : { icon: <LoaderCircle className="size-4 animate-spin text-brand" />, label: "Sincronizando", detail: pending ? `${pending} cambios pendientes` : "Conectando con Firebase" };
  return <><div className="flex items-center gap-2 text-xs font-bold text-app-text">{content.icon}{content.label}</div><p className="mt-1 text-xs text-app-secondary">{content.detail}</p></>;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={cx("flex h-[4.5rem] items-center gap-3 border-b border-app-border px-5", compact && "justify-center px-0")}>
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand text-white shadow-lg shadow-[var(--app-glow)]">
        <Music2 className="size-5" />
        <span className="absolute bottom-0 left-0 h-1 w-full bg-white/25" />
      </span>
      {!compact ? <span><strong className="block font-display text-lg leading-none tracking-tight">WorshipNotes</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-app-secondary">Worship workspace</span></span> : null}
    </Link>
  );
}
