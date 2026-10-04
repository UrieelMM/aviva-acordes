"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function PwaSplash() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone) {
      const hide = window.setTimeout(() => setPhase("gone"), 0);
      return () => window.clearTimeout(hide);
    }
    document.documentElement.dataset.pwaStandalone = "true";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reducedMotion ? 400 : 1550;
    const fade = window.setTimeout(() => setPhase("leaving"), hold);
    const finish = window.setTimeout(() => setPhase("gone"), hold + (reducedMotion ? 100 : 480));
    return () => { window.clearTimeout(fade); window.clearTimeout(finish); };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={`pwa-splash${phase === "leaving" ? " pwa-splash--leaving" : ""}`} role="status" aria-label="Abriendo WorshipNotes">
      <div className="pwa-splash__glow pwa-splash__glow--left" />
      <div className="pwa-splash__glow pwa-splash__glow--right" />
      <div className="pwa-splash__content">
        <div className="pwa-splash__orbit"><div className="pwa-splash__mark"><Image src="/icon.svg" alt="" width={117} height={117} /></div></div>
        <p className="pwa-splash__eyebrow">TU ESPACIO DE ALABANZA</p>
        <h1 className="pwa-splash__name">Worship<span>Notes</span></h1>
        <p className="pwa-splash__tagline">Cada canción, en su momento.</p>
        <div className="pwa-splash__progress" aria-hidden="true"><span /></div>
      </div>
      <p className="pwa-splash__footer">TU EQUIPO · TU MÚSICA · EN CUALQUIER LUGAR</p>
    </div>
  );
}
