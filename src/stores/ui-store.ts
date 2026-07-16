import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InstrumentView, Notation, ThemeName } from "@/types/domain";

type UiState = {
  theme: ThemeName;
  notation: Notation;
  instrument: InstrumentView;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeName) => void;
  setNotation: (notation: Notation) => void;
  setInstrument: (instrument: InstrumentView) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "studio",
      notation: "latin",
      instrument: "general",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setNotation: (notation) => set({ notation }),
      setInstrument: (instrument) => set({ instrument }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "acorde-ui-preferences" },
  ),
);
