"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = {
  installed: boolean;
  dismissed: boolean;
  available: boolean;
  instructions: string;
  install: () => Promise<void>;
  dismiss: () => void;
};

const STORAGE_KEY = "acorde-install-dismissed";
const INSTALLED_KEY = "acorde-installed";
const InstallContext = createContext<InstallState | null>(null);
const STATE_EVENT = "acorde-pwa-state";
let temporaryDismissed = false;
let temporaryInstalled = false;
function readFlag(key: string) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
function writeFlag(key: string) {
  try { localStorage.setItem(key, "1"); } catch { /* Guardar solo durante esta sesión. */ }
  window.dispatchEvent(new Event(STATE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STATE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(STATE_EVENT, callback); };
}
function getInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
    temporaryInstalled || readFlag(INSTALLED_KEY);
}
function getDismissed() { return temporaryDismissed || readFlag(STORAGE_KEY); }

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const installed = useSyncExternalStore(subscribe, getInstalled, () => false);
  const dismissed = useSyncExternalStore(subscribe, getDismissed, () => true);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    const beforeInstall = (nextEvent: Event) => {
      nextEvent.preventDefault();
      temporaryInstalled = false;
      try { localStorage.removeItem(INSTALLED_KEY); } catch { /* Sin almacenamiento local. */ }
      window.dispatchEvent(new Event(STATE_EVENT));
      setEvent(nextEvent as InstallEvent);
    };
    const onInstalled = () => {
      temporaryInstalled = true;
      writeFlag(INSTALLED_KEY);
      setEvent(null);
      setInstructions("");
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (event) {
      await event.prompt();
      const choice = await event.userChoice;
      setEvent(null);
      if (choice.outcome === "accepted") setInstructions("La instalación está en curso. Abre WorshipNotes desde la pantalla de inicio.");
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setInstructions(ios
      ? "En Safari toca Compartir y luego «Agregar a pantalla de inicio»."
      : "Abre el menú del navegador y selecciona «Instalar aplicación» o «Agregar a pantalla de inicio».");
  };

  const dismiss = () => {
    temporaryDismissed = true;
    writeFlag(STORAGE_KEY);
  };

  return <InstallContext.Provider value={{ installed, dismissed, available: Boolean(event), instructions, install, dismiss }}>{children}</InstallContext.Provider>;
}

export function usePwaInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("usePwaInstall requiere PwaInstallProvider.");
  return context;
}
