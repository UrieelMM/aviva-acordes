"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ensureDemoSongs } from "@/lib/indexed-db";

export function DatabaseBootstrap() {
  useEffect(() => {
    ensureDemoSongs().catch(() => {
      toast.error("No se pudo preparar la biblioteca local", {
        description: "Recarga la aplicación para volver a intentarlo.",
      });
    });
  }, []);

  return null;
}
