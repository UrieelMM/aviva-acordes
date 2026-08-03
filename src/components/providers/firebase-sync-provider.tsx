"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  getCloudSyncSnapshot,
  startFirebaseSync,
  stopFirebaseSync,
  subscribeCloudSync,
} from "@/lib/firebase/sync";

const serverSnapshot = { phase: isFirebaseConfigured ? "connecting" : "disabled", pending: 0 } as const;

export function FirebaseSyncProvider() {
  const { loading, user } = useFirebaseAuth();
  const sync = useFirebaseSyncStatus();
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      stopFirebaseSync();
      return;
    }
    void startFirebaseSync();
    return () => stopFirebaseSync();
  }, [loading, user]);

  useEffect(() => {
    if (sync.phase !== "error" || !sync.error || sync.error === lastError.current) return;
    lastError.current = sync.error;
    toast.error("Firebase no pudo sincronizar", {
      description: `${sync.error} Los cambios permanecen guardados en este dispositivo.`,
    });
  }, [sync.error, sync.phase]);

  return null;
}

export function useFirebaseSyncStatus() {
  return useSyncExternalStore(subscribeCloudSync, getCloudSyncSnapshot, () => serverSnapshot);
}
