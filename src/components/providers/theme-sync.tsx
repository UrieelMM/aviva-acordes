"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

export function ThemeSync() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}

