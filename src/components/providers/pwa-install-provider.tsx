"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";
import { Button, Modal } from "@/components/ui/primitives";
import { getInstallGuide, type InstallGuide } from "@/lib/pwa-install-guide";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = {
  installed: boolean;
  dismissed: boolean;
  available: boolean;
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
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
    temporaryInstalled || readFlag(INSTALLED_KEY);
}
function getDismissed() { return temporaryDismissed || readFlag(STORAGE_KEY); }

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const installed = useSyncExternalStore(subscribe, getInstalled, () => false);
  const dismissed = useSyncExternalStore(subscribe, getDismissed, () => true);
  const [guide, setGuide] = useState<InstallGuide | null>(null);

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
      setGuide(null);
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
      try {
        await event.prompt();
        await event.userChoice;
      } catch {
        setGuide(getInstallGuide(navigator.userAgent, navigator.maxTouchPoints));
      }
      setEvent(null);
      return;
    }
    setGuide(getInstallGuide(navigator.userAgent, navigator.maxTouchPoints));
  };

  const dismiss = () => {
    temporaryDismissed = true;
    writeFlag(STORAGE_KEY);
  };

  return (
    <InstallContext.Provider value={{ installed, dismissed, available: Boolean(event), install, dismiss }}>
      {children}
      {guide ? <Modal title={guide.title} icon={<Smartphone className="size-5" />} onClose={() => setGuide(null)} footer={<Button onClick={() => setGuide(null)}>Entendido</Button>}>
        <ol className="space-y-3">{guide.steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand-ink">{index + 1}</span><span>{step}</span></li>)}</ol>
        <p className="mt-4 text-xs leading-5 text-app-secondary">Antes de usarla sin internet, abre WorshipNotes desde el icono con conexión, inicia sesión y pulsa «Actualizar» para guardar la biblioteca en este dispositivo.</p>
        {guide.note ? <p className="mt-4 text-xs leading-5 text-app-secondary">{guide.note}</p> : null}
      </Modal> : null}
    </InstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("usePwaInstall requiere PwaInstallProvider.");
  return context;
}
