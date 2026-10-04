"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SongLibrary } from "@/components/songs/song-library";
import { SongViewer } from "@/components/songs/song-viewer";
import { SongEditor } from "@/components/songs/song-editor";
import { SetlistsPage } from "@/components/setlists/setlists-page";
import { SetlistBuilder } from "@/components/setlists/setlist-builder";
import { SettingsPage } from "@/components/settings/settings-page";
import { StageView } from "@/components/stage/stage-view";

export function OfflineApp() {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.dataset.offlineShell = "true";
    const update = () => {
      const requestedPath = new URLSearchParams(window.location.search).get("path") || window.location.pathname;
      setPath(new URL(requestedPath, window.location.origin).pathname);
    };
    update();
    window.addEventListener("popstate", update);
    return () => {
      delete document.documentElement.dataset.offlineShell;
      window.removeEventListener("popstate", update);
    };
  }, []);

  if (!path) return <main className="flex min-h-dvh items-center justify-center bg-app-bg text-app-text">Abriendo Acorde…</main>;
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "stage" && segments[1]) return <AuthGuard><StageView setlistId={segments[1]} /></AuthGuard>;

  let content: React.ReactNode;
  if (segments.length === 0 || path === "/offline-app") content = <DashboardPage />;
  else if (segments[0] === "songs" && segments.length === 1) content = <SongLibrary />;
  else if (segments[0] === "songs" && segments[1] === "new") content = <SongEditor />;
  else if (segments[0] === "songs" && segments[1] && segments[2] === "edit") content = <SongEditor songId={segments[1]} />;
  else if (segments[0] === "songs" && segments[1]) content = <SongViewer songId={segments[1]} />;
  else if (segments[0] === "setlists" && segments.length === 1) content = <SetlistsPage />;
  else if (segments[0] === "setlists" && segments[1] === "new") content = <SetlistBuilder />;
  else if (segments[0] === "setlists" && segments[1]) content = <SetlistBuilder setlistId={segments[1]} />;
  else if (segments[0] === "settings") content = <SettingsPage />;
  else content = <DashboardPage />;
  return <AuthGuard><AppShell pathnameOverride={path}>{content}</AppShell></AuthGuard>;
}
