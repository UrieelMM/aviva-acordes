"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureDemoSongs } from "@/lib/indexed-db";

export function DatabaseBootstrap() {
  useEffect(() => {
    if (isFirebaseConfigured) return;
    ensureDemoSongs().catch(() => {
      toast.error("No se pudo preparar la biblioteca local", {
        description: "Recarga la aplicación para volver a intentarlo.",
      });
    });
  }, []);

  return null;
}
