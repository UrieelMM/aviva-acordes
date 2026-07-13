import { create } from "zustand";

type UiState = {
  practiceMode: boolean;
  lastBellAt: string | null;
  togglePracticeMode: () => void;
  ringBell: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  practiceMode: true,
  lastBellAt: null,
  togglePracticeMode: () => set((state) => ({ practiceMode: !state.practiceMode })),
  ringBell: () => set({ lastBellAt: new Date().toISOString() }),
}));
