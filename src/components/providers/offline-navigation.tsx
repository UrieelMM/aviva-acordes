"use client";

import { useEffect } from "react";

export function isOfflineShell() {
  return typeof document !== "undefined" && document.documentElement.dataset.offlineShell === "true";
}

export function OfflineNavigation() {
  useEffect(() => {
    const followLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href);
      if (target.origin !== location.origin || target.pathname.startsWith("/api/")) return;
      if (target.pathname === location.pathname && target.search === location.search && target.hash) return;
      event.preventDefault();
      event.stopPropagation();
      location.assign(target.href);
    };
    document.addEventListener("click", followLink, true);
    return () => document.removeEventListener("click", followLink, true);
  }, []);
  return null;
}
