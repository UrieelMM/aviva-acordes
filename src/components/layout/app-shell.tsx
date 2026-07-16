"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Command,
  Home,
  ListMusic,
  Menu,
  Music2,
  Palette,
  Plus,
  Search,
  Settings,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cx } from "@/components/ui/primitives";
import { themeOptions } from "@/lib/themes";
import { useUiStore } from "@/stores/ui-store";
import type { ThemeName } from "@/types/domain";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/songs", label: "Canciones", icon: BookOpenText },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedTheme = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];

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
              <div className="flex items-center gap-2 text-xs font-bold text-app-text"><Cloud className="size-4 text-app-success" /> Todo sincronizado</div>
              <p className="mt-1 text-xs text-app-secondary">Hace menos de un minuto</p>
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
      </aside>

      <div className={cx("transition-[padding] duration-200", collapsed ? "lg:pl-[5.25rem]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-app-border bg-app-bg/90 px-4 backdrop-blur-xl sm:px-6 lg:h-[4.5rem] lg:px-8">
          <button className="flex size-10 items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu className="size-5" /></button>
          <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-left text-sm text-app-secondary transition hover:border-brand/40 sm:max-w-md">
            <Search className="size-4 shrink-0" />
            <span className="truncate">Buscar canciones o setlists...</span>
            <span className="ml-auto hidden items-center gap-1 rounded-md border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[11px] font-bold sm:flex"><Command className="size-3" /> K</span>
          </button>
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
            <div className="hidden items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-bold text-app-secondary sm:flex"><Wifi className="size-3.5 text-app-success" /> Online</div>
            <Link href="/songs/new" className="hidden min-h-10 items-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover sm:flex"><Plus className="size-4" /> Nueva canción</Link>
            <button className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink" aria-label="Cuenta de usuario"><CircleUserRound className="size-5" /></button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl border border-app-border bg-app-surface/95 p-1.5 shadow-2xl shadow-slate-950/15 backdrop-blur-xl lg:hidden" aria-label="Navegación móvil">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cx("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold", active ? "bg-brand-soft text-brand-ink" : "text-app-secondary")}>
              <item.icon className="size-4.5" /> {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={cx("flex h-[4.5rem] items-center gap-3 border-b border-app-border px-5", compact && "justify-center px-0")}>
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand text-white shadow-lg shadow-[var(--app-glow)]">
        <Music2 className="size-5" />
        <span className="absolute bottom-0 left-0 h-1 w-full bg-white/25" />
      </span>
      {!compact ? <span><strong className="block font-display text-lg leading-none tracking-tight">Acorde</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-app-secondary">Worship workspace</span></span> : null}
    </Link>
  );
}
